"use client";

import { useEffect } from "react";
import DynamicError from "@/components/general-components/DynamicError";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Critical Runtime Error:", error);
    }, [error]);

    return (
        <DynamicError 
        code="500" 
        title="Something went wrong" 
        message="We encountered an unexpected error while processing your request. Our team has been notified."
        onRetry={() => reset()}
        />
    );
}
