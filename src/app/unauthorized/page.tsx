import DynamicError from "@/components/general-components/DynamicError";

export default function UnauthorizedPage() {
  return (
    <DynamicError 
      code="401" 
      title="Access Denied" 
      message="You do not have permission to view this page. You must be logged in with the correct credentials."
    />
  );
}
