import type { Metadata } from "next";
import LoginClient from "@/components/auth/LoginClient";

export const metadata: Metadata = {
  title: "Account Log In",
  description: "Securely sign in to the Dolly's Closet Admin & Employee portal to manage inventory and view boutique analytics.",
};

export default function Home() {
  return <LoginClient />;
}
