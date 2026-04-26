# Project Architecture Guide

Welcome to the technical blueprint for **Dolly's Closet**, a high-performance fashion management ecosystem built on a **Turborepo** monorepo architecture.

---

## 🏗️ Monorepo Structure

The project is divided into specialized applications and shared internal packages to maximize code reuse and maintainability.

### 📱 Applications (`/apps`)
- **Portal**: The administrative engine. Handles inventory, employee management, and business analytics.
- **Store**: The public-facing boutique. Optimized for SEO, performance, and customer experience.

### 📦 Shared Packages (`/packages`)
- **`@dollys-closet/core`**: Contains shared business logic, Supabase clients, TypeScript schemas, and reusable React hooks.
- **`@dollys-closet/ui`**: A centralized design system built with Radix UI and Tailwind CSS, ensuring visual consistency.
- **`@dollys-closet/config`**: Unified linting, formatting, and TypeScript configurations.

---

## 🔐 Authentication & Authorization

The ecosystem uses **Supabase Auth** integrated with **Next.js Middleware** for secure, server-side-first session management.

### The Middleware Flow
1. **Token Refresh**: Uses `@supabase/ssr` to ensure auth tokens are valid on every request.
2. **RBAC**: Interrogates the `tbl_users` table to enforce Role-Based Access Control, protecting administrative routes from unauthorized access.
3. **Security Headers**: Injects strict security headers and cache controls to protect sensitive operational data.

---

## 🛡️ Navigation Protection

To prevent data loss during administrative tasks, we implement a global "Unsaved Changes" guard.
- **`UnsavedChangesContext`**: Tracks the "dirty" state of forms across the application.
- **`NavigationGuard`**: Intercepts route changes and browser events to prompt users before they leave unsaved work.

---

## 📦 Data Management & Operations

### Product Catalog
- **Bulk Operations**: High-speed import/export utilizing `xlsx` and `PapaParse` for Excel/CSV processing.
- **Media Optimization**: Integrated browser-side image compression to ensure fast uploads and optimal storage usage.

### Analytics Engine
- **GA4 Integration**: Real-time business metrics tracking across both Portal and Store applications.
- **Custom Reporting**: Dashboard visualizations powered by `Recharts` for inventory and sales insights.

---

## 🎨 Design System (OKLCH)

We utilize **Tailwind CSS v4** with the **OKLCH** color space for perceptual uniformity and accessibility.
- **Typography**: OSWALD (Headers) and MONTSERRAT (Body).
- **Animations**: Fluid, tactile transitions powered by **Motion**.

---

© 2026 Dolly's Closet. Technical Documentation.
