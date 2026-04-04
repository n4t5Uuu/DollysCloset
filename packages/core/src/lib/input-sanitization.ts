import type {
  AboutDetailsPayload,
  AboutFieldKey,
  ContactDetailsPayload,
  ContactFieldKey,
} from "../types/business-details.types";

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const schemaExactLimits = {
  activityActionType: 50,
  activityDescription: 255,
  categoryName: 50,
  categoryDescription: 255,
  productName: 100,
  productBrand: 50,
  productCondition: 20,
  productSizeLabel: 30,
  userUsername: 50,
  userFirstName: 50,
  userLastName: 50,
} as const;

export const uiContentLimits = {
  productDescription: { maxLength: 500, recommendedLength: "200-320" },
  contactUsSubject: { maxLength: 100, recommendedLength: "40-80" },
  contactUsMessage: { maxLength: 1000, recommendedLength: "300-700" },
  announcement: { maxLength: 160, recommendedLength: "60-120" },
  contactIntroText: { maxLength: 220, recommendedLength: "90-180" },
  contactAddress: { maxLength: 140, recommendedLength: "60-110" },
  aboutBody: { maxLength: 900, recommendedLength: "350-700" },
  historyBody: { maxLength: 900, recommendedLength: "350-700" },
  faqQuestion: { maxLength: 90, recommendedLength: "35-70" },
  faqAnswer: { maxLength: 280, recommendedLength: "80-220" },
  publicLabel: { maxLength: 50 },
  publicLink: { maxLength: 255 },
  email: { maxLength: 320 },
} as const;

export const contactFieldLimits: Record<
  ContactFieldKey,
  { maxLength: number; multiline: boolean; recommendedLength?: string }
> = {
  introText: {
    maxLength: uiContentLimits.contactIntroText.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.contactIntroText.recommendedLength,
  },
  facebookName: { maxLength: uiContentLimits.publicLabel.maxLength, multiline: false },
  facebookLink: { maxLength: uiContentLimits.publicLink.maxLength, multiline: false },
  instagramHandle: { maxLength: uiContentLimits.publicLabel.maxLength, multiline: false },
  instagramLink: { maxLength: uiContentLimits.publicLink.maxLength, multiline: false },
  viberName: { maxLength: uiContentLimits.publicLabel.maxLength, multiline: false },
  viberLink: { maxLength: uiContentLimits.publicLink.maxLength, multiline: false },
  contactNumberDisplay: { maxLength: uiContentLimits.publicLabel.maxLength, multiline: false },
  contactNumberLink: { maxLength: uiContentLimits.publicLabel.maxLength, multiline: false },
  address: {
    maxLength: uiContentLimits.contactAddress.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.contactAddress.recommendedLength,
  },
  weekdaysHours: { maxLength: uiContentLimits.publicLabel.maxLength, multiline: false },
  weekendHours: { maxLength: uiContentLimits.publicLabel.maxLength, multiline: false },
};

export const aboutFieldLimits: Record<
  AboutFieldKey,
  { maxLength: number; multiline: boolean; recommendedLength?: string }
