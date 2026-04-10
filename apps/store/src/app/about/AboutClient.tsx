"use client";

import { useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AboutView } from "@dollys-closet/ui";
import { incrementFAQClick } from "@dollys-closet/core";
import type { AboutDetailsPayload, FAQRow } from "@dollys-closet/core";

interface AboutClientProps {
  aboutDetails: AboutDetailsPayload;
  initialFaqs: FAQRow[];
}

export default function AboutClient({ aboutDetails, initialFaqs: faqs }: AboutClientProps) {
  const handleFAQClick = useCallback((id: string) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    void incrementFAQClick(supabase, id);
  }, []);

  return (
    <AboutView
      aboutDetails={aboutDetails}
      faqs={faqs}
      onFAQClick={handleFAQClick}
    />
  );
}
