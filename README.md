# Dolly's Closet Customer App

This is the customer-facing application for Dolly's Closet, built with Next.js 15, React 19, and Tailwind CSS v4.

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

- **Node.js**: Ensure you have Node.js installed (v18 or higher recommended).
- **npm** or **yarn**: Package manager to install dependencies.

### Installation

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone <repository-url>
    cd dollys_closet_customer
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

### Running the Development Server

To start the local development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The page auto-updates as you edit the file.

### Building for Production

To create an optimized production build:

```bash
npm run build
# or
yarn build
```

To start the production server after building:

```bash
npm start
# or
yarn start
```

---

## Design System

### Typography
- **Headings**: `Oswald`
  - Usage: `font-heading` (e.g., standard: `font-bold uppercase tracking-wider`)
- **Body Text**: `Montserrat` (Regular & Semibold)
  - Usage: `font-body` (e.g., standard: `text-sm`)

#### Font Sizes
| Type | Tailwind Class | Size | Usage |
|:---|:---:|:---:|:---|
| **Hero Title** | `text-6xl` | 60px | Main Landing Page Headings |
| **Page Title** | `text-4xl` | 36px | Section Headers (e.g., "New Arrivals") |
| **Subtitle** | `text-2xl` | 24px | Card Titles, Important highlights |
| **Body** | `text-base` | 16px | Product descriptions, standard text |
| **Small** | `text-sm` | 14px | Footer links, Metadata, Breadcrumbs |


### Colors
| Color Name | Hex Code | Usage |
|:---:|:---:|:---|
| **White** | `#FCFCFC` | Backgrounds, Cards |
| **Dark Grey** | `#262626` | Footer Background, Dark Sections |
| **Pink Accent** | `#E679A3` | Highlights, Buttons, Active Links |
| **Light Pink** | `#F5E6F0` | Subtle Backgrounds |
| **Light Grey** | `#F0F0F0` | Input Fields, Placeholders |
| **Off White** | `#F2F2F2` | Secondary Backgrounds |
