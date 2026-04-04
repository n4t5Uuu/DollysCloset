import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusinessDetailsRow } from "../../types/business-details.types";
import {
  ABOUT_SLUG,
  ANNOUNCEMENT_SLUG,
  CONTACT_SLUG,
  buildAboutAggregate,
  buildContactAggregate,
  sanitizeAnnouncementBody,
} from "./business-details";
import { businessDetailsHelper } from "./business-details-helper";

export async function getPublicBusinessDetailsBySlug(
  slug: string,
  supabase: SupabaseClient
) {
  const tableResult = await businessDetailsHelper.resolveTableName(supabase);
  if (tableResult.error) {
    return { data: null, error: tableResult.error };
  }

  const { data: rows, error: fetchError } = await businessDetailsHelper.findAllBySlug(
    tableResult.tableName,
    slug,
    supabase
  );

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  const businessRows = (rows as BusinessDetailsRow[]) || [];

  if (slug === CONTACT_SLUG) {
    return { data: buildContactAggregate(businessRows), error: null };
  }

  if (slug === ABOUT_SLUG) {
    return { data: buildAboutAggregate(businessRows), error: null };
  }

  const latestRow = businessRows[0] || null;

  if (slug === ANNOUNCEMENT_SLUG && latestRow) {
    return {
      data: {
        ...latestRow,
        body: sanitizeAnnouncementBody(latestRow.body),
      },
      error: null,
    };
  }

  return { data: latestRow, error: null };
}
