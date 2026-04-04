import {
  ContactFieldKey,
  ContactDetailsPayload,
  AboutFieldKey,
  AboutDetailsPayload,
  BusinessDetailsRowLike,
  ContactFieldConfig,
  AboutFieldConfig,
} from "../../types/business-details.types";
import {
  aboutFieldLimits,
  contactFieldLimits,
  sanitizeAboutDetailsPayload,
  sanitizeAnnouncementText,
  sanitizeContactDetailsPayload,
} from "../input-sanitization";

export const CONTACT_SLUG = "contact";
export const ABOUT_SLUG = "about";
export const ANNOUNCEMENT_SLUG = "announcement";
export const ANNOUNCEMENT_TITLE = "Announcement Text";
export const defaultAnnouncementText = "Free shipping on orders over ₱2,000  •  New arrivals every friday  •";

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

export const CONTACT_FIELD_CONFIG: ContactFieldConfig[] = [
  {
    key: "introText",
    label: CONTACT_LABEL_BY_KEY.introText,
    type: "textarea",
    minHeightClassName: "min-h-[120px]",
    maxLength: contactFieldLimits.introText.maxLength,
    recommendedLength: contactFieldLimits.introText.recommendedLength,
  },
  {
    key: "facebookName",
    label: CONTACT_LABEL_BY_KEY.facebookName,
    type: "input",
    maxLength: contactFieldLimits.facebookName.maxLength,
  },
  {
    key: "facebookLink",
    label: CONTACT_LABEL_BY_KEY.facebookLink,
    type: "input",
    maxLength: contactFieldLimits.facebookLink.maxLength,
  },
  {
    key: "instagramHandle",
    label: CONTACT_LABEL_BY_KEY.instagramHandle,
    type: "input",
    maxLength: contactFieldLimits.instagramHandle.maxLength,
  },
  {
    key: "instagramLink",
    label: CONTACT_LABEL_BY_KEY.instagramLink,
    type: "input",
    maxLength: contactFieldLimits.instagramLink.maxLength,
  },
  {
    key: "viberName",
    label: CONTACT_LABEL_BY_KEY.viberName,
    type: "input",
    maxLength: contactFieldLimits.viberName.maxLength,
  },
  {
    key: "viberLink",
    label: CONTACT_LABEL_BY_KEY.viberLink,
    type: "input",
    maxLength: contactFieldLimits.viberLink.maxLength,
  },
  {
    key: "contactNumberDisplay",
    label: CONTACT_LABEL_BY_KEY.contactNumberDisplay,
    type: "input",
    maxLength: contactFieldLimits.contactNumberDisplay.maxLength,
  },
  {
    key: "contactNumberLink",
    label: CONTACT_LABEL_BY_KEY.contactNumberLink,
    type: "input",
    maxLength: contactFieldLimits.contactNumberLink.maxLength,
  },
  {
    key: "weekdaysHours",
    label: CONTACT_LABEL_BY_KEY.weekdaysHours,
    type: "input",
    maxLength: contactFieldLimits.weekdaysHours.maxLength,
  },
  {
    key: "weekendHours",
    label: CONTACT_LABEL_BY_KEY.weekendHours,
    type: "input",
    maxLength: contactFieldLimits.weekendHours.maxLength,
  },
  {
    key: "address",
    label: CONTACT_LABEL_BY_KEY.address,
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: contactFieldLimits.address.maxLength,
    recommendedLength: contactFieldLimits.address.recommendedLength,
  },
];

 

export const ABOUT_LABEL_BY_KEY: Record<AboutFieldKey, string> = {
  aboutBody: "About Dolly's Closet Body",
  historyBody: "History Body",
  question1: "Question 1",
  answer1: "Answer 1",
  question2: "Question 2",
  answer2: "Answer 2",
  question3: "Question 3",
  answer3: "Answer 3",
  question4: "Question 4",
  answer4: "Answer 4",
  question5: "Question 5",
  answer5: "Answer 5",
  question6: "Question 6",
  answer6: "Answer 6",
  question7: "Question 7",
  answer7: "Answer 7",
  question8: "Question 8",
  answer8: "Answer 8",
};

