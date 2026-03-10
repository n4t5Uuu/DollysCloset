"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { MapPin, Send, Loader2, CheckCircle2, XCircle, X, Facebook, Instagram, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { TextEffect } from "@/components/motion-primitives/text-effect";
import { Spotlight } from "@/components/motion-primitives/spotlight";
import { InView } from "@/components/motion-primitives/in-view";

import { ContactDetailsPayload } from "@/types/business-details.types";

const defaultContactDetails: ContactDetailsPayload = {
  introText: "We would love to hear from you! Whether you have a question about our collection, need assistance, or just want to say hello.",
  facebookName: "Dolly's Closet",
  facebookLink: "#",
  instagramHandle: "@dollyscloset",
  instagramLink: "#",
  viberName: "Shierly Gonzales",
  viberLink: "#",
  contactNumberDisplay: "+63 912 1234 123",
  contactNumberLink: "tel:+639121234123",
  address: "04 Admiral, Talon Tres, Las Piñas City",
  weekdaysHours: "9:00 AM - 6:00 PM",
  weekendHours: "10:00 AM - 5:00 PM",
};

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#") return "#";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("tel:") || trimmed.startsWith("mailto:")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function parseContactBody(rawBody: unknown): ContactDetailsPayload {
  if (!rawBody) {
    return defaultContactDetails;
  }

  if (typeof rawBody === "object") {
    return {
      ...defaultContactDetails,
      ...(rawBody as Partial<ContactDetailsPayload>),
    };
  }

  if (typeof rawBody !== "string") {
    return defaultContactDetails;
  }

  try {
    const parsed = JSON.parse(rawBody) as Partial<ContactDetailsPayload>;
    return {
      ...defaultContactDetails,
      ...parsed,
    };
  } catch {
    return defaultContactDetails;
  }
}

