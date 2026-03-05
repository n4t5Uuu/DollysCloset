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

export type ContactFieldConfig = {
    key: ContactFieldKey;
    label: string;
    type: "input" | "textarea";
    minHeightClassName?: string;
};

export type AboutFieldKey =
| "aboutBody"
| "historyBody"
| "question1"
| "answer1"
| "question2"
| "answer2"
| "question3"
| "answer3"
| "question4"
| "answer4"
| "question5"
| "answer5"
| "question6"
| "answer6"
| "question7"
| "answer7"
| "question8"
| "answer8";

export type AboutDetailsPayload = Record<AboutFieldKey, string>;

export type AboutFieldConfig = {
  key: AboutFieldKey;
  label: string;
  type: "input" | "textarea";
  minHeightClassName?: string;
};

export type BusinessDetailsRowLike = {
  title?: string | null;
  body?: string | null;
};

import { NextResponse } from "next/server";

export type BusinessDetailsRow = {
  slug?: string | null;
  title?: string | null;
  body?: string | null;
  updated_at?: string | null;
  business_details_id?: number | string | null;
  business_deta?: number | string | null;
};

export type AdminValidationSuccess = {
  ok: true;
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
};

export type AdminValidationFailure = {
  ok: false;
  response: NextResponse;
};

export type AdminValidationResult = AdminValidationSuccess | AdminValidationFailure;
