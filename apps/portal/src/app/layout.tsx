import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Dolly's Closet | Admin & Employee Portal",
    template: "%s | Dolly's Closet",
  },
  description: "Secure administrative portal for Dolly's Closet inventory management, analytics, and catalog operations.",
  keywords: ["Dolly's Closet", "Admin Portal", "Inventory Management"],
  authors: [{ name: "Dolly's Closet" }],
  creator: "Dolly's Closet",
  publisher: "Dolly's Closet",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://dollys-closet-admin-and-employee-fawn.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://dollyscloset.app", // Adjust if needed
    siteName: "Dolly's Closet",
    title: "Dolly's Closet | Admin & Employee Portal",
    description: "Secure administrative portal for Dolly's Closet inventory management and analytics.",
    images: [
      {
        url: "/og-image.png", // Assume there might be one or placeholder
        width: 1200,
        height: 630,
        alt: "Dolly's Closet | Admin & Employee Portal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dolly's Closet | Admin & Employee Portal",
    description: "Secure administrative portal for Dolly's Closet inventory management and analytics.",
    images: ["/og-image.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/images/logo/no-bg-logo.png",
  },
};

import { 
  Oswald,
  Montserrat,
  Playfair_Display,
  Great_Vibes
} from "next/font/google"; 
import "./globals.css";
import {
  ConditionalFooter,
  ConditionalNavbar,
  SidebarProvider,
  Toaster
} from "@dollys-closet/ui";
import { NavigationGuard } from "@/components/general-components/NavigationGuard";
import { SessionGuard } from "@/components/general-components/SessionGuard";
import { ProductProvider } from "@/contexts/ProductContext";
import { UserProvider, UnsavedChangesProvider } from "@dollys-closet/core";
import { GoogleAnalyticsTracker } from "@/components/analytics/GoogleAnalyticsTracker";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald"
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat"
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display"
})

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  variable: "--font-great-vibes",
  weight: "400"
})

/**
 * RootLayout Component
 * 
 * The ultimate entry point and wrapper for the entire Dolly's Closet application.
 * Governs the HTML structure, global font variables (Oswald, Montserrat, Playfair, Great Vibes), 
 * and systemic providers.
 * 
 * Included Providers/Guards:
 * - ProductProvider: Global inventory state.
 * - UnsavedChangesProvider: Dirty-state tracking for forms.
 * - SidebarProvider: Control for administrative sidebars.
 * - SessionGuard: Strict tab-closure security.
 * - NavigationGuard: Prevent data loss on route changes.
 * - Toaster: App-wide notification system.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${oswald.variable} ${montserrat.variable} ${playfairDisplay.variable} ${greatVibes.variable} antialiased`}
      >

        <UserProvider>
          <ProductProvider>
          <UnsavedChangesProvider>
            <SidebarProvider>
              <div className="flex flex-col min-h-screen w-full">
                <SessionGuard />
                <NavigationGuard />
                <GoogleAnalyticsTracker />
                <ConditionalNavbar />
                {children}
                <ConditionalFooter />
                <Toaster duration={3000} position="top-center" />
              </div>
            </SidebarProvider>
          </UnsavedChangesProvider>
        </ProductProvider>
        </UserProvider>
      </body>
    </html>
  );
}
