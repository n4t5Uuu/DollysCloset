"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { browserSupabase } from "@dollys-closet/core";
import { changePasswordAction } from "./actions";
import { Button } from "@/components/ui/button";
import { AdminNoticeBanner } from "@/components/ui/admin-notice-banner";
import { useUnsavedChanges } from "@dollys-closet/core";

interface Profile {
  displayName: string;
  role: string | null;
  email: string;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const { setIsDirty, setUnsavedMessage } = useUnsavedChanges();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  // Track unsaved changes in password fields
  useEffect(() => {
    const isActuallyDirty = currentPassword.length > 0 || newPassword.length > 0 || confirmPassword.length > 0;
    setIsDirty(isActuallyDirty);
    setUnsavedMessage(isActuallyDirty ? "You have unsaved password changes. If you leave now, your progress will be lost." : undefined);

    // Cleanup on unmount
    return () => {
      setIsDirty(false);
      setUnsavedMessage(undefined);
    };
  }, [currentPassword, newPassword, confirmPassword, setIsDirty, setUnsavedMessage]);

  const refreshProfile = useCallback(async () => {
    try {
      setRefreshingProfile(true);
      setProfileError(null);

      const [profileRes, { data: { user } }] = await Promise.all([
        fetch("/api/auth/profile", { cache: "no-store" }),
        browserSupabase.auth.getUser(),
      ]);

      if (!profileRes.ok) {
        throw new Error("Failed to load profile details.");
      }

      const { data } = await profileRes.json();

      setProfile({
        displayName: data.displayName,
        role: data.role,
        email: user?.email ?? "",
      });

    } catch {
      setProfileError("We couldn't refresh your profile details right now.");
    } finally {
      setRefreshingProfile(false);
    }
  }, []);

  const passwordChecks = useMemo(
    () => [
      {
        label: "Current password is entered",
        passed: currentPassword.length > 0,
      },
      {
        label: "New password is at least 6 characters",
        passed: newPassword.length >= 6,
      },
      {
        label: "New password is different from the current password",
        passed: newPassword.length > 0 && newPassword !== currentPassword,
      },
      {
        label: "Confirmation matches the new password",
        passed: confirmPassword.length > 0 && newPassword === confirmPassword,
      },
    ],
    [confirmPassword, currentPassword, newPassword]
  );

  const isFormReady = passwordChecks.every((check) => check.passed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setFormError(null);

    if (newPassword !== confirmPassword) {
      setFormError("New passwords do not match.");
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setFormError("New password must be different from your current password.");
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
      setFormError("Current password is incorrect.");
      toast.error("Current password is incorrect.");
      setLoading(false);
      return;
    }

    const { error } = await changePasswordAction(newPassword);

    if (error) {
      setFormError(error);
      toast.error(error);
      setLoading(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsDirty(false); // Explicitly clear dirty state on success
    setSuccess(true);
    setFormError(null);
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
          Manage your account settings and keep your sign-in secure.
        </p>
      </div>

      <div className="rounded-2xl border border-[#E7A3B0]/20 bg-[#fff9fb] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#8a6b73]">Account safety</p>
            <p className="text-sm text-[#8a6b73]">
              Refresh your profile details if anything looks outdated, and update your password only when every requirement below is satisfied.
            </p>
            <p className="text-xs text-[#9a7a83]">
              Changing your password signs out your other sessions for extra protection.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={refreshProfile}
            disabled={profileLoading || refreshingProfile}
            className="h-10 border-[#E7A3B0]/30 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${refreshingProfile ? "animate-spin" : ""}`} />
            Refresh Profile
          </Button>
        </div>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xs font-semibold text-[#828282] uppercase tracking-widest mb-5">
          Profile
        </h2>

        {profileLoading ? (
          <div className="flex items-center gap-4 animate-pulse">
            <div className="w-14 h-14 rounded-full bg-gray-100 shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-36 bg-gray-100 rounded-full" />
              <div className="h-3 w-48 bg-gray-100 rounded-full" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#FFF0F3] flex items-center justify-center shrink-0">
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

        {profileError && (
          <div className="mt-4">
            <AdminNoticeBanner
              tone="error"
              title="Unable to refresh profile"
              message={profileError}
              onDismiss={() => setProfileError(null)}
              actionLabel="Try again"
              onAction={() => {
                void refreshProfile();
              }}
            />
          </div>
        )}
      </div>

      {/* Change password card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xs font-semibold text-[#828282] uppercase tracking-widest mb-6">
          Change Password
        </h2>

        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white p-2 text-[#E7A3B0] shadow-sm">
              <ShieldCheck size={16} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[#1A1A1A]">Before you save</p>
              <p className="text-sm text-[#666]">
                Enter your current password first, then choose a new password you have not used in this session.
              </p>
            </div>
          </div>
        </div>

        {success && (
          <AdminNoticeBanner
            tone="success"
            title="Password updated"
            message="Your password was updated successfully. Other sessions have been signed out for safety."
            className="mb-6"
          />
        )}

        {formError && (
          <AdminNoticeBanner
            tone="error"
            title="Unable to update password"
            message={formError}
            onDismiss={() => setFormError(null)}
            className="mb-6"
          />
        )}

        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#828282] mb-3">
            Password Checklist
          </p>
          <div className="space-y-2">
            {passwordChecks.map((check) => (
              <div key={check.label} className="flex items-center gap-2 text-sm">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    check.passed ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {check.passed ? "✓" : "•"}
                </span>
                <span className={check.passed ? "text-[#1A1A1A]" : "text-[#666]"}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </div>

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
            disabled={loading || !isFormReady}
            className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 text-[13px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)]"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

        </form>
      </div>

    </div>
  );
}
