"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  Megaphone,
  Phone,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CustomPagination from "@/components/general-components/CustomPagination";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
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
} from "@/lib/business-details/business-details";

type ManageDetailsClientProps = {
  role: "admin" | "employee";
};

export default function ManageDetailsClient({ role }: ManageDetailsClientProps) {
  const isAdmin = role === "admin";
  const inputClassName = "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]";
  const textareaClassName = "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]";
  const { setIsDirty, setUnsavedMessage } = useUnsavedChanges();

  const [activeSection, setActiveSection] = useState<"announcement" | "contact" | "about">("announcement");
  const [announcementText, setAnnouncementText] = useState(defaultAnnouncementText);
  const [savedAnnouncementText, setSavedAnnouncementText] = useState(defaultAnnouncementText);
  const [details, setDetails] = useState<ContactDetailsPayload>(defaultContactDetails);
  const [savedDetails, setSavedDetails] = useState<ContactDetailsPayload>(defaultContactDetails);
  const [aboutDetails, setAboutDetails] = useState<AboutDetailsPayload>(defaultAboutDetails);
  const [savedAboutDetails, setSavedAboutDetails] = useState<AboutDetailsPayload>(defaultAboutDetails);

  const [loadingAnnouncement, setLoadingAnnouncement] = useState(false);
  const [hasLoadedAnnouncement, setHasLoadedAnnouncement] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [loadingContact, setLoadingContact] = useState(true);
  const [loadingAbout, setLoadingAbout] = useState(false);
  const [hasLoadedAbout, setHasLoadedAbout] = useState(false);
  const [savingAboutField, setSavingAboutField] = useState<AboutFieldKey | null>(null);
  const [aboutPage, setAboutPage] = useState<1 | 2 | 3>(1);
  const [savingField, setSavingField] = useState<ContactFieldKey | null>(null);
  const [refreshingSection, setRefreshingSection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchContactDetails = useCallback(async () => {
    try {
      setLoadingContact(true);
      setError(null);
      const response = await fetch(`/api/admin/business-details?slug=${CONTACT_SLUG}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch contact details");
      const parsedDetails = parseContactBody(result.data?.body);
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
      const nextAnnouncement = (result.data?.body || defaultAnnouncementText) as string;
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
      const parsedAboutDetails = parseAboutBody(result.data?.body);
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
      ? announcementDirty
        ? 1
        : 0
      : activeSection === "contact"
        ? contactDirtyCount
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
        ]
      : []),
  ];

  const handleSetActiveSection = (section: "announcement" | "contact" | "about") => {
    setActiveSection(section);
    if (section === "about") {
      setAboutPage(1);
    }
    setSuccess(null);
    setError(null);
  };

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
            : await fetchAboutDetails();

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
      const response = await fetch("/api/admin/business-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: CONTACT_SLUG,
          title: label,
          body: details[fieldKey],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save contact details");
      setSavedDetails((prev) => ({
        ...prev,
        [fieldKey]: details[fieldKey],
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
      const response = await fetch("/api/admin/business-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: ABOUT_SLUG,
          title: label,
          body: aboutDetails[fieldKey],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save about details");
      setSavedAboutDetails((prev) => ({
        ...prev,
        [fieldKey]: aboutDetails[fieldKey],
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
      const response = await fetch("/api/admin/business-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: ANNOUNCEMENT_SLUG,
          title: ANNOUNCEMENT_TITLE,
          body: announcementText,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save announcement");
      setSavedAnnouncementText(announcementText);
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
    setDetails((prev: ContactDetailsPayload) => ({ ...prev, [key]: value }));
  }

  function updateAboutDetails(key: AboutFieldKey, value: string) {
    setAboutDetails((prev: AboutDetailsPayload) => ({ ...prev, [key]: value }));
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
              className={`rounded-2xl border p-4 text-left transition-all ${
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
                              className={`${field.minHeightClassName || "min-h-[90px]"} ${textareaClassName}`}
                            />
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs text-gray-500">
                                {isDirty ? "This field has unsaved edits." : "No pending changes."}
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
                          <div className="flex flex-col gap-2 md:flex-row">
                            <Input
                              value={details[field.key]}
                              onChange={(e) => updateDetails(field.key, e.target.value)}
                              className={inputClassName}
                            />
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
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className={`min-h-[120px] ${textareaClassName}`}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {announcementDirty ? "You have unsaved banner edits." : "No pending changes in the banner text."}
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
                  {aboutPage === 1
                    ? "Page 1 contains the main About page copy blocks."
                    : `Page ${aboutPage} contains FAQ items ${aboutPage === 2 ? "1-4" : "5-8"}.`}
                </div>

                {aboutPage === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-base font-semibold text-gray-900">About Section Bodies</h3>
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
                              className={`${field.minHeightClassName || "min-h-[90px]"} ${textareaClassName}`}
                            />
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="text-xs text-gray-500">
                                {isDirty ? "This field has unsaved edits." : "No pending changes."}
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
                  </div>
                )}
                {(aboutPage === 2 || aboutPage === 3) && (
                  <div className="space-y-6">
                    <h3 className="text-base font-semibold text-gray-900">FAQ (8 Items)</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {Array.from({ length: 4 }, (_, index) => {
                        const number = (aboutPage === 2 ? 0 : 4) + index + 1;
                        const questionKey = `question${number}` as AboutFieldKey;
                        const answerKey = `answer${number}` as AboutFieldKey;
                        const questionLabel = `Question ${number}`;
                        const answerLabel = `Answer ${number}`;
                        const questionDirty = aboutDetails[questionKey] !== savedAboutDetails[questionKey];
                        const answerDirty = aboutDetails[answerKey] !== savedAboutDetails[answerKey];
                        return (
                          <div key={number} className="space-y-3 rounded-lg border border-gray-200 p-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">FAQ Item {number}</p>
                              <p className="text-xs text-gray-500">Save the question and answer separately after editing.</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-gray-700">{questionLabel}</p>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                    questionDirty ? "bg-[#E7A3B0] text-white" : "border border-gray-200 bg-white text-gray-500"
                                  }`}
                                >
                                  {questionDirty ? "Unsaved" : "Saved"}
                                </span>
                              </div>
                              <div className="flex flex-col gap-2 md:flex-row">
                                <Input value={aboutDetails[questionKey]} onChange={(e) => updateAboutDetails(questionKey, e.target.value)} className={inputClassName} />
                                <Button type="button" onClick={() => handleSaveAboutField(questionKey, questionLabel)} disabled={savingAboutField !== null || !questionDirty} className="bg-[#cc7f8f] text-white hover:bg-[#b96f80] md:min-w-28">
                                  {savingAboutField === questionKey ? (
                                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving</span>
                                  ) : questionDirty ? (
                                    "Save field"
                                  ) : (
                                    "Saved"
                                  )}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-gray-700">{answerLabel}</p>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                    answerDirty ? "bg-[#E7A3B0] text-white" : "border border-gray-200 bg-white text-gray-500"
                                  }`}
                                >
                                  {answerDirty ? "Unsaved" : "Saved"}
                                </span>
                              </div>
                              <Textarea value={aboutDetails[answerKey]} onChange={(e) => updateAboutDetails(answerKey, e.target.value)} className={`min-h-[90px] ${textareaClassName}`} />
                              <div className="flex justify-end">
                                <Button type="button" onClick={() => handleSaveAboutField(answerKey, answerLabel)} disabled={savingAboutField !== null || !answerDirty} className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]">
                                  {savingAboutField === answerKey ? (
                                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving</span>
                                  ) : answerDirty ? (
                                    "Save field"
                                  ) : (
                                    "Saved"
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <CustomPagination className="mt-4 pb-2" currentPage={aboutPage} totalPages={3} onPageChange={(p) => setAboutPage(p as 1 | 2 | 3)} disabled={savingAboutField !== null} />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
