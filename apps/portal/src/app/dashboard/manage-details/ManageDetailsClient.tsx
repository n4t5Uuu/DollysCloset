"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  RefreshCcw,
  Megaphone,
  Phone,
  BookOpen,
  HelpCircle,
  Pencil,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dollys-closet/ui";
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";
import { useUnsavedChanges } from "@dollys-closet/core";
import {
  ANNOUNCEMENT_SLUG,
  ANNOUNCEMENT_TITLE,
  ABOUT_SLUG,
  ABOUT_SECTION_FIELD_CONFIG,
  CONTACT_FIELD_CONFIG,
  CONTACT_SLUG,
  AboutDetailsPayload,
  AboutFieldKey,
  ContactFieldKey,
  ContactDetailsPayload,
  defaultAnnouncementText,
  defaultAboutDetails,
  defaultContactDetails,
  parseAboutBody,
  parseContactBody,
  sanitizeAboutDetailInput,
  sanitizeAboutDetailsPayload,
  sanitizeAboutDetailText,
  sanitizeAnnouncementInput,
  sanitizeAnnouncementText,
  sanitizeContactDetailInput,
  sanitizeContactDetailsPayload,
  sanitizeContactDetailText,
  sanitizeMultilineInput,
  sanitizeMultilineText,
  sanitizeSingleLineInput,
  sanitizeSingleLineText,
  uiContentLimits,
  FAQRow,
  FAQCategory,
} from "@dollys-closet/core";
import { toast } from "sonner";

/**
 * ManageDetailsClient.tsx
 * 
 * Administrative client component for managing business-wide configuration strings 
 * (Announcement banner, Contact info, FAQ, About page content).
 * 
 * Key Logic:
 * 1. Independent persistence: Each field or item saves independently once its "Save" action is triggered.
 * 2. Complex Dirty Tracking: Keeps a "shadow" copy of saved values to determine if a field is modified.
 * 3. Navigation Guard Integration: Summarizes `isDirty` counts across all tabs to block accidental exits.
 */

type ManageDetailsClientProps = {
  role: "admin" | "employee";
};

const FAQ_CATEGORIES: FAQCategory[] = ["General", "Ordering", "Shipping", "Returns", "Products"];
const MAX_FAQ_ITEMS = 8;
const EMPTY_FAQ_FORM: { question: string; answer: string; category: FAQCategory } = {
  question: "",
  answer: "",
  category: "General",
};

