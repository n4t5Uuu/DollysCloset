"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@/lib/supabase/browser";

export default function StaffLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign out any existing sessions when accessing the login page
  useEffect(() => {
    async function signOutExistingUser() {
      const { data: { user } } = await browserSupabase.auth.getUser();
      if (user) {
        await browserSupabase.auth.signOut();
      }
    }
  
    signOutExistingUser();
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);;

    try {
      // Login with Supabase Auth
      const { data: authData, error: loginError } = await browserSupabase.auth.signInWithPassword({ 
        email,
        password
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      // Get user role from tbl_users
      const { data: user, error: userError } = await browserSupabase
        .from('tbl_users')
        .select('role')
        .eq('user_id', authData.user.id)
        .single();

      if (userError) {
        setError("Failed to fetch user data");
        setLoading(false);
        return;
      }

      // Redirect based on role
      router.refresh();
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (user.role === 'employee') {
        router.push('/employee/dashboard');
      } else {
        setError("Invalid user role");
        setLoading(false);
      }

    } catch (err: unknown) {
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
          <label className="block text-sm font-medium mb-1">Username</label>
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