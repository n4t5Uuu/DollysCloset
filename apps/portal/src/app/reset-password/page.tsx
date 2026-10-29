"use client";

import { useState } from "react";
import { updatePasswordAction } from "./actions";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";
import { useMemo } from "react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Real-time validation logic
  const validations = useMemo(() => ({
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const isAllValid = Object.values(validations).every(v => v);
  const isMatching = password === confirmPassword && confirmPassword !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (!isAllValid) {
      toast.error("Please meet all password requirements.");
      setLoading(false);
      return;
    }

    let redirecting = false;
    try {
      const { error } = await updatePasswordAction(password);

      if (error === "expired") {
        toast.error("Your reset link has expired. Please request a new one.");
        redirecting = true;
        window.location.href = "/";
        return;
      }

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Password updated successfully!");
      redirecting = true;
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);

    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      // Keep the spinner up while the browser navigates away.
      setLoading(redirecting);
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
          onClick={() => { window.location.href = "/"; }}
          disabled={loading}
          className="absolute left-6 top-8 text-[#828282] hover:text-[#E7A3B0] transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} /> Login
        </button>

        <div className="text-center mb-10 mt-6">
          <h1 className="text-[2.25rem] leading-none font-oswald font-bold text-[#1A1A1A] tracking-wider mb-3 uppercase">
            New Password
          </h1>
          <p className="text-sm text-[#828282] tracking-wide">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Requirements Tracker */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Security Requirements</p>
            <div className="grid grid-cols-1 gap-2">
              <ValidationItem isMet={validations.length} label="At least 8 characters long" />
              <ValidationItem isMet={validations.uppercase} label="Contains an uppercase letter" />
              <ValidationItem isMet={validations.lowercase} label="Contains a lowercase letter" />
              <ValidationItem isMet={validations.number} label="Includes at least one number" />
              <ValidationItem isMet={validations.special} label="Includes a special character" />
            </div>
          </div>

          {/* New Password */}
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder=" "
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition duration-300 pr-12 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              suppressHydrationWarning
            />
            <label
              htmlFor="password"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
              suppressHydrationWarning
            >
              New Password
            </label>
            <button aria-label={showPassword ? "Hide password" : "Show password"}
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#E7A3B0] transition-colors focus:outline-none cursor-pointer"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder=" "
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition duration-300 pr-12 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              suppressHydrationWarning
            />
            <label
              htmlFor="confirmPassword"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
              suppressHydrationWarning
            >
              Confirm Password
            </label>
            {isMatching && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500">
                <Check size={18} />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isAllValid || !isMatching}
            className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition duration-300 mt-10 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ValidationItem({ isMet, label }: { isMet: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition duration-300 ${isMet ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
        {isMet ? <Check size={10} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-current" />}
      </div>
      <span className={`text-[12px] transition-colors duration-300 ${isMet ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
