import DynamicError from "@/components/general-components/DynamicError";

export default function NotFound() {
  return (
    <DynamicError 
      code="404" 
      title="Lost in the closet" 
      message="Oops! The page you are looking for doesn't exist or has been moved."
    />
  );
}
