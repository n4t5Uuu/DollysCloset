import { createAdminClient, getAboutDetails, getActiveFaqs } from "@dollys-closet/core";
import type { Metadata } from "next";
import AboutClient from "./AboutClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us | Dolly's Closet",
  description: "Learn about Dolly's Closet. Curating timeless elegance and redefining boutique fashion.",
};

export default async function AboutPage() {
  const supabase = createAdminClient();
  const [aboutDetails, faqResult] = await Promise.all([
    getAboutDetails(supabase),
    getActiveFaqs(supabase),
  ]);

  return <AboutClient aboutDetails={aboutDetails} initialFaqs={faqResult.data} />;
}