export default function ManageDetailsClient({ role }: ManageDetailsClientProps) {
  const isAdmin = role === "admin";
  const inputClassName = "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]";
  const textareaClassName = "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]";
  const { setIsDirty, setUnsavedMessage } = useUnsavedChanges();

  const [activeSection, setActiveSection] = useState<"announcement" | "contact" | "about" | "faq">("announcement");
  const [announcementText, setAnnouncementText] = useState(defaultAnnouncementText);
  const [savedAnnouncementText, setSavedAnnouncementText] = useState(defaultAnnouncementText);
  const [details, setDetails] = useState<ContactDetailsPayload>(defaultContactDetails);
  const [savedDetails, setSavedDetails] = useState<ContactDetailsPayload>(defaultContactDetails);
  const [aboutDetails, setAboutDetails] = useState<AboutDetailsPayload>(defaultAboutDetails);
  const [savedAboutDetails, setSavedAboutDetails] = useState<AboutDetailsPayload>(defaultAboutDetails);

  // FAQ state
  const [faqs, setFaqs] = useState<FAQRow[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [hasLoadedFaqs, setHasLoadedFaqs] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQRow | null>(null);
  const [addingFaq, setAddingFaq] = useState(false);
  const [faqForm, setFaqForm] = useState<{ question: string; answer: string; category: FAQCategory }>(EMPTY_FAQ_FORM);
  const [savingFaq, setSavingFaq] = useState(false);
  const [deletingFaqId, setDeletingFaqId] = useState<number | null>(null);

  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);
  const [hasLoadedAnnouncement, setHasLoadedAnnouncement] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [loadingContact, setLoadingContact] = useState(true);
  const [loadingAbout, setLoadingAbout] = useState(false);
  const [hasLoadedAbout, setHasLoadedAbout] = useState(false);
  const [savingAboutField, setSavingAboutField] = useState<AboutFieldKey | null>(null);
  const [savingField, setSavingField] = useState<ContactFieldKey | null>(null);
  const [refreshingSection, setRefreshingSection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const formatSingleLineMeta = useCallback((value: string, maxLength: number) => {
    return `${value.length}/${maxLength} characters`;
  }, []);

  const formatLongFormMeta = useCallback((value: string, maxLength: number, recommendedLength?: string) => {
    return recommendedLength
      ? `${value.length}/${maxLength} characters. Recommended ${recommendedLength}.`
      : `${value.length}/${maxLength} characters.`;
  }, []);
  const sanitizeFaqQuestionInput = useCallback((value: string) => {
    return sanitizeSingleLineInput(value, uiContentLimits.faqQuestion.maxLength);
  }, []);
  const sanitizeFaqAnswerInput = useCallback((value: string) => {
    return sanitizeMultilineInput(value, uiContentLimits.faqAnswer.maxLength);
  }, []);
  const normalizeFaqQuestion = useCallback((value: string) => {
    return sanitizeSingleLineText(value, uiContentLimits.faqQuestion.maxLength);
  }, []);
  const normalizeFaqAnswer = useCallback((value: string) => {
    return sanitizeMultilineText(value, uiContentLimits.faqAnswer.maxLength);
  }, []);

  const faqBaseline = useMemo(() => {
    if (!editingFaq) {
      return EMPTY_FAQ_FORM;
    }

    return {
      question: normalizeFaqQuestion(editingFaq.question),
      answer: normalizeFaqAnswer(editingFaq.answer),
      category: editingFaq.category,
    };
  }, [editingFaq, normalizeFaqAnswer, normalizeFaqQuestion]);

  const faqNormalizedForm = useMemo(() => {
    return {
      question: normalizeFaqQuestion(faqForm.question),
      answer: normalizeFaqAnswer(faqForm.answer),
      category: faqForm.category,
    };
  }, [faqForm, normalizeFaqAnswer, normalizeFaqQuestion]);

  const faqHasRequiredValues = faqNormalizedForm.question.length > 0 && faqNormalizedForm.answer.length > 0;
  const faqFormDirty = editingFaq
    ? faqNormalizedForm.question !== faqBaseline.question
      || faqNormalizedForm.answer !== faqBaseline.answer
      || faqNormalizedForm.category !== faqBaseline.category
    : faqForm.question.length > 0 || faqForm.answer.length > 0 || faqForm.category !== EMPTY_FAQ_FORM.category;
  const hasReachedFaqLimit = faqs.length >= MAX_FAQ_ITEMS;

  const fetchContactDetails = useCallback(async () => {
    try {
      setLoadingContact(true);
      setError(null);
      const response = await fetch(`/api/admin/business-details?slug=${CONTACT_SLUG}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch contact details");
      const parsedDetails = sanitizeContactDetailsPayload(parseContactBody(result.data?.body));
      setDetails(parsedDetails);
      setSavedDetails(parsedDetails);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch contact details");
      return false;
    } finally {
      setLoadingContact(false);
    }
  }, []);

  const fetchAnnouncementDetails = useCallback(async () => {
    try {
      setLoadingAnnouncement(true);
      setError(null);
      const response = await fetch(`/api/admin/business-details?slug=${ANNOUNCEMENT_SLUG}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch announcement");
      const nextAnnouncement = sanitizeAnnouncementText((result.data?.body || defaultAnnouncementText) as string);
      setAnnouncementText(nextAnnouncement);
      setSavedAnnouncementText(nextAnnouncement);
      setHasLoadedAnnouncement(true);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch announcement");
      return false;
    } finally {
      setLoadingAnnouncement(false);
    }
  }, []);

  const fetchAboutDetails = useCallback(async () => {
    try {
      setLoadingAbout(true);
      setError(null);
      const response = await fetch(`/api/admin/business-details?slug=${ABOUT_SLUG}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch about details");
      const parsedAboutDetails = sanitizeAboutDetailsPayload(parseAboutBody(result.data?.body));
      setAboutDetails(parsedAboutDetails);
      setSavedAboutDetails(parsedAboutDetails);
      setHasLoadedAbout(true);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch about details");
      return false;
    } finally {
      setLoadingAbout(false);
    }
  }, []);

  const fetchFAQs = useCallback(async () => {
    try {
      setLoadingFaqs(true);
      setError(null);
      const response = await fetch("/api/admin/faqs", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch FAQs");
      setFaqs(result.data as FAQRow[]);
      setHasLoadedFaqs(true);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch FAQs");
      return false;
    } finally {
      setLoadingFaqs(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchContactDetails();
    }
  }, [isAdmin, fetchContactDetails]);

  useEffect(() => {
    if (activeSection === "announcement" && !hasLoadedAnnouncement) {
      fetchAnnouncementDetails();
    }
  }, [activeSection, hasLoadedAnnouncement, fetchAnnouncementDetails]);

  useEffect(() => {
    if (isAdmin && activeSection === "about" && !hasLoadedAbout) {
      fetchAboutDetails();
    }
  }, [isAdmin, activeSection, hasLoadedAbout, fetchAboutDetails]);

  useEffect(() => {
    if (isAdmin && activeSection === "faq" && !hasLoadedFaqs) {
      fetchFAQs();
    }
  }, [isAdmin, activeSection, hasLoadedFaqs, fetchFAQs]);

  const announcementDirty = announcementText !== savedAnnouncementText;
  const contactDirtyCount = useMemo(
    () =>
      CONTACT_FIELD_CONFIG.reduce((count, field) => {
        return count + (details[field.key] !== savedDetails[field.key] ? 1 : 0);
      }, 0),
    [details, savedDetails]
  );
  const aboutDirtyCount = useMemo(() => {
    let dirtyCount = ABOUT_SECTION_FIELD_CONFIG.reduce((count, field) => {
      return count + (aboutDetails[field.key] !== savedAboutDetails[field.key] ? 1 : 0);
    }, 0);

    for (let number = 1; number <= 8; number += 1) {
      const questionKey = `question${number}` as AboutFieldKey;
      const answerKey = `answer${number}` as AboutFieldKey;
      if (aboutDetails[questionKey] !== savedAboutDetails[questionKey]) dirtyCount += 1;
      if (aboutDetails[answerKey] !== savedAboutDetails[answerKey]) dirtyCount += 1;
    }

    return dirtyCount;
  }, [aboutDetails, savedAboutDetails]);

  // Sync with global navigation guard
  useEffect(() => {
    const isActuallyDirty = announcementDirty || contactDirtyCount > 0 || aboutDirtyCount > 0;
    setIsDirty(isActuallyDirty);
    setUnsavedMessage(isActuallyDirty ? "You have unsaved business details. If you leave now, your changes will be lost." : undefined);

    return () => {
      setIsDirty(false);
      setUnsavedMessage(undefined);
    };
  }, [announcementDirty, contactDirtyCount, aboutDirtyCount, setIsDirty, setUnsavedMessage]);

  const currentSectionUnsavedCount =
    activeSection === "announcement"
      ? announcementDirty ? 1 : 0
      : activeSection === "contact"
        ? contactDirtyCount
        : activeSection === "faq"
          ? 0
          : aboutDirtyCount;

  const sectionMeta =
    activeSection === "announcement"
      ? {
          title: "Announcement Banner",
          description: "Update the short message shown to every visitor above the collections page.",
          guidance: "Keep this short, timely, and easy to scan on mobile.",
        }
      : activeSection === "contact"
        ? {
            title: "Contact Details",
            description: "Update the business contact information customers use to get in touch.",
            guidance: "Each field saves independently, so you can publish one correction at a time.",
          }
        : activeSection === "faq"
          ? {
              title: "FAQ Management",
              description: "Add, edit, or remove FAQ items shown on the About page.",
              guidance: "FAQs are sorted by how often customers click them — most clicked appears first.",
            }
          : {
              title: "About Details",
              description: "Edit About page copy and FAQ content shown on the customer site.",
              guidance: "Page 1 edits section bodies. Pages 2-3 edit FAQ items 1-8.",
            };

  const sectionOptions = [
    {
      key: "announcement" as const,
      label: "Announcement",
      description: "Top banner shown to all visitors.",
      icon: Megaphone,
      unsavedCount: announcementDirty ? 1 : 0,
    },
    ...(isAdmin
      ? [
          {
            key: "contact" as const,
            label: "Contact",
            description: "Phone, email, address, and public contact text.",
            icon: Phone,
            unsavedCount: contactDirtyCount,
          },
          {
            key: "about" as const,
            label: "About",
            description: "About page sections and FAQ content.",
            icon: BookOpen,
            unsavedCount: aboutDirtyCount,
          },
          {
            key: "faq" as const,
            label: "FAQ",
            description: "Manage FAQ items shown on the About page.",
            icon: HelpCircle,
            unsavedCount: 0,
          },
        ]
      : []),
  ];

  const handleSetActiveSection = (section: "announcement" | "contact" | "about" | "faq") => {
    setActiveSection(section);
    if (section !== "faq") { setAddingFaq(false); setEditingFaq(null); }
    setSuccess(null);
    setError(null);
  };

  async function handleSaveFaq() {
    if (!faqHasRequiredValues) return;

    const payload = {
      question: faqNormalizedForm.question,
      answer: faqNormalizedForm.answer,
      category: faqNormalizedForm.category,
    };

    try {
      setSavingFaq(true);
      setError(null);
      if (editingFaq) {
        const response = await fetch(`/api/admin/faqs/${editingFaq.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to update FAQ");
        setFaqs((prev) => prev.map((f) => f.id === editingFaq.id ? result.data as FAQRow : f));
        toast.success("FAQ updated.");
        setEditingFaq(null);
      } else {
        const response = await fetch("/api/admin/faqs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to create FAQ");
        setFaqs((prev) => [...prev, result.data as FAQRow]);
        toast.success("FAQ created.");
        setAddingFaq(false);
      }
      setFaqForm(EMPTY_FAQ_FORM);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save FAQ";
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingFaq(false);
    }
  }

  async function handleDeleteFaq(id: number) {
    try {
      setDeletingFaqId(id);
      setError(null);
      const response = await fetch(`/api/admin/faqs/${id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete FAQ");
      setFaqs((prev) => prev.filter((f) => f.id !== id));
      toast.success("FAQ deleted.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete FAQ";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingFaqId(null);
    }
  }

  function startEditFaq(faq: FAQRow) {
    setEditingFaq(faq);
    setFaqForm({
      question: sanitizeFaqQuestionInput(faq.question),
      answer: sanitizeFaqAnswerInput(faq.answer),
      category: faq.category,
    });
    setAddingFaq(false);
  }

  function startAddFaq() {
    if (hasReachedFaqLimit) {
      const message = `You can only have up to ${MAX_FAQ_ITEMS} FAQs.`;
      setError(message);
      toast.error(message);
      return;
    }

    setAddingFaq(true);
    setEditingFaq(null);
    setFaqForm(EMPTY_FAQ_FORM);
  }

  function cancelFaqForm() {
    setAddingFaq(false);
    setEditingFaq(null);
    setFaqForm(EMPTY_FAQ_FORM);
  }

  const handleRefreshCurrentSection = async () => {
    setRefreshingSection(true);
    setError(null);
    setSuccess(null);

    try {
      const refreshed =
        activeSection === "announcement"
          ? await fetchAnnouncementDetails()
          : activeSection === "contact"
            ? await fetchContactDetails()
            : activeSection === "about"
              ? await fetchAboutDetails()
              : await fetchFAQs();

      if (refreshed) {
        setError(null);
      }
    } finally {
      setRefreshingSection(false);
    }
  };

  async function handleSaveContactField(fieldKey: ContactFieldKey, label: string) {
    try {
      setSavingField(fieldKey);
      setError(null);
      setSuccess(null);
      const sanitizedValue = sanitizeContactDetailText(fieldKey, details[fieldKey]);
      const response = await fetch("/api/admin/business-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: CONTACT_SLUG,
          title: label,
          body: sanitizedValue,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save contact details");
      setDetails((prev) => ({
        ...prev,
        [fieldKey]: sanitizedValue,
      }));
      setSavedDetails((prev) => ({
        ...prev,
        [fieldKey]: sanitizedValue,
      }));
      setSuccess(`${label} saved and published.`);
      toast.success(`${label} saved.`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save contact details";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingField(null);
    }
  }

  async function handleSaveAboutField(fieldKey: AboutFieldKey, label: string) {
    try {
      setSavingAboutField(fieldKey);
      setError(null);
      setSuccess(null);
      const sanitizedValue = sanitizeAboutDetailText(fieldKey, aboutDetails[fieldKey]);
      const response = await fetch("/api/admin/business-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: ABOUT_SLUG,
          title: label,
          body: sanitizedValue,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save about details");
      setAboutDetails((prev) => ({
        ...prev,
        [fieldKey]: sanitizedValue,
      }));
      setSavedAboutDetails((prev) => ({
        ...prev,
        [fieldKey]: sanitizedValue,
      }));
      setSuccess(`${label} saved and published.`);
      toast.success(`${label} saved.`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save about details";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingAboutField(null);
    }
  }

  async function handleSaveAnnouncement() {
    try {
      setSavingAnnouncement(true);
      setError(null);
      setSuccess(null);
      const sanitizedAnnouncement = sanitizeAnnouncementText(announcementText);
      const response = await fetch("/api/admin/business-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: ANNOUNCEMENT_SLUG,
          title: ANNOUNCEMENT_TITLE,
          body: sanitizedAnnouncement,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save announcement");
      setAnnouncementText(sanitizedAnnouncement);
      setSavedAnnouncementText(sanitizedAnnouncement);
      setSuccess("Announcement saved and published.");
      toast.success("Announcement saved.");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save announcement";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSavingAnnouncement(false);
    }
  }

  function updateDetails(key: ContactFieldKey, value: string) {
    setDetails((prev: ContactDetailsPayload) => ({ ...prev, [key]: sanitizeContactDetailInput(key, value) }));
  }

  function updateAboutDetails(key: AboutFieldKey, value: string) {
    setAboutDetails((prev: AboutDetailsPayload) => ({ ...prev, [key]: sanitizeAboutDetailInput(key, value) }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manage Details</h1>
          <p className="text-gray-500 text-sm">
            {isAdmin
              ? "Maintain the customer-facing announcement, contact information, and About page content."
              : "Update the customer-facing announcement banner."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleRefreshCurrentSection}
          disabled={refreshingSection || savingAnnouncement || savingField !== null || savingAboutField !== null}
          className="h-10 border-[#E7A3B0]/30 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${refreshingSection ? "animate-spin" : ""}`} />
          Refresh Section
        </Button>
      </div>

      <Card className="border border-[#E7A3B0]/20 bg-[#fff9fb] shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#8a6b73]">{sectionMeta.title}</p>
            <p className="text-sm text-[#8a6b73]">{sectionMeta.description}</p>
            <p className="text-xs text-[#9a7a83]">{sectionMeta.guidance}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#b96d7d] shadow-sm">
              {currentSectionUnsavedCount === 0
                ? "All changes saved"
                : `${currentSectionUnsavedCount} unsaved ${currentSectionUnsavedCount === 1 ? "change" : "changes"}`}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
              Saves happen per field
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sectionOptions.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.key;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => handleSetActiveSection(section.key)}
              className={`rounded-2xl border p-4 text-left transition ${
                isActive
                  ? "border-[#E7A3B0] bg-[#fff5f7] shadow-sm"
                  : "border-gray-200 bg-white hover:border-[#E7A3B0]/50 hover:bg-[#fffafb]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`rounded-xl p-2 ${isActive ? "bg-white text-[#b96d7d]" : "bg-gray-50 text-gray-500"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">{section.label}</p>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </div>
                {section.unsavedCount > 0 && (
                  <span className="rounded-full bg-[#E7A3B0] px-2 py-1 text-[10px] font-semibold text-white">
                    {section.unsavedCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {error && (
        <AdminNoticeBanner
          tone="error"
          title={`Unable to load ${sectionMeta.title.toLowerCase()}`}
          message={error}
          onDismiss={() => setError(null)}
          actionLabel="Try again"
          onAction={() => {
            void handleRefreshCurrentSection();
          }}
          className="mb-6"
        />
      )}

      {success && (
        <AdminNoticeBanner
          tone="success"
          title={`${sectionMeta.title} updated`}
          message={success}
          onDismiss={() => setSuccess(null)}
          className="mb-6"
        />
      )}

      {activeSection === "contact" && (
        <Card className="border border-[#E7A3B0]/30 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold text-gray-900">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingContact ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-600">
                  Each field saves independently. Review one contact detail at a time and only publish fields with ready-to-go changes.
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {CONTACT_FIELD_CONFIG.map((field) => {
                    const isDirty = details[field.key] !== savedDetails[field.key];
                    const isSaving = savingField === field.key;

                    return (
                      <div
                        key={field.key}
                        className={`${field.type === "textarea" ? "md:col-span-2" : ""} rounded-xl border p-4 ${
                          isDirty ? "border-[#E7A3B0]/40 bg-[#fffafb]" : "border-gray-200 bg-gray-50/50"
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{field.label}</p>
                            <p className="text-xs text-gray-500">
                              {field.type === "textarea"
                                ? "Long-form public content. Save after checking wording and line breaks."
                                : "Single-line public value. Save when this field is ready to publish."}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              isDirty ? "bg-[#E7A3B0] text-white" : "border border-gray-200 bg-white text-gray-500"
                            }`}
                          >
                            {isDirty ? "Unsaved" : "Saved"}
                          </span>
                        </div>

                        {field.type === "textarea" ? (
                          <div className="space-y-3">
                            <Textarea
                              value={details[field.key]}
                              onChange={(e) => updateDetails(field.key, e.target.value)}
                              maxLength={field.maxLength}
                              className={`${field.minHeightClassName || "min-h-[90px]"} ${textareaClassName}`}
                            />
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                              <p className="text-xs text-gray-500">
                                {isDirty ? "This field has unsaved edits." : "No pending changes."} {formatLongFormMeta(details[field.key], field.maxLength, field.recommendedLength)}
                              </p>
                              <Button
                                type="button"
                                onClick={() => handleSaveContactField(field.key, field.label)}
                                disabled={savingField !== null || !isDirty}
                                className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]"
                              >
                                {isSaving ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving
                                  </span>
                                ) : isDirty ? (
                                  "Save field"
                                ) : (
                                  "Saved"
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 md:flex-row md:items-start">
                            <div className="flex-1 space-y-2">
                              <Input
                                value={details[field.key]}
                                onChange={(e) => updateDetails(field.key, e.target.value)}
                                maxLength={field.maxLength}
                                className={inputClassName}
                              />
                              <div className="text-xs text-gray-500">
                                {formatSingleLineMeta(details[field.key], field.maxLength)}
                              </div>
                            </div>
                            <Button
                              type="button"
                              onClick={() => handleSaveContactField(field.key, field.label)}
                              disabled={savingField !== null || !isDirty}
                              className="bg-[#cc7f8f] text-white hover:bg-[#b96f80] md:min-w-28"
                            >
                              {isSaving ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Saving
                                </span>
                              ) : isDirty ? (
                                "Save field"
                              ) : (
                                "Saved"
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "announcement" && (
        <Card className="border border-[#E7A3B0]/30 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold text-gray-900">Announcement Banner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingAnnouncement ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-[120px] w-full rounded-md" />
                <div className="flex justify-end"><Skeleton className="h-10 w-24 rounded-md" /></div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Banner Text</p>
                    <p className="text-xs text-gray-500">
                      This appears in the scrolling banner above the customer collections page.
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      announcementDirty ? "bg-[#E7A3B0] text-white" : "border border-gray-200 bg-white text-gray-500"
                    }`}
                  >
                    {announcementDirty ? "Unsaved" : "Saved"}
                  </span>
                </div>
                <Textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(sanitizeAnnouncementInput(e.target.value))}
                  maxLength={uiContentLimits.announcement.maxLength}
                  className={`min-h-[120px] ${textareaClassName}`}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {announcementDirty ? "You have unsaved banner edits." : "No pending changes in the banner text."} {formatLongFormMeta(announcementText, uiContentLimits.announcement.maxLength, uiContentLimits.announcement.recommendedLength)}
                  </p>
                  <Button
                    type="button"
                    onClick={handleSaveAnnouncement}
                    disabled={savingAnnouncement || !announcementDirty}
                    className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]"
                  >
                    {savingAnnouncement ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving
                      </span>
                    ) : announcementDirty ? (
                      "Save announcement"
                    ) : (
                      "Saved"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "faq" && (
        <Card className="border border-[#E7A3B0]/30 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-gray-900">FAQ Items</CardTitle>
              {!addingFaq && !editingFaq && (
                <Button
                  type="button"
                  onClick={startAddFaq}
                  disabled={hasReachedFaqLimit}
                  className="bg-[#cc7f8f] text-white hover:bg-[#b96f80] gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add FAQ
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingFaqs ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                {hasReachedFaqLimit && !addingFaq && (
                  <div className="rounded-xl border border-[#E7A3B0]/30 bg-[#fff9fb] px-4 py-3 text-sm text-[#8a6b73]">
                    You can only have up to {MAX_FAQ_ITEMS} FAQs. Delete an existing item before adding a new one.
                  </div>
                )}

                {(addingFaq || editingFaq) && (
                  <div
                    className={`rounded-xl border p-4 ${
                      faqFormDirty ? "border-[#E7A3B0]/40 bg-[#fffafb]" : "border-gray-200 bg-gray-50/50"
                    }`}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {editingFaq ? "Edit FAQ" : "New FAQ"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Questions should stay concise for the customer accordion, and answers should match the About page FAQ tone.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            faqFormDirty ? "bg-[#E7A3B0] text-white" : "border border-gray-200 bg-white text-gray-500"
                          }`}
                        >
                          {faqFormDirty ? "Unsaved" : editingFaq ? "Saved" : "Draft"}
                        </span>
                        <button type="button" onClick={cancelFaqForm} className="text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="rounded-xl border border-gray-200 bg-white p-4 md:col-span-2">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-900">Question</p>
                          <p className="text-xs text-gray-500">
                            Single-line question shown as the clickable prompt on the customer FAQ.
                          </p>
                        </div>
                        <Input
                          value={faqForm.question}
                          onChange={(e) => setFaqForm((prev) => ({ ...prev, question: sanitizeFaqQuestionInput(e.target.value) }))}
                          maxLength={uiContentLimits.faqQuestion.maxLength}
                          placeholder="e.g. What is your return policy?"
                          className={inputClassName}
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          {formatLongFormMeta(
                            faqForm.question,
                            uiContentLimits.faqQuestion.maxLength,
                            uiContentLimits.faqQuestion.recommendedLength
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-4 md:col-span-2">
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-900">Answer</p>
                          <p className="text-xs text-gray-500">
                            Keep the answer clear and customer-facing. Save after checking readability and line breaks.
                          </p>
                        </div>
                        <Textarea
                          value={faqForm.answer}
                          onChange={(e) => setFaqForm((prev) => ({ ...prev, answer: sanitizeFaqAnswerInput(e.target.value) }))}
                          maxLength={uiContentLimits.faqAnswer.maxLength}
                          placeholder="Write a clear, concise answer..."
                          className={`min-h-[120px] ${textareaClassName}`}
                        />
                        <div className="mt-2 text-xs text-gray-500">
                          {formatLongFormMeta(
                            faqForm.answer,
                            uiContentLimits.faqAnswer.maxLength,
                            uiContentLimits.faqAnswer.recommendedLength
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">Category</span>
                          <Select
                            value={faqForm.category}
                            onValueChange={(val) => setFaqForm((prev) => ({ ...prev, category: val as FAQCategory }))}
                          >
                            <SelectTrigger className={`h-9 w-[150px] ${inputClassName}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FAQ_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-500">
                        {faqHasRequiredValues
                          ? faqFormDirty
                            ? "This FAQ has unsaved edits."
                            : "No pending changes."
                          : "Question and answer are required before saving."}
                      </p>
                      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelFaqForm}
                          className="border-gray-200 text-gray-700 hover:text-gray-900"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSaveFaq}
                          disabled={savingFaq || !faqHasRequiredValues || (!!editingFaq && !faqFormDirty)}
                          className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]"
                        >
                          {savingFaq ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving
                            </span>
                          ) : editingFaq ? "Save changes" : "Create FAQ"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {faqs.length === 0 && !addingFaq ? (
                  <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400 text-sm">
                    No FAQ items yet. Click &ldquo;Add FAQ&rdquo; to create the first one.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {faqs.map((faq, index) => (
                      <div
                        key={faq.id}
                        className={`rounded-xl border p-4 ${editingFaq?.id === faq.id ? "border-[#E7A3B0] bg-[#fff5f7]" : "border-gray-200 bg-gray-50/50"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">#{index + 1}</span>
                              <span className="rounded-full bg-[#E7A3B0]/20 px-2 py-0.5 text-[10px] font-medium text-[#b96d7d]">{faq.category}</span>
                              <span className="text-[10px] text-gray-400">{faq.click_count} click{faq.click_count !== 1 ? "s" : ""}</span>
                              {!faq.is_active && (
                                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500">Hidden</span>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 truncate">{faq.question}</p>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{faq.answer}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditFaq(faq)}
                              disabled={deletingFaqId !== null || savingFaq}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-[#b96d7d] transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFaq(faq.id)}
                              disabled={deletingFaqId !== null || savingFaq}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-red-500 transition-colors"
                            >
                              {deletingFaqId === faq.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {activeSection === "about" && (
        <Card className="border border-[#E7A3B0]/30 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold text-gray-900">About Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingAbout ? (
              <div className="space-y-6">
                <Skeleton className="h-4 w-1/4 mb-2" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-[100px] w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm text-gray-600">
                  Edit the About and History copy blocks shown on the customer-facing About page.
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {ABOUT_SECTION_FIELD_CONFIG.map((field) => {
                    const isDirty = aboutDetails[field.key] !== savedAboutDetails[field.key];
                    const isSaving = savingAboutField === field.key;

                    return (
                      <div
                        key={field.key}
                        className={`rounded-xl border p-4 ${
                          isDirty ? "border-[#E7A3B0]/40 bg-[#fffafb]" : "border-gray-200 bg-gray-50/50"
                        }`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{field.label}</p>
                            <p className="text-xs text-gray-500">
                              Save each block after reviewing readability and tone for customers.
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                              isDirty ? "bg-[#E7A3B0] text-white" : "border border-gray-200 bg-white text-gray-500"
                            }`}
                          >
                            {isDirty ? "Unsaved" : "Saved"}
                          </span>
                        </div>
                        <Textarea
                          value={aboutDetails[field.key]}
                          onChange={(e) => updateAboutDetails(field.key, e.target.value)}
                          maxLength={field.maxLength}
                          className={`${field.minHeightClassName || "min-h-[90px]"} ${textareaClassName}`}
                        />
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                          <p className="text-xs text-gray-500">
                            {isDirty ? "This field has unsaved edits." : "No pending changes."} {formatLongFormMeta(aboutDetails[field.key], field.maxLength, field.recommendedLength)}
                          </p>
                          <Button
                            type="button"
                            onClick={() => handleSaveAboutField(field.key, field.label)}
                            disabled={savingAboutField !== null || !isDirty}
                            className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]"
                          >
                            {isSaving ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving
                              </span>
                            ) : isDirty ? (
                              "Save field"
                            ) : (
                              "Saved"
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
