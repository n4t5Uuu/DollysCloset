# 👗 Dolly's Closet — Monorepo

Welcome to the unified codebase for **Dolly's Closet**, a high-performance fashion management ecosystem. This repository utilizes a modern **Turborepo** monorepo architecture to manage multiple applications and shared packages with speed and efficiency.

Built with **Next.js 16**, **React 19**, and **Tailwind CSS v4** for a premium, state-of-the-art web experience.

---

## 🏗️ Monorepo Architecture

This project is organized into modular applications and shared packages, ensuring consistency and reusability across the entire ecosystem.

### 📱 Applications (`/apps`)
- **[Portal](./apps/portal)**: The internal administrative and employee management system. Features include inventory control, employee roles, advanced analytics (GA4), and bulk data operations.
- **[Store](./apps/store)**: The customer-facing storefront, designed for a seamless and premium shopping experience.

### 📦 Shared Packages (`/packages`)
- **[@dollys-closet/core](./packages/core)**: The engine of the application. Contains shared business logic, Supabase clients, reusable hooks, and TypeScript schemas.
- **[@dollys-closet/ui](./packages/ui)**: A centralized design system built with Radix UI and Tailwind CSS, ensuring a consistent brand identity across all apps.
- **[@dollys-closet/config](./packages/config)**: Shared configurations for ESLint, TypeScript, and Tailwind to maintain code quality and build standards.

---

## ✨ Primary Features

| Feature | Description |
| :--- | :--- |
| **📊 Analytics Engine** | Real-time business insights integrated with Google Analytics 4 (Portal & Store). |
| **📦 Smart Inventory** | Advanced catalog management with Excel/CSV bulk import/export capabilities. |
| **👥 RBAC Ecosystem** | Granular Role-Based Access Control with secure invitation and management flows. |
| **🔐 Multi-Layer Auth** | Secure session management powered by Supabase Auth (SSR-ready). |
| **📝 Audit Logging** | Comprehensive activity tracking for operational transparency and security. |
| **🌗 Premium UI/UX** | Dark-mode native interface with smooth Motion animations and tactile feedback. |
| **📂 Media Management** | Optimized asset handling with browser-side image compression. |

---

## 🛠️ Tech Stack

- **Monorepo Management**: [Turborepo](https://turbo.build/)
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Primitives**: [Radix UI](https://www.radix-ui.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Data Operations**: [SheetJS](https://sheetjs.com/) (Pro/Bulk Operations), [PapaParse](https://www.papaparse.com/)
- **Drag & Drop**: [dnd-kit](https://dndkit.com/)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20 or higher (recommended).
- **Package Manager**: npm v10+.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd DollysCloset-AdminAndEmployee
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory. You can use the standard keys required by both apps:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

    # Google Analytics
    GA_PROPERTY_ID=your_ga_property_id
    GOOGLE_APPLICATION_CREDENTIALS=path_to_your_json_credentials
    ```

### Development

Run all applications and packages in development mode:
```bash
npm run dev
```

To work on a specific application using Turborepo filters:
```bash
npx turbo dev --filter=@dollys-closet/portal
```

---

## 🌐 Deployment

### Frontend (Vercel)
The applications are optimized for deployment on **Vercel**. Each app in the `/apps` directory can be deployed independently.
- **Portal**: Administrative dashboard.
- **Store**: Public storefront.

### Backend (Supabase)
Ensure your Supabase project is configured with:
1.  **Authentication**: Email/Password and any social providers.
2.  **Database**: RLS (Row Level Security) enabled on all tables.
3.  **Storage**: Buckets for product images and media.

---

## 🎨 Design System (OKLCH)

We use a high-precision OKLCH-based color system for optimal perceptual uniformity.

| Token | Dark Mode (OKLCH) | Usage |
| :--- | :--- | :--- |
| **Primary** | `0.922 0 0` | Branding & Interactive |
| **Background**| `0.145 0 0` | Main Surfaces |
| **Card** | `0.205 0 0` | UI Containers |
| **Accent** | `0.269 0 0` | Hover States |
| **Destructive**| `0.704 0.191 22.216` | Error states |

---

## 📁 Developer Reference

For deep technical insights, review our **[Architecture Guide](./docs/ARCHITECTURE.md)**.

### Common CLI Tasks
- `npm run build`: Build all apps for production.
- `npm run lint`: Run linting across the entire monorepo.
- `npm run format`: Prettify the entire codebase.

---

© 2026 Dolly's Closet. All rights reserved.

