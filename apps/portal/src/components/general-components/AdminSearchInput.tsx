"use client";

import * as React from "react";
import { Search, X } from "lucide-react";

import { cn, useDebouncedSearch } from "@dollys-closet/core";
import { Input } from "@dollys-closet/ui";

interface AdminSearchInputProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  debounceMs?: number;
  onDebouncedChange?: (value: string) => void;
  inputClassName?: string;
  clearLabel?: string;
}

const AdminSearchInput = React.forwardRef<HTMLInputElement, AdminSearchInputProps>(
  (
    {
      value,
      onChange,
      placeholder,
      ariaLabel,
      debounceMs = 300,
      onDebouncedChange,
      className,
      inputClassName,
      clearLabel = "Clear search",
      ...props
    },
    ref
  ) => {
    const inputId = React.useId();

    const { clearAndNotify } = useDebouncedSearch({
      value,
      onDebouncedChange: onDebouncedChange ?? (() => {}),
      debounceMs,
    });

    const handleClear = () => {
      onChange("");
      clearAndNotify();
    };

    return (
      <div className={cn("relative flex-1 min-w-[220px]", className)} {...props}>
        <label htmlFor={inputId} className="sr-only">
          {ariaLabel}
        </label>
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <Input
          ref={ref}
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          autoComplete="off"
          className={cn(
            "h-9 w-full rounded-full border-gray-300 bg-white pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-[#E7A3B0] focus-visible:ring-[#E7A3B0]/30",
            inputClassName
          )}
        />
        {value.trim() !== "" && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-[#E7A3B0]"
            aria-label={clearLabel}
            title={clearLabel}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);

AdminSearchInput.displayName = "AdminSearchInput";

export default AdminSearchInput;
