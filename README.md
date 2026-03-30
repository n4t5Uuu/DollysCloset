# Dolly's Closet - Admin & Employee Portal

Welcome to the internal management system for **Dolly's Closet**. This portal is designed to streamline operations, manage inventory, and provide actionable insights through advanced analytics.

Built with **Next.js 16**, **React 19**, and **Tailwind CSS v4** for a high-performance, premium administrative experience.

---

## ✨ Key Features

- **📊 Comprehensive Dashboard**: Real-time business overview with Google Analytics 4 integration and interactive charts.
- **📦 Product Management**: Full CRUD operations for the product catalog, including support for bulk Excel/CSV imports and exports.
- **👥 Employee Ecosystem**: Automated invitation system and role-based access control to ensure secure internal operations.
- **🔐 Secure Authentication**: Multi-layer security powered by Supabase Auth (Login, Session management, Link-based setup).
- **📝 Activity Tracking**: Granular logging of system activities to maintain operational transparency.
- **🌗 Premium UI/UX**: Fully responsive, dark-mode-ready interface utilizing Radix UI primitives and Motion animations.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **Animations**: [Motion](https://motion.dev/) (Framer Motion)
- **Data Viz**: [Recharts](https://recharts.org/)
- **Analytics**: Google Analytics 4 (Data API)
- **Utilities**: `jspdf` (Reports), `xlsx` (Bulk Data), `sonner` (Toasts)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher (v20+ recommended).
- **npm** or **yarn**: Package manager.

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
    Create a `.env.local` file in the root directory and add the following keys:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

    # Google Analytics
    GA_PROPERTY_ID=your_ga_property_id
    GOOGLE_APPLICATION_CREDENTIALS=path_to_your_json_credentials
    ```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the portal.

---

## 🎨 Design System

### Typography

- **Headings**: `Oswald` — *Usage: `font-heading` for section headers and titles.*
- **Body Text**: `Montserrat` — *Usage: `font-body` for standard text, descriptions, and UI.*
- **Accents**: `Playfair Display` & `Great Vibes` — *Usage: Selective decorative elements.*

### Colors (OKLCH System)

The portal uses a dynamic, OKLCH-based color system for precise control over perception and accessibility.

| Token | Light Mode (OKLCH) | Dark Mode (OKLCH) | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `0.205 0 0` (Dark) | `0.922 0 0` (Light) | Interactive elements, branding |
| **Background**| `1 0 0` (White) | `0.145 0 0` (Grey) | Main page surface |
| **Card** | `1 0 0` | `0.205 0 0` | UI containers and surfaces |
| **Accent** | `0.97 0 0` | `0.269 0 0` | Hover states and highlights |
| **Destructive**| `0.577 0.245 27.325` | `0.704 0.191 22.216` | Errors, deletions, alerts |

---

## 📁 Project Structure

- `/src/app`: Next.js App Router routes (Admin, Dashboard, Auth, etc.).
- `/src/components`: Reusable UI components (Shared, Layout, Specific features).
- `/src/hooks`: Custom React hooks for data fetching and state logic.
- `/src/lib`: Utility functions and direct Supabase/Analytics helpers.
- `/src/types`: TypeScript definitions and schemas.

