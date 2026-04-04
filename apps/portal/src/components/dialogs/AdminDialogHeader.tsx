import { X } from "lucide-react";
import { CardHeader, CardTitle } from "@dollys-closet/ui";
import { cn } from "@dollys-closet/core";

interface AdminDialogHeaderProps {
    title: string;
    description?: string;
    onClose: () => void;
    isLoading?: boolean;
    className?: string;
}

/**
 * Standardized Header for Admin Dialogs.
 * Includes consistent Dolly's Closet styling and a customized X close button.
 */
export function AdminDialogHeader({ 
    title, 
    description, 
    onClose, 
    isLoading,
    className 
}: AdminDialogHeaderProps) {
    return (
        <CardHeader className={cn(
            "flex flex-row items-center justify-between border-b p-6 space-y-0 text-gray-900",
            className
        )}>
            <div className="space-y-1">
                <CardTitle className="font-oswald font-bold tracking-wide uppercase text-xl">
                    {title}
                </CardTitle>
                {description && (
                    <p className="text-sm text-gray-500 font-montserrat">
                        {description}
                    </p>
                )}
            </div>
            <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="text-[#cc7f8f] hover:text-[#b96d7d] rounded-md p-1 hover:bg-[#fff5f7] cursor-pointer transition-colors disabled:opacity-50"
                aria-label="Close"
            >
                <X className="w-5 h-5" />
            </button>
        </CardHeader>
    );
}
