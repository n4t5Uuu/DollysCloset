"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ABOUT_SLUG,
  CONTACT_FIELD_CONFIG,
  CONTACT_SLUG,
  ContactFieldKey,
  ContactDetailsPayload,
  defaultContactDetails,
  parseContactBody,
} from "@/lib/business-details";

export default function ManageDetailsPage() {
  const inputClassName = "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]";
  const textareaClassName = "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]";

  const [activeSection, setActiveSection] = useState<"contact" | "about">("contact");
  const [details, setDetails] = useState<ContactDetailsPayload>(defaultContactDetails);
  const [aboutTitle, setAboutTitle] = useState("About Us");
  const [aboutBody, setAboutBody] = useState("");

  const [loadingContact, setLoadingContact] = useState(true);
  const [loadingAbout, setLoadingAbout] = useState(false);
  const [hasLoadedAbout, setHasLoadedAbout] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch about details");
      }

      setAboutTitle(result.data?.title || "About Us");
      setAboutBody(typeof result.data?.body === "string" ? result.data.body : "");
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

  async function handleSaveAbout() {
    try {
      setSavingAbout(true);
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
          title: aboutTitle,
          body: aboutBody,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save about details");
      }

      setAboutTitle(result.data?.title || "About Us");
      setAboutBody(typeof result.data?.body === "string" ? result.data.body : "");
      setSuccess("About details saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save about details");
    } finally {
      setSavingAbout(false);
    }
  }

  function updateDetails(key: ContactFieldKey, value: string) {
    setDetails((prev) => ({
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
              ? "bg-gradient-to-r from-[#E7A3B0] to-[#f0b8c3] text-white hover:from-[#d891a0] hover:to-[#E7A3B0]"
              : "bg-white border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"
          }
        >
          Edit Contact
        </Button>
        <Button
          type="button"
          onClick={() => {
            setActiveSection("about");
            setSuccess(null);
            setError(null);
          }}
          className={
            activeSection === "about"
              ? "bg-gradient-to-r from-[#E7A3B0] to-[#f0b8c3] text-white hover:from-[#d891a0] hover:to-[#E7A3B0]"
              : "bg-white border border-[#E7A3B0]/40 text-[#cc7f8f] hover:bg-[#fff5f7]"
          }
        >
          Edit About
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
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
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">About Title</p>
                  <Input value={aboutTitle} onChange={(e) => setAboutTitle(e.target.value)} className={inputClassName} />
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">About Body</p>
                  <Textarea value={aboutBody} onChange={(e) => setAboutBody(e.target.value)} className={`min-h-[260px] ${textareaClassName}`} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveAbout} disabled={savingAbout} className="bg-[#cc7f8f] text-white hover:bg-[#b96f80]">
                    {savingAbout ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      "Save About"
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
