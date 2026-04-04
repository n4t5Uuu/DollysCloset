"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authHelper, createClient } from "@dollys-closet/core";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

const COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = "forgot-password-cooldown-until";

const formatCooldown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(COOLDOWN_STORAGE_KEY);
    const cooldownUntil = storedValue ? Number(storedValue) : 0;
    const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

    if (remainingSeconds > 0) {
      setCooldownRemaining(remainingSeconds);
    }
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          window.localStorage.removeItem(COOLDOWN_STORAGE_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  const startCooldown = (seconds: number) => {
    const cooldownUntil = Date.now() + seconds * 1000;
    window.localStorage.setItem(COOLDOWN_STORAGE_KEY, String(cooldownUntil));
    setCooldownRemaining(seconds);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (cooldownRemaining > 0) {
      toast.info(`Please wait ${formatCooldown(cooldownRemaining)} before requesting again.`);
      return;
    }

    setLoading(true);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/api/auth/callback?next=/reset-password`;

      // Step 1: Validate account existence via our custom API
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, redirectTo }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(result.error || "Unable to process request.");
        return;
      }

      // Step 2: Trigger the actual reset email from the BROWSER.
      // This is crucial for @supabase/ssr to set the PKCE code_verifier cookie.
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo,
      });

      if (error) {
        toast.error(error.message || "Unable to send reset email.");
        return;
      }

      setEmail(trimmedEmail);
      setSubmitted(true);
      startCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error("Unable to send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-montserrat p-4 relative overflow-hidden bg-[#FFFBFB]">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255, 226, 232, 0.8) 0%, transparent 60%),
            linear-gradient(to right, rgba(231, 163, 176, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(231, 163, 176, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 80px 80px, 80px 80px",
          backgroundPosition: "center center",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] bg-white/98 backdrop-blur-xl rounded-[32px] shadow-[0_16px_40px_-12px_rgba(231,163,176,0.25)] border border-white/60 p-10 md:px-12 md:py-12 animate-in fade-in zoom-in-95 duration-700">

        <button
          onClick={() => router.push("/")}
          disabled={loading}
          className="absolute left-6 top-8 text-[#828282] hover:text-[#E7A3B0] transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {submitted ? (
          // Success state
          <div className="text-center mt-6">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#FFF0F3] flex items-center justify-center">
                <Mail size={28} className="text-[#E7A3B0]" />
              </div>
            </div>
            <h1 className="text-[2.25rem] leading-none font-oswald font-bold text-[#1A1A1A] tracking-wider mb-3 uppercase">
              Check Inbox
            </h1>
            <p className="text-sm text-[#828282] tracking-wide mb-2">
              We sent a reset link to
            </p>
            <p className="text-sm font-semibold text-[#1A1A1A] mb-8 break-all">
              {email}
            </p>
            <p className="text-xs text-[#B3B3B3] mb-6">
              Didn&apos;t receive it?{" "}
              <button
                onClick={() => setSubmitted(false)}
                disabled={cooldownRemaining > 0}
                className="text-[#E7A3B0] hover:underline font-medium disabled:opacity-60 disabled:no-underline disabled:cursor-not-allowed"
              >
                {cooldownRemaining > 0 ? `Send again in ${formatCooldown(cooldownRemaining)}` : "Send again"}
              </button>
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              Back to Login
            </button>
          </div>
        ) : (
          // Email form
          <>
            <div className="text-center mb-10 mt-6">
              <h1 className="text-[2.25rem] leading-none font-oswald font-bold text-[#1A1A1A] tracking-wider mb-3 uppercase">
                Reset Password
              </h1>
              <p className="text-sm text-[#828282] tracking-wide">
                Enter your email to receive a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative group">
                <input
                  type="email"
                  id="email"
                  placeholder=" "
                  className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition-all duration-300 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  suppressHydrationWarning
                />
                <label
                  htmlFor="email"
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                            peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
                  suppressHydrationWarning
                >
                  Email Address
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || cooldownRemaining > 0}
                className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 mt-6 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                {loading
                  ? "Sending..."
                  : cooldownRemaining > 0
                    ? `Try Again In ${formatCooldown(cooldownRemaining)}`
                    : "Send Reset Link"}
              </button>
              {cooldownRemaining > 0 && (
                <p className="text-center text-xs text-[#B3B3B3] -mt-3">
                  Please wait {formatCooldown(cooldownRemaining)} before requesting another reset link.
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
