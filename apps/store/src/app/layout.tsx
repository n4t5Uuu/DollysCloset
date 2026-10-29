import type { Metadata } from "next";
import {
  Great_Vibes,
  Montserrat,
  Oswald,
  Playfair_Display,
} from "next/font/google";
import "./globals.css";
import { Footer, MotionProvider, Navbar, Toaster } from "@dollys-closet/ui";

export const metadata: Metadata = {
  title: {
    default: "Dolly's Closet",
    template: "%s | Dolly's Closet",
  },
  description: "Curated boutique collection from Dolly's Closet.",
  metadataBase: new URL("https://www.dollysclosetph.com"),
  alternates: {
    canonical: "https://www.dollysclosetph.com",
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: "https://www.dollysclosetph.com",
    siteName: "Dolly's Closet",
    title: "Dolly's Closet",
    description: "Curated boutique collection from Dolly's Closet.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dolly's Closet",
    description: "Curated boutique collection from Dolly's Closet.",
  },
  icons: {
    icon: "/images/logo/no-bg-logo.png",
  },
};

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  variable: "--font-great-vibes",
  weight: "400",
});

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
          <MotionProvider>
          <div className="flex min-h-screen w-full flex-col">
            <Navbar navLinks={["Collection", "About", "Contact"]} showLogout={false} />
            {children}
            <Footer />
            <Toaster duration={3000} />
          </div>
          </MotionProvider>
      </body>
    </html>
  );
}
