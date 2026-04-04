import { SupabaseClient } from "@supabase/supabase-js";
import { 
  ABOUT_SLUG, 
  CONTACT_SLUG, 
  buildAboutAggregate, 
  buildContactAggregate, 
  defaultAboutDetails, 
  defaultContactDetails 
} from "./business-details";
import { AboutDetailsPayload, ContactDetailsPayload, BusinessDetailsRow } from "../../types/business-details.types";

const BUSINESS_DETAILS_TABLES = ["tbl_business_details", "business_details"] as const;

/**
 * Common data fetcher for About page details that can be used by any workspace.
 * Accepts any valid Supabase client (browser or admin).
 */
export async function getAboutDetails(supabase: SupabaseClient): Promise<AboutDetailsPayload> {
  for (const tableName of BUSINESS_DETAILS_TABLES) {
    const result = await supabase
      .from(tableName)
      .select("slug, title, body, updated_at")
      .eq("slug", ABOUT_SLUG)
      .order("updated_at", { ascending: false, nullsFirst: false });

    if (!result.error) {
      const rows = (result.data as BusinessDetailsRow[]) || [];
      return buildAboutAggregate(rows).body;
    }

    if (!result.error.message.toLowerCase().includes("does not exist")) {
      break;
    }
  }

  return defaultAboutDetails;
}

/**
 * Common data fetcher for Contact page details that can be used by any workspace.
 */
export async function getContactDetails(supabase: SupabaseClient): Promise<{ pageTitle: string; details: ContactDetailsPayload }> {
  for (const tableName of BUSINESS_DETAILS_TABLES) {
    const result = await supabase
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
