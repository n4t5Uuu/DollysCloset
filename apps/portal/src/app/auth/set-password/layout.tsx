import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Activation",
  description: "Set up your secure password to activate your Dolly's Closet employee/admin account.",
};

export default function SetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
