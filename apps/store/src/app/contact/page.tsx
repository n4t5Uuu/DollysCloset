import { createAdminClient, getContactDetails } from "@dollys-closet/core";
import { ContactView } from "@dollys-closet/ui";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get In Touch | Dolly's Closet",
  description: "Contact Dolly's Closet for inquiries about our boutique collection, location, and management services.",
};

export default async function ContactPage() {
  const supabase = createAdminClient();
  const { pageTitle, details } = await getContactDetails(supabase);

  return <ContactView pageTitle={pageTitle} initialDetails={details} />;
}
