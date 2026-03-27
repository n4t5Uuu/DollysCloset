"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";
import { toast } from "sonner";
<<<<<<< Updated upstream
import { ArrowLeft, Mail } from "lucide-react";
=======
<<<<<<< HEAD
import { ArrowLeft } from "lucide-react";
=======
import { ArrowLeft, Mail } from "lucide-react";
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
<<<<<<< Updated upstream
  const [submitted, setSubmitted] = useState(false);
=======
<<<<<<< HEAD
=======
  const [submitted, setSubmitted] = useState(false);
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      toast.error("Please enter your email address.");
      setLoading(false);
      return;
    }

<<<<<<< Updated upstream
=======
<<<<<<< HEAD
    // Email format validation
=======
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    try {
<<<<<<< Updated upstream
      const origin = window.location.origin;
      const redirectTo = `${origin}/api/auth/callback?next=/reset-password`;

      // Always show success regardless of the response to prevent user enumeration
      await authHelper.resetPasswordForEmail(trimmedEmail, redirectTo);
      setSubmitted(true);
    } catch {
      // Still show success to prevent user enumeration
      setSubmitted(true);
=======
<<<<<<< HEAD
      // Get the origin for redirection
=======
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
      const origin = window.location.origin;
      const redirectTo = `${origin}/api/auth/callback?next=/reset-password`;

      const { error } = await authHelper.resetPasswordForEmail(trimmedEmail, redirectTo);

      if (error) {
<<<<<<< HEAD
        console.error("Reset Email Error:", error);
=======
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
        toast.error("Unable to send reset instructions. Please try again.");
        setLoading(false);
        return;
      }

<<<<<<< HEAD
      toast.success("Reset instructions sent to your email!");
      // Option to navigate back or just leave it showing success
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("An unexpected error occurred. Please try again.");
      setLoading(false);
=======
      setSubmitted(true);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-montserrat p-4 relative overflow-hidden bg-[#FFFBFB]">
<<<<<<< Updated upstream
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
=======
<<<<<<< HEAD
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{ 
>>>>>>> Stashed changes
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255, 226, 232, 0.8) 0%, transparent 60%),
            linear-gradient(to right, rgba(231, 163, 176, 0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(231, 163, 176, 0.06) 1px, transparent 1px)
          `,
<<<<<<< Updated upstream
          backgroundSize: "100% 100%, 80px 80px, 80px 80px",
          backgroundPosition: "center center",
=======
          backgroundSize: '100% 100%, 80px 80px, 80px 80px',
          backgroundPosition: 'center center'
=======
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
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] bg-white/98 backdrop-blur-xl rounded-[32px] shadow-[0_16px_40px_-12px_rgba(231,163,176,0.25)] border border-white/60 p-10 md:px-12 md:py-12 animate-in fade-in zoom-in-95 duration-700">
<<<<<<< Updated upstream

        <button
          onClick={() => router.push("/")}
=======
<<<<<<< HEAD
        
        <button 
          onClick={() => router.push('/')}
=======

        <button
          onClick={() => router.push("/")}
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
          disabled={loading}
          className="absolute left-6 top-8 text-[#828282] hover:text-[#E7A3B0] transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} /> Back
        </button>

<<<<<<< Updated upstream
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
                className="text-[#E7A3B0] hover:underline font-medium"
              >
                Send again
              </button>
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
=======
<<<<<<< HEAD
        <div className="text-center mb-10 mt-6">
          <h1 className="text-[2.25rem] leading-none font-oswald font-bold text-[#1A1A1A] tracking-wider mb-3 uppercase">
            Reset Password
          </h1>
          <p className="text-sm font-montserrat text-[#828282] tracking-wide">Enter your email to receive a reset link</p>
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
            />
            <label 
              htmlFor="email"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 mt-6 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
=======
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
                className="text-[#E7A3B0] hover:underline font-medium"
              >
                Send again
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

>>>>>>> Stashed changes
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
                />
                <label
                  htmlFor="email"
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                            peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                            peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
                >
                  Email Address
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 mt-6 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        )}
<<<<<<< Updated upstream
=======
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
      </div>
    </div>
  );
}
