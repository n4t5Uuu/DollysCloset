import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple tailwind classes gracefully by merging conflicting definitions.
 * @param inputs - List of standard classname strings, conditional objects, or arrays to be joined.
 * @returns The finalized string merging the classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
