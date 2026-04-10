import { createAdminClient, getAboutDetails, getFAQs } from "@dollys-closet/core";
import { AboutView } from "@dollys-closet/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Dolly's Closet. Curating timeless elegance and redefining boutique fashion.",
};

export default async function AboutPage() {
  const supabaseAdmin = createAdminClient();
  const [aboutDetails, faqs] = await Promise.all([
    getAboutDetails(supabaseAdmin),
    getFAQs(supabaseAdmin),
  ]);

  return <AboutView aboutDetails={aboutDetails} faqs={faqs} />;
}
