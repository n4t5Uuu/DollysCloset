"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";

import { Eye, EyeOff } from "lucide-react";

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
      const { data: userRoleData, error: userError } = await authHelper.getUserRole(authData.user.id);

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
    <div className="min-h-screen w-full flex items-center justify-center bg-white font-montserrat p-4">
      {/* Background decoration or nice subtle gradient could be added here if requested, keeping it simple white/gray for now */}
      
      <div className="w-full max-w-[500px] bg-[#F2F2F2] rounded-[30px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-8 md:p-12 animate-in fade-in zoom-in-95 duration-700">
        
        <h1 className="text-4xl md:text-5xl font-playfair font-bold text-center mb-10 tracking-wider text-black animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100 fill-mode-both">
          LOGIN
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-100 text-center animate-pulse">
              {error}
            </div>
          )}

          {/* Username/Email Input - Floating Label */}
          <div className="relative group animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200 fill-mode-both">
            <input 
              type="text" 
              id="email"
              placeholder=" " // Required for peer-placeholder-shown to work
              className="peer w-full px-5 py-3.5 rounded-xl border-2 border-[#E7A3B0]/40 bg-white text-black placeholder-transparent focus:border-[#E7A3B0] focus:outline-none focus:shadow-[0_0_0_4px_rgba(231,163,176,0.1)] transition-all duration-300 hover:border-[#E7A3B0]/70"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <label 
              htmlFor="email"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-all duration-300 cursor-text pointer-events-none bg-white px-1
                        peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-[#E7A3B0] peer-focus:font-bold
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#E7A3B0]/80"
            >
              Username
            </label>
          </div>

          {/* Password Input - Floating Label */}
          <div className="relative group animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300 fill-mode-both">
            <input 
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder=" "
              className="peer w-full px-5 py-3.5 rounded-xl border-2 border-[#E7A3B0]/40 bg-white text-black placeholder-transparent focus:border-[#E7A3B0] focus:outline-none focus:shadow-[0_0_0_4px_rgba(231,163,176,0.1)] transition-all duration-300 pr-12 hover:border-[#E7A3B0]/70"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <label 
              htmlFor="password"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm transition-all duration-300 cursor-text pointer-events-none bg-white px-1
                         peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:text-xs peer-focus:text-[#E7A3B0] peer-focus:font-bold
                         peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[#E7A3B0]/80"
            >
              Password
            </label>
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#E7A3B0] transition-all duration-200 focus:outline-none cursor-pointer hover:scale-110 active:scale-95"
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#E7A3B0] text-white font-medium py-3.5 rounded-xl hover:bg-[#d68c9d] active:scale-[0.98] transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 mt-8 text-lg tracking-wide disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer animate-in slide-in-from-bottom-4 fade-in duration-700 delay-500 fill-mode-both"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}