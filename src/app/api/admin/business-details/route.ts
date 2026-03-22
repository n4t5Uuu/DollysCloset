import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { authHelper } from "@/lib/auth-helper";
import { businessDetailsHelper } from "@/lib/business-details/business-details-helper";
import { activityHelper } from "@/lib/activity/activity-helper";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  ANNOUNCEMENT_SLUG,
  ABOUT_SLUG,
  ABOUT_LABEL_BY_KEY,
  CONTACT_LABEL_BY_KEY,
  CONTACT_SLUG,
  buildAboutAggregate,
  buildContactAggregate,
  normalizeTitle,
  resolveAboutKey,
  resolveContactKey,
  toText,
} from "../../../../lib/business-details/business-details";

const BUSINESS_DETAILS_TABLES = ["tbl_business_details", "business_details"] as const;
let cachedBusinessDetailsTable: string | null = null;

import {
  BusinessDetailsRow,
  AdminValidationResult
} from "@/types/business-details.types";

function getRowIdColumn(row: BusinessDetailsRow): "business_details_id" | "business_deta" | null {
  if (row.business_details_id !== undefined && row.business_details_id !== null) return "business_details_id";
  if (row.business_deta !== undefined && row.business_deta !== null) return "business_deta";
  return null;
}

async function resolveTableName() {
  return businessDetailsHelper.resolveTableName(admin);
}

async function findLatestBySlug(tableName: string, slug: string) {
  return businessDetailsHelper.findLatestBySlug(tableName, slug, admin);
}

async function findAllBySlug(tableName: string, slug: string) {
  return businessDetailsHelper.findAllBySlug(tableName, slug, admin);
}

async function validateAdmin(request: NextRequest): Promise<AdminValidationResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user: cookieUser },
    error: cookieAuthError,
  } = await supabase.auth.getUser();

  let user = cookieUser || null;

  const authHeader = request.headers.get("authorization");
  if ((!user || cookieAuthError) && authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: tokenUser },
      error: authError,
    } = await admin.auth.getUser(token);

    if (!authError && tokenUser) {
      user = tokenUser;
    }
  }

  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: userData, error: roleError } = await authHelper.getUserRole(user.id, admin);
  if (roleError || userData?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 }) };
  }

  return { ok: true, user };
}

