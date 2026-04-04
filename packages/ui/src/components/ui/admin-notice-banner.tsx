"use client";

import { AlertTriangle, CheckCircle2, Info, RefreshCcw, X } from "lucide-react";
import { Button } from "./button";

type Tone = "error" | "success" | "warning" | "info";

const toneStyles: Record<Tone, { wrapper: string; icon: typeof AlertTriangle }> = {
  error: {
    wrapper: "border-red-200 bg-red-50 text-red-700",
    icon: AlertTriangle,
  },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: CheckCircle2,
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-700",
    icon: AlertTriangle,
  },
  info: {
    wrapper: "border-blue-200 bg-blue-50 text-blue-700",
    icon: Info,
  },
};

type AdminNoticeBannerProps = {
  tone: Tone;
  title: string;
  message: string;
  onDismiss?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function AdminNoticeBanner({
  tone,
  title,
  message,
  onDismiss,
  actionLabel,
  onAction,
  className,
}: AdminNoticeBannerProps) {
  const { wrapper, icon: Icon } = toneStyles[tone];

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${wrapper} ${className || ""}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1">{message}</p>
      </div>
      {actionLabel && onAction && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAction}
          className="h-8 shrink-0 border-current/20 bg-white/70 text-current hover:bg-white"
        >
          <RefreshCcw className="mr-2 h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
