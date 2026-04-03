import type { Metadata } from "next";
import DynamicError from "@/components/general-components/DynamicError";

export const metadata: Metadata = {
  title: "Access Forbidden",
  description: "This page is restricted. Please contact an admin if you believe this is an error.",
};

export default function ForbiddenPage() {
  return (
    <DynamicError 
      code="403" 
      title="Forbidden Access" 
      message="You don't have permission to view this page. Access is restricted to authorized personnel only."
    />
  );
}
