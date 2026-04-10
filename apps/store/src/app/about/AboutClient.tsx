"use client";

import { useCallback, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AboutView } from "@dollys-closet/ui";
import { incrementFAQClick } from "@dollys-closet/core";
import type { AboutDetailsPayload, FAQRow } from "@dollys-closet/core";

interface AboutClientProps {
  aboutDetails: AboutDetailsPayload;
  initialFaqs: FAQRow[];
}

export default function AboutClient({ aboutDetails, initialFaqs }: AboutClientProps) {
  const [faqs, setFaqs] = useState<FAQRow[]>(initialFaqs);

  const handleFAQClick = useCallback(async (id: string) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await incrementFAQClick(supabase, id);
    setFaqs((prev) =>
      [...prev]
        .map((f) => f.id === id ? { ...f, click_count: f.click_count + 1 } : f)
        .sort((a, b) => b.click_count - a.click_count)
    );
  }, []);

  return (
    <AboutView
      aboutDetails={aboutDetails}
      faqs={faqs}
      onFAQClick={handleFAQClick}
    />
  );
}