> = {
  aboutBody: {
    maxLength: uiContentLimits.aboutBody.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.aboutBody.recommendedLength,
  },
  historyBody: {
    maxLength: uiContentLimits.historyBody.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.historyBody.recommendedLength,
  },
  question1: {
    maxLength: uiContentLimits.faqQuestion.maxLength,
    multiline: false,
    recommendedLength: uiContentLimits.faqQuestion.recommendedLength,
  },
  answer1: {
    maxLength: uiContentLimits.faqAnswer.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.faqAnswer.recommendedLength,
  },
  question2: {
    maxLength: uiContentLimits.faqQuestion.maxLength,
    multiline: false,
    recommendedLength: uiContentLimits.faqQuestion.recommendedLength,
  },
  answer2: {
    maxLength: uiContentLimits.faqAnswer.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.faqAnswer.recommendedLength,
  },
  question3: {
    maxLength: uiContentLimits.faqQuestion.maxLength,
    multiline: false,
    recommendedLength: uiContentLimits.faqQuestion.recommendedLength,
  },
  answer3: {
    maxLength: uiContentLimits.faqAnswer.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.faqAnswer.recommendedLength,
  },
  question4: {
    maxLength: uiContentLimits.faqQuestion.maxLength,
    multiline: false,
    recommendedLength: uiContentLimits.faqQuestion.recommendedLength,
  },
  answer4: {
    maxLength: uiContentLimits.faqAnswer.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.faqAnswer.recommendedLength,
  },
  question5: {
    maxLength: uiContentLimits.faqQuestion.maxLength,
    multiline: false,
    recommendedLength: uiContentLimits.faqQuestion.recommendedLength,
  },
  answer5: {
    maxLength: uiContentLimits.faqAnswer.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.faqAnswer.recommendedLength,
  },
  question6: {
    maxLength: uiContentLimits.faqQuestion.maxLength,
    multiline: false,
    recommendedLength: uiContentLimits.faqQuestion.recommendedLength,
  },
  answer6: {
    maxLength: uiContentLimits.faqAnswer.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.faqAnswer.recommendedLength,
  },
  question7: {
    maxLength: uiContentLimits.faqQuestion.maxLength,
    multiline: false,
    recommendedLength: uiContentLimits.faqQuestion.recommendedLength,
  },
  answer7: {
    maxLength: uiContentLimits.faqAnswer.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.faqAnswer.recommendedLength,
  },
  question8: {
    maxLength: uiContentLimits.faqQuestion.maxLength,
    multiline: false,
    recommendedLength: uiContentLimits.faqQuestion.recommendedLength,
  },
  answer8: {
    maxLength: uiContentLimits.faqAnswer.maxLength,
    multiline: true,
    recommendedLength: uiContentLimits.faqAnswer.recommendedLength,
  },
};

function stripControlCharacters(value: string) {
  return value.replace(CONTROL_CHARACTERS, "");
}

function coerceText(value: unknown) {
  return String(value ?? "");
}

function normalizeSingleLineInput(value: string) {
  return stripControlCharacters(value).replace(/[\r\n\t]+/g, " ");
}