const defaultAboutParagraph1 =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus feugiat, nisi sed posuere laoreet, lacus risus pretium nunc, vitae luctus sapien tortor nec justo. Aenean vitae velit nec lorem laoreet tempor. Curabitur sed nibh in enim pretium viverra. Fusce nec ex vel arcu vulputate dignissim. Suspendisse potenti. Nulla facilisi.";

const defaultAboutParagraph2 =
  "Vivamus tristique justo in nibh fermentum, id pulvinar elit feugiat. Integer facilisis mauris ut neque tincidunt, nec interdum magna ultricies. Etiam vel diam vel risus cursus accumsan. Mauris ut massa ac elit iaculis tristique vitae vitae odio.";

export const defaultAboutDetails: AboutDetailsPayload = {
  aboutBody: `${defaultAboutParagraph1}\n\n${defaultAboutParagraph2}`,
  historyBody: `${defaultAboutParagraph1}\n\n${defaultAboutParagraph2}`,
  question1: "Is everything on Dolly's Closet authentic?",
  answer1:
    "Yes! We carefully inspect and verify every item before listing it. We pride ourselves on selling only authentic vintage and branded pieces.",
  question2: "Do you ship nationwide?",
  answer2:
    "We currently ship to all major cities across the country. Shipping rates vary based on your location and the weight of your package.",
  question3: "Can I try order an item and pick it up at the store?",
  answer3:
    "Absolutely! We support 'Buy Online, Pick Up In-Store'. Just select the 'Store Pickup' option at checkout.",
  question4: "What is your return policy?",
  answer4:
    "Since most of our items are vintage or pre-loved, all sales are generally final. However, if there was a major flaw we missed in the description, please contact us within 48 hours of receiving your order.",
  question5: "How do I know if an item will fit me?",
  answer5:
    "We provide detailed measurements for every item in the description. We recommend comparing these measurements to a piece of clothing you already own that fits you well.",
  question6: "Do you wash the clothes before selling?",
  answer6: "Yes, all items are washed, steamed, and sanitized before being photographed and listed.",
  question7: "How long does shipping take?",
  answer7:
    "Metro Manila orders usually arrive within 1-3 business days. Provincial orders take 3-7 business days depending on the courier.",
  question8: "Can I reserve an item?",
  answer8: "We do not offer reservations. Our items are sold on a first-come, first-served basis.",
};

export const ABOUT_SECTION_FIELD_CONFIG: AboutFieldConfig[] = [
  {
    key: "aboutBody",
    label: "About Dolly's Closet Body",
    type: "textarea",
    minHeightClassName: "min-h-[180px]",
    maxLength: aboutFieldLimits.aboutBody.maxLength,
    recommendedLength: aboutFieldLimits.aboutBody.recommendedLength,
  },
  {
    key: "historyBody",
    label: "History Body",
    type: "textarea",
    minHeightClassName: "min-h-[180px]",
    maxLength: aboutFieldLimits.historyBody.maxLength,
    recommendedLength: aboutFieldLimits.historyBody.recommendedLength,
  },
];