export default function Contact() {
  const [pageTitle, setPageTitle] = useState("Get In Touch");
  const [details, setDetails] = useState<ContactDetailsPayload>(defaultContactDetails);
  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    body: "",
  });

  // 'idle' | 'submitting' | 'success' | 'error'
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    /**
     * Fetches contact details from the backend to populate the page's contact information.
     * Uses the /api/business-details endpoint.
     */
    const fetchContactDetails = async () => {
      try {
        const response = await fetch("/api/business-details?slug=contact", { cache: "no-store" });
        if (!response.ok) return;

        const result = await response.json();
        if (!result?.data) return;

        setPageTitle(result.data.title || "Get In Touch");
        setDetails(parseContactBody(result.data.body));
      } catch {
      }
    };

    fetchContactDetails();
  }, []);

  const contactMethods = [
    {
      icon: Facebook,
      label: "Facebook",
      value: details.facebookName,
      link: normalizeUrl(details.facebookLink),
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: Instagram,
      label: "Instagram",
      value: details.instagramHandle,
      link: normalizeUrl(details.instagramLink),
      color: "from-pink-500 to-purple-600",
    },
    {
      icon: MessageCircle,
      label: "Viber",
      value: details.viberName,
      link: normalizeUrl(details.viberLink),
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: Phone,
      label: "Contact Number",
      value: details.contactNumberDisplay,
      link: details.contactNumberLink || "#",
      color: "from-green-500 to-green-600",
    },
  ];

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("submitting");

    // 1. Create FormData BEFORE the await (while the event is still valid)
    const payload = new FormData(event.currentTarget);
    payload.append("access_key", "6458c7f4-91cd-4c75-b769-56dc0546686c");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: payload,
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setFormData({ email: "", subject: "", body: "" });
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Error submitting form");
      }
    } catch (error) {
      console.log(error);
      setStatus("error");
      setErrorMessage("Something went wrong! Please try again later.");
    }
  };

  const closeModal = () => {
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <main className="w-full min-h-screen bg-linear-to-b from-white to-pink-50/30 pt-10 pb-20 relative">
      {/* Decorative Elements */}
      <div className="absolute top-50 left-10 w-72 h-72 bg-[#E7A3B0]/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#E7A3B0]/10 rounded-full blur-3xl -z-10" />

      {/* --- STATUS MODAL --- */}
      {status !== "idle" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center space-y-4 relative border-4 border-white">
            
            {/* Close Button (visible only on Error or Success) */}
            {status !== "submitting" && (
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}

            {/* SUBMITTING STATE */}
            {status === "submitting" && (
              <div className="py-8 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-pink-100 border-t-[#E7A3B0] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#E7A3B0] animate-spin" />
                  </div>
                </div>
                <h3 className="font-oswald text-xl font-bold text-gray-800 uppercase tracking-wide">
                  Sending Message...
                </h3>
                <p className="font-montserrat text-gray-500">
                  Please wait while we deliver your message.
                </p>
              </div>
            )}

            {/* SUCCESS STATE */}
            {status === "success" && (
              <div className="py-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="font-oswald text-2xl font-bold text-gray-800 uppercase tracking-wide">
                  Message Sent!
                </h3>
                <p className="font-montserrat text-gray-600">
                  Thank you for reaching out. We will get back to you within 24 hours.
                </p>
                <Button 
                  onClick={closeModal}
                  className="mt-4 bg-gray-900 hover:bg-gray-800 text-white font-montserrat px-8 rounded-xl"
                >
                  Close
                </Button>
              </div>
            )}

            {/* ERROR STATE */}
            {status === "error" && (
              <div className="py-6 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="font-oswald text-2xl font-bold text-gray-800 uppercase tracking-wide">
                  Failed to Send
                </h3>
                <p className="font-montserrat text-gray-600">
                  {errorMessage}
                </p>
                <Button 
                  onClick={closeModal}
                  className="mt-4 bg-[#E7A3B0] hover:bg-[#d891a0] text-white font-montserrat px-8 rounded-xl"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full max-w-[1400px] mx-auto px-6">
        {/* Header Section */}
        <div className="text-center mb-16 space-y-4">
          <TextEffect 
            per="char" 
            preset="blur" 
            className="font-great-vibes text-6xl text-[#E7A3B0] mb-2 inline-block"
          >
            {pageTitle}
          </TextEffect>
          <InView
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.2 }}
            }}
            viewOptions={{ once: true }}
          >
            <p className="font-montserrat text-gray-600 text-lg max-w-2xl mx-auto">
              {details.introText}
            </p>
          </InView>
        </div>

        <div>
          <InView
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
            }}
            viewOptions={{ once: true }}
          >
            <h2 className="font-oswald text-2xl font-bold uppercase tracking-wide text-gray-800 mb-6">
              Connect With Us
            </h2>
          </InView>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* LEFT COLUMN: Contact Info */}
          <div className="flex flex-col gap-8 h-full">
            {/* Contact Methods Cards */}

            <div className="space-y-4">
              <InView
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.2,
                    },
                  },
                }}
                viewOptions={{ once: true }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {contactMethods.map((method, index) => {
                  const Icon = method.icon;
                  const shouldOpenInNewTab = method.link.startsWith("http://") || method.link.startsWith("https://");

                  return (
                    <motion.a
                      key={index}
                      href={method.link}
                      target={shouldOpenInNewTab ? "_blank" : undefined}
                      rel={shouldOpenInNewTab ? "noopener noreferrer" : undefined}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          transition: { duration: 0.4 },
                        },
                      }}
                      className="group relative bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer h-full min-h-[140px] block"
                    >
                      <div className="relative z-10 space-y-3">
                        {/* Icon */}
                        <div
                          className={`w-12 h-12 rounded-xl bg-linear-to-br ${method.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>

                        {/* Label */}
                        <div>
                          <p className="font-montserrat text-xs text-gray-500 uppercase tracking-wide">
                            {method.label}
                          </p>
                          <p className="font-montserrat font-semibold text-gray-800 mt-1">
                            {method.value}
                          </p>
                        </div>
                      </div>
                      <Spotlight
                        className="from-pink-300/20 via-pink-200/20 to-transparent blur-2xl"
                        size={300}
                      />
                    </motion.a>
                  );
                })}
              </InView>
            </div>

            {/* Store Location Card */}
            <InView
                variants={{
                    hidden: { opacity: 0, x: -50 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.5 }}
                }}
                viewOptions={{ once: true }}
                className="h-full"
            >
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex-1 flex flex-col justify-between h-full">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-linear-to-br from-[#E7A3B0] to-[#f0b8c3] flex items-center justify-center shadow-md shrink-0">
                    <MapPin className="w-7 h-7 text-white" />
                    </div>

                    <div>
                    <h2 className="font-oswald text-2xl font-bold uppercase tracking-wide text-gray-800">
                        Visit Our Store
                    </h2>
                    <p className="font-montserrat text-gray-600 mt-2">
                        Come experience our collection in person
                    </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-linear-to-br from-[#E7A3B0]/10 to-pink-100/50 rounded-xl p-4 border border-[#E7A3B0]/20">
                    <p className="font-montserrat text-gray-700">
                        <span className="font-bold text-[#E7A3B0]">Address:</span>
                        <br />
                      {details.address}
                    </p>
                    </div>

                    {/* Store Hours (Optional) */}
                    <div className="grid grid-cols-2 gap-3 text-sm font-montserrat">
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                        Mon - Fri
                        </p>
                        <p className="font-semibold text-gray-800 mt-1">
                        {details.weekdaysHours}
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-gray-500 text-xs uppercase tracking-wide">
                        Weekends
                        </p>
                        <p className="font-semibold text-gray-800 mt-1">
                        {details.weekendHours}
                        </p>
                    </div>
                    </div>
                </div>
                </div>
            </InView>
          </div>

          {/* RIGHT COLUMN: Email Form */}
          <div className="h-full">
            <InView
              variants={{
                hidden: { opacity: 0, x: 50 },
                visible: {
                  opacity: 1,
                  x: 0,
                  transition: { duration: 0.5, delay: 0.2 },
                },
              }}
              viewOptions={{ once: true }}
              className="h-full"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6 shrink-0">
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-[#E7A3B0] to-[#f0b8c3] flex items-center justify-center shadow-md shrink-0">
                  <Send className="w-7 h-7 text-white" />
                </div>

                <div>
                  <h2 className="font-oswald text-2xl font-bold uppercase tracking-wide text-gray-800">
                    Send Us a Message
                  </h2>
                  <p className="font-montserrat text-sm text-gray-600 mt-1">
                    We will get back to you within 24 hours
                  </p>
                  <p className="font-montserrat text-xs text-gray-500 mt-1">
                    Direct email: dollysclosetwebsite@gmail.com
                  </p>
                </div>
              </div>

              <form onSubmit={onSubmit} className="space-y-5 flex-1 flex flex-col">
                <div className="space-y-2">
                  <label className="font-montserrat text-sm font-semibold text-gray-700">
                    Your Email
                  </label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="dollysclosetwebsite@gmail.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="bg-gray-50 border-gray-200 rounded-xl h-12 px-4 placeholder:text-gray-400 font-montserrat focus-visible:ring-[#E7A3B0] focus-visible:border-[#E7A3B0] transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-montserrat text-sm font-semibold text-gray-700">
                    Subject
                  </label>
                  <Input
                    type="text"
                    name="subject"
                    placeholder="What is this about?"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="bg-gray-50 border-gray-200 rounded-xl h-12 px-4 placeholder:text-gray-400 font-montserrat focus-visible:ring-[#E7A3B0] focus-visible:border-[#E7A3B0] transition-all"
                    required
                  />
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="font-montserrat text-sm font-semibold text-gray-700">
                    Message
                  </label>
                  <Textarea
                    placeholder="Tell us what's on your mind..."
                    name="body"
                    value={formData.body}
                    onChange={(e) =>
                      setFormData({ ...formData, body: e.target.value })
                    }
                    className="bg-gray-50 border-gray-200 rounded-xl flex-1 p-4 placeholder:text-gray-400 font-montserrat resize-none focus-visible:ring-[#E7A3B0] focus-visible:border-[#E7A3B0] transition-all min-h-[180px]"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full h-12 bg-linear-to-r from-[#E7A3B0] to-[#f0b8c3] hover:from-[#d891a0] hover:to-[#E7A3B0] text-white font-bold font-montserrat uppercase tracking-wider text-base rounded-xl transition-all duration-300 shadow-md hover:shadow-lg shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin w-5 h-5" /> Sending...
                    </span>
                  ) : "Send Message"}
                </Button>

                <p className="text-center text-xs text-gray-500 font-montserrat mt-4 shrink-0">
                  By submitting this form, you agree to our privacy policy
                </p>
              </form>
              </div>
            </InView>
          </div>
        </div>

        {/* Bottom Decorative Section */}
        <div className="mt-15 text-center">
          <InView
            variants={{
              hidden: { opacity: 0, scale: 0.9, y: 10 },
              visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6 } },
            }}
            viewOptions={{ once: true }}
          >
            <p className="font-great-vibes text-4xl text-[#E7A3B0]">
              We cannot wait to hear from you! 💌
            </p>
          </InView>
        </div>
      </div>
    </main>
  );
}