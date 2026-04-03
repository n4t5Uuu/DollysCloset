import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get In Touch",
  description: "Contact Dolly's Closet for inquiries about our boutique collection, location, and management services.",
};

import { unstable_noStore as noStore } from "next/cache";
import { admin } from "@/lib/supabase/admin";
import {
  CONTACT_SLUG,
  buildContactAggregate,
  defaultContactDetails,
} from "@/lib/business-details/business-details";
import { BusinessDetailsRow } from "@/types/business-details.types";
import ContactClient from "./ContactClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BUSINESS_DETAILS_TABLES = ["tbl_business_details", "business_details"] as const;

async function getContactDetails() {
  noStore();

  for (const tableName of BUSINESS_DETAILS_TABLES) {
    const result = await admin
      .from(tableName)
      .select("slug, title, body, updated_at")
      .eq("slug", CONTACT_SLUG)
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (!result.error) {
      const rows = (result.data as BusinessDetailsRow[]) || [];
      const aggregate = buildContactAggregate(rows);
      return { pageTitle: aggregate.title, details: aggregate.body };
    }

    if (!result.error.message.toLowerCase().includes("does not exist")) {
      break;
    }
  }

  return { pageTitle: "Get In Touch", details: defaultContactDetails };
}

export default async function ContactPage() {
  const { pageTitle, details } = await getContactDetails();
  return <ContactClient pageTitle={pageTitle} initialDetails={details} />;
}
