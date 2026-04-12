/**
 * fetch-utils.ts
 * 
 * Centralized utility for handling API requests with robust error handling.
 * Prevents technical error leakage (like "Unexpected token <") by validating
 * response content-types and providing user-friendly error messages.
 */

export interface SafeFetchResult<T> {
  data: T | null;
  error: Error | null;
  friendlyMessage: string | null;
  status: number;
}

/**
 * Safely fetches JSON data from an endpoint.
 * 
 * @param url The endpoint to fetch from
 * @param options Standard fetch options
 * @returns A standardized result object with data and friendly error messages
 */
export async function safeFetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    // Handle non-2xx statuses
    if (!response.ok) {
      let technicalError: Error | null = null;
      let friendlyMessage = "Something went wrong on our end. Please try again later.";

      if (response.status === 404) {
        friendlyMessage = "The requested service was not found.";
      }

      // Try to parse error message if it is JSON
      if (isJson) {
        try {
          const errorData = await response.json();
          technicalError = new Error(errorData.error || `Server returned ${response.status}`);
          friendlyMessage = errorData.error || friendlyMessage;
        } catch {
          technicalError = new Error(`HTTP Error ${response.status}`);
        }
      } else {
        technicalError = new Error(`HTTP Error ${response.status}`);
      }

      // In development mode, log the technical error to the console for easier debugging
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname.includes('vercel.app'))) {
        console.group(`🔴 API Error: ${url}`);
        console.error(`Status: ${response.status}`);
        console.error(`Technical Error:`, technicalError);
        console.groupEnd();
      }

      return {
        data: null,
        error: technicalError,
        friendlyMessage: friendlyMessage,
        status: response.status,
      };
    }

    // Handle successful response but missing/wrong content type
    if (!isJson) {
      return {
        data: null,
        error: new Error("Server did not return JSON"),
        friendlyMessage: "We received an unexpected response from the server. Please try again.",
        status: response.status,
      };
    }

    // Attempt to parse JSON safely
    try {
      const data = await response.json();
      return {
        data: data as T,
        error: null,
        friendlyMessage: null,
        status: response.status,
      };
    } catch (parseError) {
      return {
        data: null,
        error: parseError instanceof Error ? parseError : new Error("JSON Parse Error"),
        friendlyMessage: "We're having trouble reading the data from the server. Please refresh the page.",
        status: response.status,
      };
    }
  } catch (networkError) {
    // Handle network level errors (no internet, DNS failure, etc.)
    return {
      data: null,
      error: networkError instanceof Error ? networkError : new Error("Network Error"),
      friendlyMessage: "We couldn't connect to the server. Please check your internet connection.",
      status: 0,
    };
  }
}
