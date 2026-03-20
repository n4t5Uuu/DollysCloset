"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";
import { browserSupabase } from "@/lib/supabase/browser";

import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sign out any existing sessions when accessing the login page
  useEffect(() => {
    async function signOutExistingUser() {
        const { user } = await authHelper.getUser();
        if (user) {
            await authHelper.signOut();
        }
    }
  
    signOutExistingUser();
  }, [])

  /**
   * Handles the form submission for user login.
   * 
   * This function manages the authentication process including:
   * 1. Validating form inputs
   * 2. Sending login request to Supabase via authHelper
   * 3. Managing loading and error states
   * 4. Redirecting to the dashboard upon successful login
   * 
   * @param e - The form submission event
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Basic client-side validation
    if (!trimmedEmail || !trimmedPassword) {
      toast.error("Please enter both email and password.");
      setLoading(false);
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address.");
      // Reset inputs on error as requested
      setEmail("");
      setPassword("");
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting login for:", trimmedEmail);
      
      // Attempt generic login with Supabase
      const { data, error: signInError } = await authHelper.signIn(trimmedEmail, trimmedPassword);

      // Handle Supabase auth errors
      if (signInError) {
        console.error("Backend Login Error:", signInError);
        
        // Map backend errors to friendly user messages
        if (signInError.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password.");
        } else if (signInError.message.includes("Email not confirmed")) {
          toast.error("Please confirm your email address.");
        } else {
          // Fallback for other backend errors (e.g. rate limits, network)
          toast.error("Unable to log in. Please try again later.");
        }
        
        // Reset inputs on error as requested
        setEmail("");
        setPassword("");
        setLoading(false);
        return;
      }

      // Verify user data was returned
      if (!data?.user) {
        console.error("System Error: Login successful but no user returned");
        toast.error("An unexpected error occurred. Please try again.");
        setEmail("");
        setPassword("");
        setLoading(false);
        return;
      }

      console.log("Login successful, redirecting to dashboard...");
      
      // Log login activity securely via backend bypass API
      try {
        await fetch("/api/auth/log-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: data.user.id,
            email: data.user.email || trimmedEmail,
          }),
        });
      } catch (logErr) {
        console.warn("Failed to log login activity:", logErr);
      }

      toast.success("Login successful. Redirecting to dashboard...");
      router.push('/dashboard');
      // Note: We don't set loading to false here to prevent button re-enable during redirect

    } catch (err: unknown) {
      console.error("Unexpected error in handleSubmit:", err);
      // Show generic message for unexpected system errors
      toast.error("An unexpected error occurred. Please try again.");
      setEmail("");
      setPassword("");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center font-montserrat p-4 relative overflow-hidden bg-[#FFFBFB]">
      
      {/* Ultra-soft elegant background mimicking the mockup exactly */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none" 
        style={{ 
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255, 226, 232, 0.8) 0%, transparent 60%),
            linear-gradient(to right, rgba(231, 163, 176, 0.06) 1px, transparent 1px), 
            linear-gradient(to bottom, rgba(231, 163, 176, 0.06) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 80px 80px, 80px 80px',
          backgroundPosition: 'center center'
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] bg-white/98 backdrop-blur-xl rounded-[32px] shadow-[0_16px_40px_-12px_rgba(231,163,176,0.25)] border border-white/60 p-10 md:px-12 md:py-12 animate-in fade-in zoom-in-95 duration-700">
        
        <div className="text-center mb-10">
          <h1 className="text-[2.75rem] leading-none font-oswald font-bold text-[#1A1A1A] tracking-wider mb-3 uppercase">
            Log In
          </h1>
          <p className="text-sm font-montserrat text-[#828282] tracking-wide">Sign in to Dolly's Closet</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Email Input - Floating Label */}
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
              Email
            </label>
          </div>

          {/* Password Input - Floating Label */}
          <div className="relative group mt-6">
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
              Password
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

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 mt-10 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}