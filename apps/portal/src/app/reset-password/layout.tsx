import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Securely update your Dolly's Closet account password and regain access to your dashboard.",
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