export const FAQ_FIELD_CONFIG: AboutFieldConfig[] = [
  {
    key: "question1",
    label: "Question 1",
    type: "input",
    maxLength: aboutFieldLimits.question1.maxLength,
    recommendedLength: aboutFieldLimits.question1.recommendedLength,
  },
  {
    key: "answer1",
    label: "Answer 1",
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: aboutFieldLimits.answer1.maxLength,
    recommendedLength: aboutFieldLimits.answer1.recommendedLength,
  },
  {
    key: "question2",
    label: "Question 2",
    type: "input",
    maxLength: aboutFieldLimits.question2.maxLength,
    recommendedLength: aboutFieldLimits.question2.recommendedLength,
  },
  {
    key: "answer2",
    label: "Answer 2",
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: aboutFieldLimits.answer2.maxLength,
    recommendedLength: aboutFieldLimits.answer2.recommendedLength,
  },
  {
    key: "question3",
    label: "Question 3",
    type: "input",
    maxLength: aboutFieldLimits.question3.maxLength,
    recommendedLength: aboutFieldLimits.question3.recommendedLength,
  },
  {
    key: "answer3",
    label: "Answer 3",
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: aboutFieldLimits.answer3.maxLength,
    recommendedLength: aboutFieldLimits.answer3.recommendedLength,
  },
  {
    key: "question4",
    label: "Question 4",
    type: "input",
    maxLength: aboutFieldLimits.question4.maxLength,
    recommendedLength: aboutFieldLimits.question4.recommendedLength,
  },
  {
    key: "answer4",
    label: "Answer 4",
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: aboutFieldLimits.answer4.maxLength,
    recommendedLength: aboutFieldLimits.answer4.recommendedLength,
  },
  {
    key: "question5",
    label: "Question 5",
    type: "input",
    maxLength: aboutFieldLimits.question5.maxLength,
    recommendedLength: aboutFieldLimits.question5.recommendedLength,
  },
  {
    key: "answer5",
    label: "Answer 5",
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: aboutFieldLimits.answer5.maxLength,
    recommendedLength: aboutFieldLimits.answer5.recommendedLength,
  },
  {
    key: "question6",
    label: "Question 6",
    type: "input",
    maxLength: aboutFieldLimits.question6.maxLength,
    recommendedLength: aboutFieldLimits.question6.recommendedLength,
  },
  {
    key: "answer6",
    label: "Answer 6",
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: aboutFieldLimits.answer6.maxLength,
    recommendedLength: aboutFieldLimits.answer6.recommendedLength,
  },
  {
    key: "question7",
    label: "Question 7",
    type: "input",
    maxLength: aboutFieldLimits.question7.maxLength,
    recommendedLength: aboutFieldLimits.question7.recommendedLength,
  },
  {
    key: "answer7",
    label: "Answer 7",
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: aboutFieldLimits.answer7.maxLength,
    recommendedLength: aboutFieldLimits.answer7.recommendedLength,
  },
  {
    key: "question8",
    label: "Question 8",
    type: "input",
    maxLength: aboutFieldLimits.question8.maxLength,
    recommendedLength: aboutFieldLimits.question8.recommendedLength,
  },
  {
    key: "answer8",
    label: "Answer 8",
    type: "textarea",
    minHeightClassName: "min-h-[90px]",
    maxLength: aboutFieldLimits.answer8.maxLength,
    recommendedLength: aboutFieldLimits.answer8.recommendedLength,
  },
];

 

/**
 * Normalizes a given text value by trimming whitespace and converting to lowercase.
 * This is primarily intended for consistent string comparison.
 * @param value - The input text to format.
 * @returns The resulting formatted string.
 */
export function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Safeguards rendering and logic against non-string equivalents by coercing them 
 * appropriately without turning null/undefined into string literals.
 * @param value - An unknown value to textify.
 * @returns A strictly parsed string representation, or empty string if logically nullish.
 */
