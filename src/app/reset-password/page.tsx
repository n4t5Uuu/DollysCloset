"use client";

import { useState } from "react";
<<<<<<< Updated upstream
import { updatePasswordAction } from "./actions";
=======
<<<<<<< HEAD
import { useRouter } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";
=======
import { updatePasswordAction } from "./actions";
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function ResetPassword() {
<<<<<<< Updated upstream
=======
<<<<<<< HEAD
  const router = useRouter();
=======
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
      const { error } = await updatePasswordAction(password);
=======
<<<<<<< HEAD
      console.log("Submitting password update...");
      const { error } = await authHelper.updatePassword(trimmedPassword);
>>>>>>> Stashed changes

      if (error === "expired") {
        toast.error("Your reset link has expired. Please request a new one.");
        window.location.href = "/";
        return;
      }

      if (error) {
<<<<<<< Updated upstream
        toast.error(error);
=======
        console.error("Update Password Error:", error);
        toast.error("Unable to update password. Please try again.");
=======
      const { error } = await updatePasswordAction(trimmedPassword);

      if (error === "expired") {
        toast.error("Your reset link has expired. Please request a new one.");
        window.location.href = "/";
        return;
      }

      if (error) {
        toast.error(error);
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
        setLoading(false);
        return;
      }

<<<<<<< Updated upstream
=======
<<<<<<< HEAD
      console.log("Password updated successfully. Toasting and Redirecting...");
>>>>>>> Stashed changes
      toast.success("Password updated successfully!");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);

<<<<<<< Updated upstream
    } catch {
=======
    } catch (err) {
      console.error("Unexpected error in handleSubmit:", err);
=======
      toast.success("Password updated successfully!");
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);

    } catch {
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
      toast.error("An unexpected error occurred. Please try again.");
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
          onClick={() => { window.location.href = "/"; }}
=======
<<<<<<< HEAD
        
        <button 
          onClick={() => router.push('/')}
=======

        <button
          onClick={() => { window.location.href = "/"; }}
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
          disabled={loading}
          className="absolute left-6 top-8 text-[#828282] hover:text-[#E7A3B0] transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={16} /> Login
        </button>

        <div className="text-center mb-10 mt-6">
          <h1 className="text-[2.25rem] leading-none font-oswald font-bold text-[#1A1A1A] tracking-wider mb-3 uppercase">
            New Password
          </h1>
<<<<<<< Updated upstream
          <p className="text-sm text-[#828282] tracking-wide">
            Enter your new password below
          </p>
=======
<<<<<<< HEAD
          <p className="text-sm font-montserrat text-[#828282] tracking-wide">Enter your new password below</p>
>>>>>>> Stashed changes
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password */}
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
<<<<<<< Updated upstream
              placeholder=" "
=======
              placeholder=" " 
=======
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
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition-all duration-300 pr-12 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
<<<<<<< Updated upstream
            <label
=======
<<<<<<< HEAD
            <label 
=======
            <label
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
              htmlFor="password"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
            >
              New Password
            </label>
<<<<<<< Updated upstream
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
=======
<<<<<<< HEAD
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
=======
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#E7A3B0] transition-colors focus:outline-none cursor-pointer"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
            </button>
          </div>

<<<<<<< Updated upstream
          {/* Confirm Password */}
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder=" "
=======
<<<<<<< HEAD
          {/* Confirm Password Input */}
          <div className="relative group mt-6">
            <input 
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder=" " 
=======
          {/* Confirm Password */}
          <div className="relative group">
            <input
              type={showPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder=" "
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition-all duration-300 pr-12 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
<<<<<<< Updated upstream
            <label
=======
<<<<<<< HEAD
            <label 
=======
            <label
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
              htmlFor="confirmPassword"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
            >
              Confirm Password
            </label>
          </div>

<<<<<<< Updated upstream
          <button
            type="submit"
=======
<<<<<<< HEAD
          <button 
            type="submit" 
=======
          <button
            type="submit"
>>>>>>> 2088f9d490e01c32882ca33fad13b972597fbed0
>>>>>>> Stashed changes
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