/**
 * Retrieves the currently saved business details depending on the provided slug query parameter.
 * Converts unstructured page data safely using predefined parsing configurations for Contact / About modes when specified.
 * Validates the user making the request possesses admin authorization.
 * @param request - The Next.js request object containing authorization headers and `slug` query parameter.
 * @returns A JSON response comprising the parsed details mapped to the requested slug or an error message.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await validateAdmin(request);
    if (!authResult.ok) return authResult.response;

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const tableResult = await resolveTableName();
    if (tableResult.error) {
      return NextResponse.json({ error: tableResult.error.message }, { status: 500 });
    }

    if (slug === CONTACT_SLUG) {
      const contactRows = await findAllBySlug(tableResult.tableName, slug);
      if (contactRows.error) {
        return NextResponse.json({ error: contactRows.error.message }, { status: 500 });
      }

      return NextResponse.json({ data: buildContactAggregate(contactRows.data) });
    }

    if (slug === ABOUT_SLUG) {
      const aboutRows = await findAllBySlug(tableResult.tableName, slug);
      if (aboutRows.error) {
        return NextResponse.json({ error: aboutRows.error.message }, { status: 500 });
      }

      return NextResponse.json({ data: buildAboutAggregate(aboutRows.data) });
    }

    const latest = await findLatestBySlug(tableResult.tableName, slug);
    if (latest.error) {
      return NextResponse.json({ error: latest.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: latest.data || null });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch business detail" },
      { status: 500 }
    );
  }
}

/**
 * Updates or creates new static page data sections (such as About, Contact, or Annoucements).
 * Determines the target dataset using the `slug` and processes partial configurations safely.
 * Logs backend action activities regarding the specific UI segments that the admin modified.
 * @param request - The Next.js incoming request possessing the authorization token and the JSON body spanning slug, title, and form-bound body elements.
 * @returns An updated representation confirming the data written to the database configurations.
 */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await validateAdmin(request);
    if (!authResult.ok) return authResult.response;
    const user = authResult.user;

    const { slug, title, body } = (await request.json()) as {
      slug?: string;
      title?: string;
      body?: string | Record<string, unknown>;
    };

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const tableResult = await resolveTableName();
    if (tableResult.error) {
      return NextResponse.json({ error: tableResult.error.message }, { status: 500 });
    }

    const tableName = tableResult.tableName;
    const now = new Date().toISOString();

    if (slug === CONTACT_SLUG || slug === ABOUT_SLUG) {
      const isContact = slug === CONTACT_SLUG;
      const updates: Array<{ label: string; value: string }> = [];

      if (body && typeof body === "object" && !Array.isArray(body)) {
        for (const [incomingKey, incomingValue] of Object.entries(body)) {
          const resolvedKey = isContact ? resolveContactKey(incomingKey) : resolveAboutKey(incomingKey);
          if (!resolvedKey) continue;

          updates.push({
            label: isContact
              ? CONTACT_LABEL_BY_KEY[resolvedKey as keyof typeof CONTACT_LABEL_BY_KEY]
              : ABOUT_LABEL_BY_KEY[resolvedKey as keyof typeof ABOUT_LABEL_BY_KEY],
            value: toText(incomingValue),
          });
        }
      } else {
        const resolvedKey = isContact ? resolveContactKey(title || "") : resolveAboutKey(title || "");
        if (!resolvedKey) {
          return NextResponse.json({ error: isContact ? "Invalid contact field title" : "Invalid about field title" }, { status: 400 });
        }

        updates.push({
          label: isContact
            ? CONTACT_LABEL_BY_KEY[resolvedKey as keyof typeof CONTACT_LABEL_BY_KEY]
            : ABOUT_LABEL_BY_KEY[resolvedKey as keyof typeof ABOUT_LABEL_BY_KEY],
          value: toText(body),
        });
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: isContact ? "No contact fields to update" : "No about fields to update" }, { status: 400 });
      }

      for (const updateItem of updates) {
        const updateResult = await businessDetailsHelper.updateDetailGeneric(
          tableName,
          { slug, title: updateItem.label },
          { body: updateItem.value, updated_at: now },
          admin
        );

        if (updateResult.error) {
          return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
        }

        if (!updateResult.data || updateResult.data.length === 0) {
          const insertResult = await businessDetailsHelper.insertDetailGeneric(
            tableName,
            { slug, title: updateItem.label, body: updateItem.value, updated_at: now },
            admin
          );

          if (insertResult.error) {
            return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
          }
        }
      }

      const changedLabels = updates.map((item) => item.label);

      await activityHelper.logActivity({
        actionType: isContact ? "edit_contact_details" : "edit_about_details",
        productId: null,
        description:
          changedLabels.length === 1
            ? `Updated ${isContact ? "contact" : "about"} detail: ${changedLabels[0]}`
            : `Updated ${isContact ? "contact" : "about"} details: ${changedLabels.join(", ")}`,
        editor: user.email || String(user.user_metadata?.username || "Unknown"),
        user_id: user.id,
        supabase: admin,
      });

      return NextResponse.json({ data: { slug, updated: updates } });
    }

    const serializedBody = toText(body);
    const latest = await findLatestBySlug(tableName, slug);
    if (latest.error) {
      return NextResponse.json({ error: latest.error.message }, { status: 500 });
    }

    if (latest.data) {
      const isAnnouncement = slug === ANNOUNCEMENT_SLUG;
      const idColumn = getRowIdColumn(latest.data);
      const criteria: Record<string, any> = idColumn && latest.data
        ? { [idColumn]: latest.data[idColumn] }
        : { slug };

      const executeUpdate = await businessDetailsHelper.updateDetailGeneric(
        tableName,
        criteria,
        { title: title || "", body: serializedBody, updated_at: now },
        admin
      );

      if (executeUpdate.error) {
        return NextResponse.json({ error: executeUpdate.error.message }, { status: 500 });
      }

      const previousTitle = toText(latest.data.title);
      const previousBody = toText(latest.data.body);
      const changedParts: string[] = [];

      if (normalizeTitle(previousTitle) !== normalizeTitle(title || "")) changedParts.push("title");
      if (previousBody !== serializedBody) changedParts.push("body");

      await activityHelper.logActivity({
        actionType: isAnnouncement ? "edit_announcement" : slug === ABOUT_SLUG ? "edit_about_details" : "edit_contact_details",
        productId: null,
        description:
          isAnnouncement
            ? "Edited announcement"
            : changedParts.length === 0
              ? `Updated ${slug} details`
              : `Updated ${slug} details: ${changedParts.join(", ")}`,
        editor: user.email || String(user.user_metadata?.username || "Unknown"),
        user_id: user.id,
        supabase: admin,
      });

      const refreshed = await findLatestBySlug(tableName, slug);
      if (refreshed.error) {
        return NextResponse.json({ error: refreshed.error.message }, { status: 500 });
      }

      return NextResponse.json({ data: refreshed.data || null });
    }

    const insertResult = await businessDetailsHelper.insertDetailGeneric(
      tableName,
      { slug, title: title || "", body: serializedBody, updated_at: now },
      admin
    );

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    const insertedData = insertResult.data?.[0] || insertResult.data || null;

    await activityHelper.logActivity({
      actionType: slug === ANNOUNCEMENT_SLUG ? "edit_announcement" : slug === ABOUT_SLUG ? "edit_about_details" : "edit_contact_details",
      productId: null,
      description:
        slug === ANNOUNCEMENT_SLUG
          ? "Edited announcement"
          : slug === ABOUT_SLUG
            ? "Created about details"
            : "Created contact details",
      editor: user.email || String(user.user_metadata?.username || "Unknown"),
      user_id: user.id,
      supabase: admin,
    });

    return NextResponse.json({ data: insertedData }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save business detail" },
      { status: 500 }
    );
  }
}
