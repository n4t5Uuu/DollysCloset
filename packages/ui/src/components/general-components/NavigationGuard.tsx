"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@dollys-closet/core";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../ui/alert-dialog";

export function NavigationGuard() {
    const router = useRouter();
    const { isDirty, setIsDirty, unsavedMessage } = useUnsavedChanges();
    const [showDialog, setShowDialog] = useState(false);
    // Only read when the user confirms, so a ref avoids a redundant render.
    const pendingUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    useEffect(() => {
        const handleAnchorClick = (e: MouseEvent) => {
            if (!isDirty) return;

            const target = e.target as HTMLElement;
            const anchor = target.closest("a");

            if (anchor && anchor.href && anchor.target !== "_blank") {
                const url = new URL(anchor.href);

                if (url.origin === window.location.origin) {
                    if (url.pathname === window.location.pathname && url.search === window.location.search) {
                        return;
                    }

                    e.preventDefault();
                    e.stopPropagation();
                    pendingUrlRef.current = anchor.href;
                    setShowDialog(true);
                }
            }
        };

        document.addEventListener("click", handleAnchorClick, true);
        return () => document.removeEventListener("click", handleAnchorClick, true);
    }, [isDirty]);

    const handleConfirm = () => {
        setIsDirty(false);
        setShowDialog(false);
        if (pendingUrlRef.current) {
            router.push(pendingUrlRef.current);
        }
    };

    const handleCancel = () => {
        setShowDialog(false);
        pendingUrlRef.current = null;
    };

    return (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogContent className="max-w-[400px] bg-white">
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-oswald text-lg uppercase tracking-wide text-gray-900">
                        Unsaved Changes
                    </AlertDialogTitle>
                    <AlertDialogDescription className="font-montserrat text-gray-600">
                        {unsavedMessage || "You have unsaved changes. Are you sure you want to leave this page? Your changes will be lost."}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={handleCancel}
                        className="border-zinc-300 bg-white font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                    >
                        Keep editing
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        className="cursor-pointer bg-red-500 font-semibold text-white shadow-sm hover:bg-red-600"
                    >
                        Leave Page
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
