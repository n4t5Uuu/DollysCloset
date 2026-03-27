import DynamicError from "@/components/general-components/DynamicError";
import { getAuthReasonCopy, readSearchParam } from "@/lib/auth/auth-routing";

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
