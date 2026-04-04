import { admin } from "@dollys-closet/core/lib/supabase/admin";
import { getAboutDetails } from "@dollys-closet/core";
import { AboutView } from "@dollys-closet/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Dolly's Closet. Curating timeless elegance and redefining boutique fashion.",
};

export default async function AboutPage() {
  const aboutDetails = await getAboutDetails(admin);

  return <AboutView aboutDetails={aboutDetails} />;
}
