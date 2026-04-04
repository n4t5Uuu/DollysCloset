import { admin } from "@dollys-closet/core/lib/supabase/admin";
import { getContactDetails } from "@dollys-closet/core";
import { ContactView } from "@dollys-closet/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get In Touch",
  description: "Contact Dolly's Closet for inquiries about our boutique collection, location, and management services.",
};

export default async function ContactPage() {
  const { pageTitle, details } = await getContactDetails(admin);

  return <ContactView pageTitle={pageTitle} initialDetails={details} />;
}
