import { cn } from "@dollys-closet/core";

interface ProductBadgeProps {
    label: string;
    className: string;
    mobileHidden?: boolean;
}

/**
 * Standard badge component for product cards.
 * Uses the Oswald font with uppercase tracking for a luxury boutique aesthetic.
 */
export function ProductBadge({ label, className, mobileHidden }: ProductBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center justify-center rounded-full border border-white/60 px-2.5 py-1 font-oswald text-[10px] uppercase tracking-[0.18em] shadow-sm backdrop-blur-sm transition-transform duration-200",
                className,
                mobileHidden && "hidden sm:inline-flex"
            )}
        >
            {label}
        </span>
    );
}
