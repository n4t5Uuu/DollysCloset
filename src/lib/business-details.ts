export const CONTACT_SLUG = "contact";
export const ABOUT_SLUG = "about";

export type ContactFieldKey =
  | "introText"
  | "facebookName"
  | "facebookLink"
  | "instagramHandle"
  | "instagramLink"
  | "viberName"
  | "viberLink"
  | "contactNumberDisplay"
  | "contactNumberLink"
  | "address"
  | "weekdaysHours"
  | "weekendHours";

export type ContactDetailsPayload = Record<ContactFieldKey, string>;

export const CONTACT_LABEL_BY_KEY: Record<ContactFieldKey, string> = {
  introText: "Intro Text",
  facebookName: "Facebook Name",
  facebookLink: "Facebook Link",
  instagramHandle: "Instagram Handle",
  instagramLink: "Instagram Link",
  viberName: "Viber Name",
  viberLink: "Viber Link",
  contactNumberDisplay: "Contact Number",
  contactNumberLink: "Contact Number Link",
  address: "Address",
  weekdaysHours: "Mon - Fri Schedule",
  weekendHours: "Weekends Schedule",
};

export const defaultContactDetails: ContactDetailsPayload = {
  introText: "We would love to hear from you! Whether you have a question about our collection, need assistance, or just want to say hello.",
  facebookName: "Dolly's Closet",
  facebookLink: "#",
  instagramHandle: "@dollyscloset",
  instagramLink: "#",
  viberName: "Shierly Gonzales",
  viberLink: "#",
  contactNumberDisplay: "+63 912 1234 123",
  contactNumberLink: "tel:+639121234123",
  address: "04 Admiral, Talon Tres, Las Piñas City",
  weekdaysHours: "9:00 AM - 6:00 PM",
  weekendHours: "10:00 AM - 5:00 PM",
};

export type ContactFieldConfig = {
  key: ContactFieldKey;
  label: string;
  type: "input" | "textarea";
  minHeightClassName?: string;
};

export const CONTACT_FIELD_CONFIG: ContactFieldConfig[] = [
  { key: "facebookName", label: CONTACT_LABEL_BY_KEY.facebookName, type: "input" },
  { key: "facebookLink", label: CONTACT_LABEL_BY_KEY.facebookLink, type: "input" },
  { key: "instagramHandle", label: CONTACT_LABEL_BY_KEY.instagramHandle, type: "input" },
  { key: "instagramLink", label: CONTACT_LABEL_BY_KEY.instagramLink, type: "input" },
  { key: "viberName", label: CONTACT_LABEL_BY_KEY.viberName, type: "input" },
  { key: "viberLink", label: CONTACT_LABEL_BY_KEY.viberLink, type: "input" },
  { key: "contactNumberDisplay", label: CONTACT_LABEL_BY_KEY.contactNumberDisplay, type: "input" },
  { key: "contactNumberLink", label: CONTACT_LABEL_BY_KEY.contactNumberLink, type: "input" },
  { key: "weekdaysHours", label: CONTACT_LABEL_BY_KEY.weekdaysHours, type: "input" },
  { key: "weekendHours", label: CONTACT_LABEL_BY_KEY.weekendHours, type: "input" },
  { key: "address", label: CONTACT_LABEL_BY_KEY.address, type: "textarea", minHeightClassName: "min-h-[90px]" },
];

export type BusinessDetailsRowLike = {
  title?: string | null;
  body?: string | null;
};

export function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

export function toText(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

export function resolveContactKey(value: string): ContactFieldKey | null {
  const normalized = normalizeTitle(value);

  for (const [key, label] of Object.entries(CONTACT_LABEL_BY_KEY) as Array<[ContactFieldKey, string]>) {
    if (normalized === normalizeTitle(key) || normalized === normalizeTitle(label)) {
      return key;
    }
  }

  return null;
}

export function parseContactBody(rawBody: unknown): ContactDetailsPayload {
  if (!rawBody) {
    return defaultContactDetails;
  }

  if (typeof rawBody === "object") {
    return {
      ...defaultContactDetails,
      ...(rawBody as Partial<ContactDetailsPayload>),
    };
  }

  if (typeof rawBody !== "string") {
    return defaultContactDetails;
  }

  try {
    const parsed = JSON.parse(rawBody) as Partial<ContactDetailsPayload>;
    return {
      ...defaultContactDetails,
      ...parsed,
    };
  } catch {
    return defaultContactDetails;
  }
}

export function buildContactAggregate(rows: BusinessDetailsRowLike[]) {
  const body: Partial<ContactDetailsPayload> = {};
  const capturedKeys = new Set<ContactFieldKey>();
  let title = "Get In Touch";

  for (const row of rows) {
    const rowTitle = toText(row.title);
    const rowBody = toText(row.body);
    const key = resolveContactKey(rowTitle);

    if (key && !capturedKeys.has(key)) {
      body[key] = rowBody;
      capturedKeys.add(key);
      continue;
    }

    try {
      const parsed = JSON.parse(rowBody) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const keyName of Object.keys(CONTACT_LABEL_BY_KEY) as ContactFieldKey[]) {
          if (!capturedKeys.has(keyName) && parsed[keyName] !== undefined && parsed[keyName] !== null) {
            body[keyName] = toText(parsed[keyName]);
            capturedKeys.add(keyName);
          }
        }

        if (typeof parsed.pageTitle === "string" && parsed.pageTitle.trim()) {
          title = parsed.pageTitle;
        }
      }
    } catch {
    }

    if (normalizeTitle(rowTitle) === "page title" && rowBody.trim()) {
      title = rowBody;
    }
  }

  return {
    slug: CONTACT_SLUG,
    title,
    body: {
      ...defaultContactDetails,
      ...body,
    },
  };
}
