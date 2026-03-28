"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { browserSupabase } from "@/lib/supabase/browser";
import { changePasswordAction } from "./actions";

interface Profile {
  displayName: string;
  role: string | null;
  email: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const [profileRes, { data: { user } }] = await Promise.all([
          fetch("/api/auth/profile"),
          browserSupabase.auth.getUser(),
        ]);

        if (!profileRes.ok) return;
        const { data } = await profileRes.json();

        setProfile({
          displayName: data.displayName,
          role: data.role,
          email: user?.email ?? "",
        });
      } catch {
        // silently ignore — profile card just stays in skeleton
      } finally {
        setProfileLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      toast.error("New password must be different from your current password.");
      return;
    }

    setLoading(true);

    // Verify the current password before allowing the change
    const { error: authError } = await browserSupabase.auth.signInWithPassword({
      email: profile?.email ?? "",
      password: currentPassword,
    });

    if (authError) {
      toast.error("Current password is incorrect.");
      setLoading(false);
      return;
    }

    const { error } = await changePasswordAction(newPassword);

    if (error) {
      toast.error(error);
      setLoading(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess(true);
    setLoading(false);
  }

  const avatarInitial = (profile?.displayName?.[0] ?? "?").toUpperCase();
  const roleBadgeLabel = profile?.role === "admin" ? "Admin" : "Employee";

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-oswald font-bold text-[#1A1A1A] tracking-wide uppercase">
          Settings
        </h1>
        <p className="text-sm text-[#828282] font-montserrat mt-1">
          Manage your account settings
        </p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xs font-semibold text-[#828282] uppercase tracking-widest mb-5">
          Profile
        </h2>

        {profileLoading ? (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex-shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-36 bg-gray-100 rounded-full" />
              <div className="h-3 w-48 bg-gray-100 rounded-full" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#FFF0F3] flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold font-oswald text-[#E7A3B0]">
                {avatarInitial}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-[#1A1A1A]">{profile?.displayName}</p>
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#FFF0F3] text-[#E7A3B0]">
                  {roleBadgeLabel}
                </span>
              </div>
              <p className="text-sm text-[#828282] mt-0.5">{profile?.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Change password card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xs font-semibold text-[#828282] uppercase tracking-widest mb-6">
          Change Password
        </h2>

        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-6">
            <CheckCircle2 size={16} className="flex-shrink-0" />
            Password updated successfully. All other sessions have been signed out.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Current password */}
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              id="currentPassword"
              placeholder=" "
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={loading}
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0] transition-all duration-200 pr-12 disabled:opacity-60"
            />
            <label
              htmlFor="currentPassword"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] text-[14px] font-medium pointer-events-none px-1 bg-white transition-all duration-200
                peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-[#E7A3B0]
                peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
            >
              Current Password
            </label>
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              disabled={loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#E7A3B0] transition-colors focus:outline-none"
            >
              {showCurrent ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
          </div>

          {/* New password */}
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              id="newPassword"
              placeholder=" "
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0] transition-all duration-200 pr-12 disabled:opacity-60"
            />
            <label
              htmlFor="newPassword"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] text-[14px] font-medium pointer-events-none px-1 bg-white transition-all duration-200
                peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-[#E7A3B0]
                peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
            >
              New Password
            </label>
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              disabled={loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#E7A3B0] transition-colors focus:outline-none"
            >
              {showNew ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
          </div>

          {/* Confirm new password */}
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              id="confirmPassword"
              placeholder=" "
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] text-sm focus:outline-none focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0] transition-all duration-200 pr-12 disabled:opacity-60"
            />
            <label
              htmlFor="confirmPassword"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] text-[14px] font-medium pointer-events-none px-1 bg-white transition-all duration-200
                peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-[#E7A3B0]
                peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]"
            >
              Confirm New Password
            </label>
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              disabled={loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#E7A3B0] transition-colors focus:outline-none"
            >
              {showConfirm ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 text-[13px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)]"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

        </form>
      </div>

    </div>
  );
}
