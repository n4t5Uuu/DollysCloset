"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authHelper } from "@/lib/auth-helper";

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
    <div className="min-h-screen w-full flex items-center justify-center bg-white font-montserrat p-4">
      
      <div className="w-full max-w-[500px] bg-[#F2F2F2] rounded-[30px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-8 md:p-12 animate-in fade-in zoom-in-95 duration-700">
        
        <h1 className="text-4xl md:text-5xl font-playfair font-bold text-center mb-10 tracking-wider text-black animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100 fill-mode-both">
          LOGIN
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* Username/Email Input - Floating Label */}
          <div className="relative group animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200 fill-mode-both">
            <input 
              type="text" 
              id="email"
              placeholder=" " 
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