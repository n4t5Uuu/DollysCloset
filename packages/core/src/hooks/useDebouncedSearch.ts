"use client";

import { useEffect, useRef } from "react";

interface UseDebouncedSearchOptions {
    value: string;
    onDebouncedChange: (value: string) => void;
    debounceMs?: number;
}

export function useDebouncedSearch({
    value,
    onDebouncedChange,
    debounceMs = 300,
}: UseDebouncedSearchOptions) {
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasMountedRef = useRef(false);
    const callbackRef = useRef(onDebouncedChange);

    useEffect(() => {
        callbackRef.current = onDebouncedChange;
    }, [onDebouncedChange]);

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            callbackRef.current(value);
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [value, debounceMs]);

    const flush = () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        callbackRef.current(value);
    };

    const clearAndNotify = () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        callbackRef.current("");
    };

    return { flush, clearAndNotify };
}
