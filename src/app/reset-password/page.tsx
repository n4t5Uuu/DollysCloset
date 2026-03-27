"use client";

import { useState } from "react";
import { updatePasswordAction } from "./actions";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    try {
      const { error } = await updatePasswordAction(password);

      if (error === "expired") {
        toast.error("Your reset link has expired. Please request a new one.");
        window.location.href = "/";
        return;
      }

      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }

      toast.success("Password updated successfully!");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);

    } catch {
      toast.error("An unexpected error occurred. Please try again.");
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
          {/* New Password */}
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder=" "
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition-all duration-300 pr-12 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <label
              htmlFor="password"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
            >
              New Password
            </label>
            <button
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
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition-all duration-300 pr-12 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
            <label
              htmlFor="confirmPassword"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
            >
              Confirm Password
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 mt-10 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
