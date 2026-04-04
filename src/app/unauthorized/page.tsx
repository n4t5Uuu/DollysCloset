import type { Metadata } from "next";
import DynamicError from "@/components/general-components/DynamicError";
import { getAuthReasonCopy, readSearchParam } from "@/lib/auth/auth-routing";

export const metadata: Metadata = {
  title: "Wait, Something's Wrong",
  description: "You do not have the required permissions to access this specific area of Dolly's Closet.",
};

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reason = readSearchParam(params.reason);
  const copy = getAuthReasonCopy(reason);
  const code = reason === "access-denied" ? "403" : "401";

  return (
    <DynamicError 
      code={code} 
      title={copy.title} 
      message={copy.description}
    />
  );
}
