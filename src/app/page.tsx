"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";
import { dataHelper } from "@/lib/data-helper";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign out any existing sessions when accessing the login page
  useEffect(() => {
    async function signOutExistingUser() {
        console.log("Checking for existing session...");
        const { user } = await authHelper.getUser();
        if (user) {
            console.log("Signing out existing user:", user.email);
            await authHelper.signOut();
        }
    }
  
    signOutExistingUser();
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log("Attempting login for:", email);
      
      // Login with Supabase Auth
      const { data: authData, error: loginError } = await authHelper.signIn(email, password);

      if (loginError) {
        console.error("Login error:", loginError);
        setError(loginError.message);
        setLoading(false);
        return;
      }

      if (!authData?.user) {
        console.error("Login successful but no user returned");
        setError("Login failed - no user returned");
        setLoading(false);
        return;
      }

      console.log("Login successful, fetching role for:", authData.user.id);

      // Get user role from tbl_users
      const { data: userRoleData, error: userError } = await dataHelper.getUserRole(authData.user.id);

      if (userError || !userRoleData) {
        console.error("Role fetch error:", userError);
        setError("Failed to fetch user data: " + (userError?.message || "Unknown error"));
        setLoading(false);
        return;
      }

      console.log("User role found:", userRoleData.role);

      // Redirect based on role
      router.refresh(); // Refresh to ensure middleware picks up the new session
      if (userRoleData.role === 'admin' || userRoleData.role === 'employee') {
        router.push('/dashboard');
      } else {
        console.warn("Invalid/Unauthorized role:", userRoleData.role);
        setError("Invalid user role");
        setLoading(false);
      }

    } catch (err: unknown) {
      console.error("Unexpected error in handleSubmit:", err);
      const message = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-md shadow-sm"
      >
        <h1 className="text-2xl font-bold tracking-wide text-center mb-6">
          Staff Login
        </h1>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-60"
          />
        </div>

        {/* Password + toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Password</label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full border border-gray-300 rounded px-3 py-2 pr-20 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-60"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded hover:bg-black/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}