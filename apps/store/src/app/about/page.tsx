import { createAdminClient, getAboutDetails } from "@dollys-closet/core";
import { AboutView } from "@dollys-closet/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About Us | Dolly's Closet",
  description: "Learn about Dolly's Closet. Curating timeless elegance and redefining boutique fashion.",
};

export default async function AboutPage() {
  const supabase = createAdminClient();
  const aboutDetails = await getAboutDetails(supabase);

  return <AboutView aboutDetails={aboutDetails} />;
}
