"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  ABOUT_SLUG,
  ABOUT_SECTION_FIELD_CONFIG,
  CONTACT_FIELD_CONFIG,
  CONTACT_SLUG,
  AboutDetailsPayload,
  AboutFieldKey,
  ContactFieldKey,
  ContactDetailsPayload,
  defaultAboutDetails,
  defaultContactDetails,
  parseAboutBody,
  parseContactBody,
} from "../../../lib/business-details";

export default function ManageDetailsPage() {
  const inputClassName = "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]";
  const textareaClassName = "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]";

  const [activeSection, setActiveSection] = useState<"contact" | "about">("contact");
  const [details, setDetails] = useState<ContactDetailsPayload>(defaultContactDetails);
  const [aboutDetails, setAboutDetails] = useState<AboutDetailsPayload>(defaultAboutDetails);

  const [loadingContact, setLoadingContact] = useState(true);
  const [loadingAbout, setLoadingAbout] = useState(false);
  const [hasLoadedAbout, setHasLoadedAbout] = useState(false);
  const [savingAboutField, setSavingAboutField] = useState<AboutFieldKey | null>(null);
  const [aboutPage, setAboutPage] = useState<1 | 2 | 3>(1);
  const [savingField, setSavingField] = useState<ContactFieldKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const authTokenRef = useRef<string | null>(null);

  const getAuthToken = useCallback(async () => {
    if (authTokenRef.current) {
      return authTokenRef.current;
    }

    const {
      data: { session },
    } = await browserSupabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    authTokenRef.current = session.access_token;
    return session.access_token;
  }, []);

  const fetchContactDetails = useCallback(async () => {
    try {
      setLoadingContact(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch(`/api/admin/business-details?slug=${CONTACT_SLUG}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch contact details");
      }

      setDetails(parseContactBody(result.data?.body));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch contact details");
    } finally {
      setLoadingContact(false);
    }
  }, [getAuthToken]);

  const fetchAboutDetails = useCallback(async () => {
    try {
      setLoadingAbout(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch(`/api/admin/business-details?slug=${ABOUT_SLUG}`, {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch about details");
      }

      setAboutDetails(parseAboutBody(result.data?.body));
      setHasLoadedAbout(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch about details");
    } finally {
      setLoadingAbout(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchContactDetails();
  }, [fetchContactDetails]);

  useEffect(() => {
    if (activeSection === "about" && !hasLoadedAbout) {
      fetchAboutDetails();
    }
  }, [activeSection, hasLoadedAbout, fetchAboutDetails]);

  async function handleSaveContactField(fieldKey: ContactFieldKey, label: string) {
    try {
      setSavingField(fieldKey);
      setError(null);
      setSuccess(null);

      const token = await getAuthToken();

      const response = await fetch("/api/admin/business-details", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: CONTACT_SLUG,
          title: label,
          body: details[fieldKey],
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save contact details");
      }

      setSuccess(`${label} saved.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save contact details");
    } finally {
      setSavingField(null);
    }
  }

  async function handleSaveAboutField(fieldKey: AboutFieldKey, label: string) {
    try {
      setSavingAboutField(fieldKey);
      setError(null);
      setSuccess(null);

      const token = await getAuthToken();

      const response = await fetch("/api/admin/business-details", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: ABOUT_SLUG,
          title: label,
          body: aboutDetails[fieldKey],
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save about details");
      }

      setSuccess(`${label} saved.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save about details");
    } finally {
      setSavingAboutField(null);
    }
  }

  function updateDetails(key: ContactFieldKey, value: string) {
    setDetails((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateAboutDetails(key: AboutFieldKey, value: string) {
    setAboutDetails((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  if (loadingContact) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Details</h1>
        <p className="mt-2 text-gray-600">Edit website contact details and links.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => {
            setActiveSection("contact");
            setSuccess(null);
            setError(null);
          }}
          className={
            activeSection === "contact"
              ? "bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] text-white hover:from-[#d891a0] hover:to-[#E7A3B0]"
              : "bg-white border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"
          }
        >
          Edit Contact
        </Button>
        <Button
          type="button"
          onClick={() => {
            setActiveSection("about");
            setAboutPage(1);
            setSuccess(null);
            setError(null);
          }}
          className={
            activeSection === "about"
              ? "bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] text-white hover:from-[#d891a0] hover:to-[#E7A3B0]"
              : "bg-white border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"
          }
        >
          Edit About
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {activeSection === "contact" && (
        <Card className="border border-[#E7A3B0]/30 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold text-gray-900">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-gray-600">Each field saves independently.</p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {CONTACT_FIELD_CONFIG.map((field) => (
                <div key={field.key} className={field.type === "textarea" ? "md:col-span-2" : ""}>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">{field.label}</p>

                    {field.type === "textarea" ? (
                      <div className="space-y-2">
                        <Textarea
                          value={details[field.key]}
                          onChange={(e) => updateDetails(field.key, e.target.value)}
                          className={`${field.minHeightClassName || "min-h-[90px]"} ${textareaClassName}`}
                        />
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            onClick={() => handleSaveContactField(field.key, field.label)}
                            disabled={savingField !== null}
                            className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]"
                          >
                            {savingField === field.key ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving
                              </span>
                            ) : (
                              "Save"
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
                          disabled={savingField !== null}
                          className="bg-[#cc7f8f] text-white hover:bg-[#b96f80] md:min-w-28"
                        >
                          {savingField === field.key ? (
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving
                            </span>
                          ) : (
                            "Save"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeSection === "about" && (
        <Card className="border border-[#E7A3B0]/30 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold text-gray-900">About Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingAbout ? (
              <div className="flex min-h-[220px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#cc7f8f]" />
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600">Only body content is editable for About and History. FAQ question and answer fields also save independently.</p>

                {aboutPage === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-base font-semibold text-gray-900">About Section Bodies</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {ABOUT_SECTION_FIELD_CONFIG.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">{field.label}</p>
                          <Textarea
                            value={aboutDetails[field.key]}
                            onChange={(e) => updateAboutDetails(field.key, e.target.value)}
                            className={`${field.minHeightClassName || "min-h-[90px]"} ${textareaClassName}`}
                          />
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              onClick={() => handleSaveAboutField(field.key, field.label)}
                              disabled={savingAboutField !== null}
                              className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]"
                            >
                              {savingAboutField === field.key ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Saving
                                </span>
                              ) : (
                                "Save"
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(aboutPage === 2 || aboutPage === 3) && (
                  <div className="space-y-6">
                    <h3 className="text-base font-semibold text-gray-900">FAQ (8 Items)</h3>
                    <p className="text-sm text-gray-600">Showing items {aboutPage === 2 ? "1-4" : "5-8"}.</p>
                    <div className="grid grid-cols-1 gap-4">
                      {Array.from({ length: 4 }, (_, index) => {
                        const number = (aboutPage === 2 ? 0 : 4) + index + 1;
                      const questionKey = `question${number}` as AboutFieldKey;
                      const answerKey = `answer${number}` as AboutFieldKey;
                      const questionLabel = `Question ${number}`;
                      const answerLabel = `Answer ${number}`;

                      return (
                        <div key={number} className="space-y-3 rounded-lg border border-gray-200 p-4">
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">{questionLabel}</p>
                            <div className="flex flex-col gap-2 md:flex-row">
                              <Input
                                value={aboutDetails[questionKey]}
                                onChange={(e) => updateAboutDetails(questionKey, e.target.value)}
                                className={inputClassName}
                              />
                              <Button
                                type="button"
                                onClick={() => handleSaveAboutField(questionKey, questionLabel)}
                                disabled={savingAboutField !== null}
                                className="bg-[#cc7f8f] text-white hover:bg-[#b96f80] md:min-w-28"
                              >
                                {savingAboutField === questionKey ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving
                                  </span>
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">{answerLabel}</p>
                            <Textarea
                              value={aboutDetails[answerKey]}
                              onChange={(e) => updateAboutDetails(answerKey, e.target.value)}
                              className={`min-h-[90px] ${textareaClassName}`}
                            />
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                onClick={() => handleSaveAboutField(answerKey, answerLabel)}
                                disabled={savingAboutField !== null}
                                className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]"
                              >
                                {savingAboutField === answerKey ? (
                                  <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving
                                  </span>
                                ) : (
                                  "Save"
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

                <Pagination className="mt-4 pb-2">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setAboutPage((prev) => (prev === 1 ? 1 : ((prev - 1) as 1 | 2 | 3)));
                        }} 
                        className={aboutPage === 1 || savingAboutField !== null ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                      />
                    </PaginationItem>
                    
                    {[1, 2, 3].map((pageNum) => (
                      <PaginationItem key={pageNum}>
                        <PaginationLink 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setAboutPage(pageNum as 1 | 2 | 3);
                          }}
                          isActive={aboutPage === pageNum}
                          className={savingAboutField !== null && aboutPage !== pageNum ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setAboutPage((prev) => (prev === 3 ? 3 : ((prev + 1) as 1 | 2 | 3)));
                        }} 
                        className={aboutPage === 3 || savingAboutField !== null ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
