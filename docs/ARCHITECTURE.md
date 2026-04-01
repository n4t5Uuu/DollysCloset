# Project Architecture Guide

This document describes the high-level architecture and design patterns used in the Dolly's Closet Admin & Employee Portal.

## 🔐 Authentication & Authorization

The portal uses **Supabase Auth** integrated with **Next.js Middleware** for a secure, server-side-first approach.

### The Middleware Flow (`middleware.ts`)
1. **Token Refresh**: The middleware uses `@supabase/ssr` to check and refresh authentication tokens on every request to protected routes (`/admin`, `/employee`, `/dashboard`).
2. **Cookie Propagation**: It ensures that refreshed tokens are synchronized between the request (for server components) and the response (for the browser).
3. **Role-Based Access Control (RBAC)**: After verifying the token, it queries the `tbl_users` table to check the user's role and redirects unauthorized attempts (e.g., an employee trying to access `/admin`).
4. **Cache Control**: It forces `no-store` headers on protected routes to prevent sensitive data from being stored in the browser's back-forward cache.

---

## 🛡️ Navigation Protection (Unsaved Changes)

To prevent accidental data loss, the application implements a global "Unsaved Changes" guard.

### Components
1. **`UnsavedChangesContext`**: A global context that tracks a `isDirty` boolean and a situational `unsavedMessage`.
2. **`NavigationGuard`**: A client component in the root layout that:
   - Listens to `beforeunload` for browser-level refreshes.
   - Intercepts clicks on all `<a>` tags (including `next/link`) to show a confirmation `AlertDialog`.

### Usage Pattern
Pages with forms (like Settings or Manage Details) use the `useUnsavedChanges` hook to update the global state based on their local form state.

---

## 📦 Data Management

### Product Bulk Operations
- **Import**: Uses the `xlsx` library to parse user-uploaded spreadsheets, validates them against the schema, and performs bulk insertions into Supabase.
- **Export**: Generates Excel files from the current product list for offline management.

### Business Details
The `ManageDetailsClient` allows for independent field updates. Each field (Announcement, Phone, FAQ item) has its own "Save" lifecycle to ensure granular control over what is published to the customer site.

---

## 🎨 UI & Aesthetic Standards

- **Tailwind CSS v4**: Utilizes the latest OKLCH color system for premium, perception-accurate colors.
- **Typography**:
  - `Oswald`: Used for bold, uppercase headers.
  - `Montserrat`: Used for readable body text and UI labels.
- **Micro-animations**: Powered by `motion` (Framer Motion) for smooth tab transitions and layout shifts.
