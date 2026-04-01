"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function NavigationGuard() {
  const router = useRouter();
  const { isDirty, setIsDirty, unsavedMessage } = useUnsavedChanges();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  // Handle browser-level navigation (refresh, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to trigger browser dialog
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Handle client-side navigation (next/link clicks)
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      if (!isDirty) return;

      // Find the closest anchor tag
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor && anchor.href && anchor.target !== "_blank") {
        const url = new URL(anchor.href);
        // Only intercept if navigating within the same origin
        if (url.origin === window.location.origin) {
          // If navigating to the same path, don't block
          // We check pathname and search to avoid blocking anchor links on the same page
          if (url.pathname === window.location.pathname && url.search === window.location.search) {
             return;
          }

          e.preventDefault();
          e.stopPropagation();
          setPendingUrl(anchor.href);
          setShowDialog(true);
        }
      }
    };

    // Use capture phase to intercept clicks before other handlers
    document.addEventListener("click", handleAnchorClick, true);
    return () => document.removeEventListener("click", handleAnchorClick, true);
  }, [isDirty]);

  const handleConfirm = () => {
    setIsDirty(false); // Reset dirty state so we don't block the next action
    setShowDialog(false);
    if (pendingUrl) {
      router.push(pendingUrl);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
    setPendingUrl(null);
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent className="max-w-[400px] bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-oswald uppercase tracking-wide text-gray-900 text-lg">Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription className="font-montserrat text-gray-600">
            {unsavedMessage || "You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel} 
            className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 font-medium"
          >
            Keep editing
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold cursor-pointer shadow-sm"
          >
            Leave Page
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
