import { cn } from "@dollys-closet/core";

interface FormNoticeProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Standard notice banner used in admin forms.
 * Features a light pink background, thin contrast border, and muted text.
 */
export function FormNotice({ children, className }: FormNoticeProps) {
    return (
        <div className={cn(
            "rounded-lg border border-[#E7A3B0]/20 bg-[#fff9fb] px-4 py-3 text-sm text-[#8a6b73]",
            className
        )}>
            {children}
        </div>
    );
}
