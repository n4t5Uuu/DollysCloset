import type { Metadata } from "next";
import { 
  Oswald,
  Montserrat,
  Playfair_Display,
  Great_Vibes
} from "next/font/google"; 
import "./globals.css";
import {ConditionalFooter, ConditionalNavbar } from "@/components/general-components/ConditionalFooterAndHeader";
import { ProductProvider } from "@/contexts/ProductContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { GoogleAnalyticsTracker } from "@/components/analytics/GoogleAnalyticsTracker";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { NavigationGuard } from "@/components/general-components/NavigationGuard";
import { SessionGuard } from "@/components/general-components/SessionGuard";

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
    <html lang="en">
      <body
        className={`
            ${oswald.variable}
            ${montserrat.variable}
            ${playfairDisplay.variable}
            ${greatVibes.variable}
            antialiased`
          }>

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
                <Toaster duration={3000} />
              </div>
            </SidebarProvider>
          </UnsavedChangesProvider>
        </ProductProvider>
      </body>
    </html>
  );
}