function normalizeMultilineInput(value: string) {
  return stripControlCharacters(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

export function sanitizeSingleLineInput(value: unknown, maxLength = 255) {
  return normalizeSingleLineInput(coerceText(value)).slice(0, maxLength);
}

export function sanitizeMultilineInput(value: unknown, maxLength = 4000) {
  return normalizeMultilineInput(coerceText(value)).slice(0, maxLength);
}

export function sanitizeSingleLineText(value: unknown, maxLength = 255) {
  const text = normalizeSingleLineInput(coerceText(value))
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, maxLength);
}

export function sanitizeMultilineText(value: unknown, maxLength = 4000) {
  const text = normalizeMultilineInput(coerceText(value))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text.slice(0, maxLength);
}

export function sanitizeEmailInput(value: unknown) {
  return sanitizeSingleLineInput(value, uiContentLimits.email.maxLength);
}

export function sanitizeEmail(value: unknown) {
  return sanitizeSingleLineText(value, uiContentLimits.email.maxLength).toLowerCase();
}

export function getRemainingCharacters(value: string, maxLength: number) {
  return Math.max(0, maxLength - value.length);
}

export function sanitizeAnnouncementInput(value: unknown) {
  return sanitizeMultilineInput(value, uiContentLimits.announcement.maxLength);
}

export function sanitizeAnnouncementText(value: unknown) {
  return sanitizeMultilineText(value, uiContentLimits.announcement.maxLength);
}

export function sanitizeContactDetailInput(fieldKey: ContactFieldKey, value: unknown) {
  const config = contactFieldLimits[fieldKey];
  return config.multiline
    ? sanitizeMultilineInput(value, config.maxLength)
    : sanitizeSingleLineInput(value, config.maxLength);
}

export function sanitizeContactDetailText(fieldKey: ContactFieldKey, value: unknown) {
  const config = contactFieldLimits[fieldKey];
  return config.multiline
    ? sanitizeMultilineText(value, config.maxLength)
    : sanitizeSingleLineText(value, config.maxLength);
}

export function sanitizeAboutDetailInput(fieldKey: AboutFieldKey, value: unknown) {
  const config = aboutFieldLimits[fieldKey];
  return config.multiline
    ? sanitizeMultilineInput(value, config.maxLength)
    : sanitizeSingleLineInput(value, config.maxLength);
}

export function sanitizeAboutDetailText(fieldKey: AboutFieldKey, value: unknown) {
  const config = aboutFieldLimits[fieldKey];
  return config.multiline
    ? sanitizeMultilineText(value, config.maxLength)
    : sanitizeSingleLineText(value, config.maxLength);
}

export function sanitizeContactDetailsPayload(
  payload: Partial<ContactDetailsPayload> | null | undefined
): ContactDetailsPayload {
  return {
    introText: sanitizeContactDetailText("introText", payload?.introText),
    facebookName: sanitizeContactDetailText("facebookName", payload?.facebookName),
    facebookLink: sanitizeContactDetailText("facebookLink", payload?.facebookLink),
    instagramHandle: sanitizeContactDetailText("instagramHandle", payload?.instagramHandle),
    instagramLink: sanitizeContactDetailText("instagramLink", payload?.instagramLink),
    viberName: sanitizeContactDetailText("viberName", payload?.viberName),
    viberLink: sanitizeContactDetailText("viberLink", payload?.viberLink),
    contactNumberDisplay: sanitizeContactDetailText("contactNumberDisplay", payload?.contactNumberDisplay),
    contactNumberLink: sanitizeContactDetailText("contactNumberLink", payload?.contactNumberLink),
    address: sanitizeContactDetailText("address", payload?.address),
    weekdaysHours: sanitizeContactDetailText("weekdaysHours", payload?.weekdaysHours),
    weekendHours: sanitizeContactDetailText("weekendHours", payload?.weekendHours),
  };
}

export function sanitizeAboutDetailsPayload(
  payload: Partial<AboutDetailsPayload> | null | undefined
): AboutDetailsPayload {
  return {
    aboutBody: sanitizeAboutDetailText("aboutBody", payload?.aboutBody),
    historyBody: sanitizeAboutDetailText("historyBody", payload?.historyBody),
    question1: sanitizeAboutDetailText("question1", payload?.question1),
    answer1: sanitizeAboutDetailText("answer1", payload?.answer1),
    question2: sanitizeAboutDetailText("question2", payload?.question2),
    answer2: sanitizeAboutDetailText("answer2", payload?.answer2),
    question3: sanitizeAboutDetailText("question3", payload?.question3),
    answer3: sanitizeAboutDetailText("answer3", payload?.answer3),
    question4: sanitizeAboutDetailText("question4", payload?.question4),
    answer4: sanitizeAboutDetailText("answer4", payload?.answer4),
    question5: sanitizeAboutDetailText("question5", payload?.question5),
    answer5: sanitizeAboutDetailText("answer5", payload?.answer5),
    question6: sanitizeAboutDetailText("question6", payload?.question6),
    answer6: sanitizeAboutDetailText("answer6", payload?.answer6),
    question7: sanitizeAboutDetailText("question7", payload?.question7),
    answer7: sanitizeAboutDetailText("answer7", payload?.answer7),
    question8: sanitizeAboutDetailText("question8", payload?.question8),
    answer8: sanitizeAboutDetailText("answer8", payload?.answer8),
  };
}

export function parseNonNegativeInteger(value: unknown) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parseNonNegativeNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
