import { Loader2 } from "lucide-react";
import { Button } from "@dollys-closet/ui";
import { CardFooter } from "@dollys-closet/ui";
import { cn } from "@dollys-closet/core";

interface AdminDialogFooterProps {
    onCancel: () => void;
    statusMessage?: string;
    actionLabel: string;
    isActionDisabled?: boolean;
    isLoading?: boolean;
    onSubmit?: (e: React.FormEvent) => void;
}

/**
 * Standardized Footer for Admin Dialogs.
 * Includes consistent Cancel and Action buttons with specific Dolly's Closet aesthetics and hover effects.
 */
export function AdminDialogFooter({
    onCancel,
    statusMessage,
    actionLabel,
    isActionDisabled = false,
    isLoading = false,
}: AdminDialogFooterProps) {
    return (
        <CardFooter className="flex flex-col gap-3 border-t bg-gray-50 p-6">
            {statusMessage && (
                <div className="w-full text-xs text-gray-500 sm:hidden">
                    {statusMessage}
                </div>
            )}
            <div className="flex flex-row gap-3 w-full">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="flex-1 border-gray-300 text-gray-700 bg-white hover:bg-white hover:text-black transition duration-300 hover:scale-105 hover:shadow-md hover:border-gray-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1 bg-[#E7A3B0] hover:bg-[#ca8c98] text-white transition duration-300 hover:scale-[1.03] active:scale-95 shadow-sm hover:shadow-md disabled:hover:scale-100 disabled:hover:shadow-sm"
                    disabled={isLoading || isActionDisabled}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        actionLabel
                    )}
                </Button>
            </div>
        </CardFooter>
    );
}
