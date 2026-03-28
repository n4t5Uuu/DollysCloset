"use client";

import { useState, useEffect } from "react";
import { authHelper } from "@/lib/auth/auth-helper";
import { browserSupabase } from "@/lib/supabase/browser";
import { getAuthReasonCopy, getSafeInternalPath } from "@/lib/auth/auth-routing";

import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const LOGIN_COOLDOWN_STORAGE_KEY = "login-lockout-until";

const formatCooldown = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [callbackError, setCallbackError] = useState(false);
  const [loginReason, setLoginReason] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState("/dashboard");

  useEffect(() => {
    const storedValue = window.localStorage.getItem(LOGIN_COOLDOWN_STORAGE_KEY);
    const cooldownUntil = storedValue ? Number(storedValue) : 0;
    const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));

    if (remainingSeconds > 0) {
      setCooldownRemaining(remainingSeconds);
    }
  }, []);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          window.localStorage.removeItem(LOGIN_COOLDOWN_STORAGE_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  const startCooldown = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const cooldownUntil = Date.now() + safeSeconds * 1000;
    window.localStorage.setItem(LOGIN_COOLDOWN_STORAGE_KEY, String(cooldownUntil));
    setCooldownRemaining(safeSeconds);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setCallbackError(params.get("error") === "auth_callback_failed");
      setLoginReason(params.get("reason"));
      setNextPath(getSafeInternalPath(params.get("next"), "/dashboard"));
    }
  }, []);

  // Reset loading if browser restores this page from bfcache (back-forward cache)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // Redirect to dashboard if already authenticated (uses getUser to validate server-side,
  // preventing a redirect loop when the middleware rejects a stale local session)
  useEffect(() => {
    browserSupabase.auth.getUser().then(({ data: { user } }) => {
      if (user) window.location.replace(nextPath);
    });
  }, [nextPath]);
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

    if (cooldownRemaining > 0) {
      toast.info(`Too many failed attempts. Try again in ${formatCooldown(cooldownRemaining)}.`);
      return;
    }

    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password; // passwords must not be trimmed — spaces are valid characters

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
      // Attempt login via server-side route (includes rate limiting)
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      const loginResult = await loginResponse.json();

      // Handle login errors
      if (!loginResponse.ok) {
        const errorMessage: string = loginResult.error ?? "";
        console.error("Backend Login Error:", errorMessage);

        // Map backend errors to friendly user messages
        if (loginResponse.status === 429) {
          const retryAfterHeader = Number(loginResponse.headers.get("Retry-After") ?? "0");
          const retryAfterSeconds = Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
            ? retryAfterHeader
            : 15 * 60;

          startCooldown(retryAfterSeconds);
          toast.error(`Too many failed attempts. Try again in ${formatCooldown(retryAfterSeconds)}.`);
        } else if (errorMessage.includes("Invalid login credentials")) {
          toast.error("Invalid email or password.");
        } else if (errorMessage.includes("Email not confirmed")) {
          toast.error("Please confirm your email address.");
        } else {
          // Fallback for other backend errors (e.g. network)
          toast.error("Unable to log in. Please try again later.");
        }

        // Reset inputs on error as requested
        setEmail("");
        setPassword("");
        setLoading(false);
        return;
      }

      // Establish the session in the browser so the middleware can read it
      const { data: browserData, error: browserAuthError } = await browserSupabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (browserAuthError) {
        // Shouldn't normally happen since the API already validated credentials,
        // but handle it gracefully just in case
        console.error("Browser session error:", browserAuthError.message);
        toast.error("Login failed. Please try again.");
        setEmail("");
        setPassword("");
        setLoading(false);
        return;
      }

      console.log("Login successful, redirecting to dashboard...");

      const accessToken = browserData?.session?.access_token ?? loginResult.accessToken;
      if (accessToken) {
        void authHelper.logAuthEvent("login", accessToken);
      }

      if (loginResult.otherSessionsRevoked) {
        console.log("Other active sessions for this account have been terminated.");
      }
      
      toast.success("Login successful. Redirecting to dashboard...");
      window.location.replace(nextPath);
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
          <p className="text-sm font-montserrat text-[#828282] tracking-wide">Sign in to Dolly&apos;s Closet</p>
        </div>

        {!callbackError && loginReason && (
          <p className="text-sm text-red-500 text-center -mt-2 mb-6 font-medium">
            {getAuthReasonCopy(loginReason).description}
          </p>
        )}

        {callbackError && (
          <p className="text-sm text-red-500 text-center -mt-2 mb-6">
            Authentication failed. Please try again.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Email Input - Floating Label */}
          <div className="relative group">
            <input 
              type="email" 
              id="email"
              placeholder=" " 
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition-all duration-300 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_white] [&:-webkit-autofill]:[-webkit-text-fill-color:#1A1A1A]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading || cooldownRemaining > 0}
            />
            <label 
              htmlFor="email"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]
                        peer-[:-webkit-autofill]:top-0 peer-[:-webkit-autofill]:text-[12px] peer-[:-webkit-autofill]:text-[#E7A3B0]"
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
              className="peer w-full px-5 py-[18px] rounded-xl border border-[#E5E5E5] bg-transparent text-[#1A1A1A] focus:outline-none transition-all duration-300 pr-12 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0] [&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_white] [&:-webkit-autofill]:[-webkit-text-fill-color:#1A1A1A]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || cooldownRemaining > 0}
            />
            <label 
              htmlFor="password"
              className="absolute left-5 top-1/2 -translate-y-1/2 text-[#828282] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white
                        peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0]
                        peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0]
                        peer-[:-webkit-autofill]:top-0 peer-[:-webkit-autofill]:text-[12px] peer-[:-webkit-autofill]:text-[#E7A3B0]"
            >
              Password
            </label>
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-5 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#E7A3B0] transition-colors focus:outline-none cursor-pointer"
              disabled={loading || cooldownRemaining > 0}
            >
              {showPassword ? <EyeOff size={20} strokeWidth={1.5} /> : <Eye size={20} strokeWidth={1.5} />}
            </button>
          </div>

          <div className="flex justify-center mt-2">
            <a href="/forgot-password" className="text-[13px] font-medium text-[#828282] hover:text-[#E7A3B0] transition-colors duration-200">
              Forgot Password?
            </a>
          </div>

          <button 
            type="submit" 
            disabled={loading || cooldownRemaining > 0}
            className="w-full bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[18px] rounded-xl hover:from-[#E2899A] hover:to-[#DE7588] transition-all duration-300 mt-6 text-[15px] tracking-widest uppercase shadow-[0_8px_20px_-6px_rgba(231,163,176,0.6)] hover:shadow-[0_12px_24px_-6px_rgba(231,163,176,0.8)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            {loading
              ? "Logging in..."
              : cooldownRemaining > 0
                ? `Try Again In ${formatCooldown(cooldownRemaining)}`
                : "Log In"}
          </button>
          {cooldownRemaining > 0 && (
            <p className="text-center text-xs text-[#B3B3B3] -mt-3">
              Too many incorrect credential attempts. Please wait {formatCooldown(cooldownRemaining)}.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
