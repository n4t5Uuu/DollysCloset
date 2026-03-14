import DynamicError from "@/components/general-components/DynamicError";

export default function ForbiddenPage() {
  return (
    <DynamicError 
      code="403" 
      title="Forbidden Access" 
      message="You don't have permission to view this page. Access is restricted to authorized personnel only."
    />
  );
}