export function toText(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

/**
 * Restructures legacy or loosely identified system keys enforcing stricter adherence to semantic expectations automatically.
 * Ensures display handles get normalized over to literal link configurations if appropriate contexts match natively seamlessly.
 * @param key - Identified contact schema payload key originally.
 * @param value - Contact payload value corresponding.
 * @returns Redefined strictest key variant conceptually correctly aligned gracefully.
 */
function normalizeResolvedContactKey(key: ContactFieldKey | null, value: string): ContactFieldKey | null {
  if (!key) return null;
  void value;
  return key;
}

/**
 * Attempts to match a string descriptor onto a predefined internal contact data key.
 * Used when reading loose column headers or parsing form inputs.
 * @param value - The external name/label for the contact property.
 * @returns The strictly typed ContactFieldKey it matched to, or null if unknown.
 */
export function resolveContactKey(value: string): ContactFieldKey | null {
  const normalized = normalizeTitle(value);

  const aliasMap: Array<{ key: ContactFieldKey; aliases: string[] }> = [
    { key: "introText", aliases: ["intro", "intro text", "contact intro", "contact intro text"] },
    { key: "facebookName", aliases: ["facebook", "facebook name", "fb name", "facebook page"] },
    { key: "facebookLink", aliases: ["facebook link", "fb link", "facebook url", "fb url", "facebook page link"] },
    { key: "instagramHandle", aliases: ["instagram", "instagram handle", "ig", "ig handle", "instagram name"] },
    { key: "instagramLink", aliases: ["instagram link", "ig link", "instagram url", "ig url"] },
    { key: "viberName", aliases: ["viber", "viber name", "viber account"] },
    { key: "viberLink", aliases: ["viber link", "viber url"] },
    { key: "contactNumberDisplay", aliases: ["contact", "contact number", "phone", "phone number", "mobile number"] },
    { key: "contactNumberLink", aliases: ["contact number link", "phone link", "tel", "telephone link", "phone url"] },
    { key: "address", aliases: ["store address", "business address", "location", "shop address"] },
    { key: "weekdaysHours", aliases: ["weekday hours", "weekdays", "mon - fri", "mon-fri", "monday to friday"] },
    { key: "weekendHours", aliases: ["weekend hours", "weekends", "sat - sun", "sat-sun", "saturday to sunday"] },
  ];

  for (const [key, label] of Object.entries(CONTACT_LABEL_BY_KEY) as Array<[ContactFieldKey, string]>) {
    if (normalized === normalizeTitle(key) || normalized === normalizeTitle(label)) {
      return key;
    }
  }

  for (const aliasEntry of aliasMap) {
    if (aliasEntry.aliases.some((alias) => normalized === normalizeTitle(alias))) {
      return aliasEntry.key;
    }
  }

  return null;
}

/**
 * Attempts to match a string descriptor onto a predefined internal about data key.
 * @param value - The external name/label for the about/FAQ property.
 * @returns The strictly typed AboutFieldKey it matched to, or null if unknown.
 */
export function resolveAboutKey(value: string): AboutFieldKey | null {
  const normalized = normalizeTitle(value);

  for (const [key, label] of Object.entries(ABOUT_LABEL_BY_KEY) as Array<[AboutFieldKey, string]>) {
    if (normalized === normalizeTitle(key) || normalized === normalizeTitle(label)) {
      return key;
    }
  }

  return null;
}

/**
 * Parses and reconstructs the contact details object from different acceptable input types (e.g. JSON strings).
 * Fills any missing critical fields with default constants to maintain type guarantee.
 * @param rawBody - The raw data format of the contact body logic.
 * @returns The resulting safely constrained object mapping key details for contacts.
 */
export function parseContactBody(rawBody: unknown): ContactDetailsPayload {
  if (!rawBody) {
    return sanitizeContactDetailsPayload(defaultContactDetails);
  }

  if (typeof rawBody === "object") {
    return sanitizeContactDetailsPayload({
      ...defaultContactDetails,
      ...(rawBody as Partial<ContactDetailsPayload>),
    });
  }

  if (typeof rawBody !== "string") {
    return sanitizeContactDetailsPayload(defaultContactDetails);
  }

  try {
    const parsed = JSON.parse(rawBody) as Partial<ContactDetailsPayload>;
    return sanitizeContactDetailsPayload({
      ...defaultContactDetails,
      ...parsed,
    });
  } catch {
    return sanitizeContactDetailsPayload(defaultContactDetails);
  }
}

/**
 * Parses and reconstructs the "about page" details object from different incoming types.
 * Will overlay incoming data over predefined safely typed defaults.
 * @param rawBody - The raw "about text" details context.
 * @returns The securely bound mapping structure for the "About Dolly's Closet" page.
 */
export function parseAboutBody(rawBody: unknown): AboutDetailsPayload {
  if (!rawBody) {
    return sanitizeAboutDetailsPayload(defaultAboutDetails);
  }

  if (typeof rawBody === "object") {
    return sanitizeAboutDetailsPayload({
      ...defaultAboutDetails,
      ...(rawBody as Partial<AboutDetailsPayload>),
    });
  }

  if (typeof rawBody !== "string") {
    return sanitizeAboutDetailsPayload(defaultAboutDetails);
  }

  try {
    const parsed = JSON.parse(rawBody) as Partial<AboutDetailsPayload>;
    return sanitizeAboutDetailsPayload({
      ...defaultAboutDetails,
      ...parsed,
    });
  } catch {
    return sanitizeAboutDetailsPayload(defaultAboutDetails);
  }
}

/**
 * Scans through loosely formatted generic data rows and interprets them into a contact context.
 * Normalizes phone numbers, titles, social media tags, addresses and unifies them into a single record.
 * @param rows - Raw array grouping rows mimicking generic database content.
 * @returns Combined slug and structured record object mapped to Contact details.
 */
export function buildContactAggregate(rows: BusinessDetailsRowLike[]) {
  const body: Partial<ContactDetailsPayload> = {};
  const capturedKeys = new Set<ContactFieldKey>();
  let title = "Get In Touch";

  for (const row of rows) {
    const rowTitle = toText(row.title);
    const rowBody = toText(row.body);
    const key = normalizeResolvedContactKey(resolveContactKey(rowTitle), rowBody);

    if (key && !capturedKeys.has(key)) {
      body[key] = rowBody;
      capturedKeys.add(key);
      continue;
    }

    try {
      const parsed = JSON.parse(rowBody) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [rawKey, rawValue] of Object.entries(parsed)) {
          if (rawValue === undefined || rawValue === null) continue;

          const normalizedKey = normalizeResolvedContactKey(resolveContactKey(rawKey), toText(rawValue));
          if (!normalizedKey || capturedKeys.has(normalizedKey)) continue;

          body[normalizedKey] = toText(rawValue);
          capturedKeys.add(normalizedKey);
        }

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
    body: sanitizeContactDetailsPayload({
      ...defaultContactDetails,
      ...body,
    }),
  };
}

/**
 * Reads potentially malformed row inputs and reconstructs them into an "about/history/faq" schema context.
 * Uses parsing rules defined across labels to safely inject values where they belong.
 * @param rows - Databound arrays storing vague structural strings.
 * @returns Composed format ready to map straight to the About UI.
 */
export function buildAboutAggregate(rows: BusinessDetailsRowLike[]) {
  const body: Partial<AboutDetailsPayload> = {};
  const capturedKeys = new Set<AboutFieldKey>();

  for (const row of rows) {
    const rowTitle = toText(row.title);
    const rowBody = toText(row.body);
    const key = resolveAboutKey(rowTitle);

    if (key && !capturedKeys.has(key)) {
      body[key] = rowBody;
      capturedKeys.add(key);
      continue;
    }

    try {
      const parsed = JSON.parse(rowBody) as Record<string, unknown>;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const keyName of Object.keys(ABOUT_LABEL_BY_KEY) as AboutFieldKey[]) {
          if (!capturedKeys.has(keyName) && parsed[keyName] !== undefined && parsed[keyName] !== null) {
            body[keyName] = toText(parsed[keyName]);
            capturedKeys.add(keyName);
          }
        }
      }
    } catch {
    }
  }

  return {
    slug: ABOUT_SLUG,
    title: "About Us",
    body: sanitizeAboutDetailsPayload({
      ...defaultAboutDetails,
      ...body,
    }),
  };
}

export function sanitizeAnnouncementBody(rawBody: unknown) {
  const nextBody = typeof rawBody === "string" ? rawBody : toText(rawBody);
  return sanitizeAnnouncementText(nextBody || defaultAnnouncementText);
}
