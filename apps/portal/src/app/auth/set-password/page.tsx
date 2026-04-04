"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { browserSupabase } from "@dollys-closet/core";
import { Eye, EyeOff, Loader2, CheckCircle2, ChevronRight, X, Check } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function SetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { user }, error } = await browserSupabase.auth.getUser();
            if (error || !user) {
                toast.error("Invalid or expired session. Please contact your admin.");
                router.push("/");
                return;
            }
            setUser(user);
        };
        checkSession();
    }, [router]);

    // Real-time validation logic
    const validations = useMemo(() => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    }), [password]);

    const isAllValid = Object.values(validations).every(v => v);
    const isMatching = password === confirmPassword && confirmPassword !== "";

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        
        if (!isAllValid) {
            toast.error("Please meet all password requirements.");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const { error: authError } = await browserSupabase.auth.updateUser({
                password: password
            });

            if (authError) throw authError;

            setIsSuccess(true);
            toast.success("Password set successfully!");
            
            setTimeout(() => {
                router.push("/dashboard");
            }, 2500);

        } catch (err: any) {
            console.error("Set password error:", err);
            toast.error(err.message || "An error occurred while setting your password.");
        } finally {
            setLoading(false);
        }
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center font-montserrat p-4 relative overflow-hidden bg-[#FFFBFB]">
                <div className="relative z-10 w-full max-w-[420px] bg-white rounded-[32px] shadow-xl p-12 text-center">
                    <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="mb-6 flex justify-center"
                    >
                        <CheckCircle2 size={80} className="text-emerald-500" />
                    </motion.div>
                    <h1 className="text-3xl font-oswald font-bold text-[#1A1A1A] mb-4 uppercase tracking-wider">Account Active!</h1>
                    <p className="text-[#828282] mb-8">Access granted. Redirecting to your dashboard workspace...</p>
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-[#E7A3B0]" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center font-montserrat p-4 relative overflow-hidden bg-[#FFFBFB]">
            {/* Elegant grid background */}
            <div 
                className="absolute inset-0 z-0 pointer-events-none opacity-40" 
                style={{ 
                    backgroundImage: `
                        radial-gradient(circle at 50% 50%, rgba(255, 226, 232, 0.4) 0%, transparent 70%),
                        linear-gradient(to right, rgba(231, 163, 176, 0.1) 1px, transparent 1px), 
                        linear-gradient(to bottom, rgba(231, 163, 176, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '100% 100%, 40px 40px, 40px 40px',
                    backgroundPosition: 'center center'
                }}
            />

            <div className="relative z-10 w-full max-w-[460px] bg-white/95 backdrop-blur-2xl rounded-[40px] shadow-[0_20px_60px_-15px_rgba(231,163,176,0.2)] border border-white/60 p-10 md:p-12">
                
                <div className="text-center mb-8">
                    <h1 className="text-[2.5rem] leading-none font-oswald font-bold text-[#1A1A1A] tracking-wider mb-3 uppercase">
                        Setup Security
                    </h1>
                    <p className="text-sm font-montserrat text-[#828282] tracking-wide">Enter your personal dashboard password</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Password Input */}
                    <div className="relative group">
                        <input 
                            type={showPassword ? "text" : "password"}
                            id="password"
                            placeholder=" " 
                            className="peer w-full px-5 py-[18px] rounded-2xl border border-[#F0F0F0] bg-white/50 text-[#1A1A1A] focus:outline-none transition-all duration-300 pr-12 focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            suppressHydrationWarning
                        />
                        <label 
                            htmlFor="password"
                            className="absolute left-5 top-1/2 -translate-y-1/2 text-[#999] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white/0
                                      peer-focus:top-0 peer-focus:text-[12px] peer-focus:text-[#E7A3B0] peer-focus:bg-white
                                      peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:text-[#E7A3B0] peer-[:not(:placeholder-shown)]:bg-white"
                            suppressHydrationWarning
                        >
                            New Password
                        </label>
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)} 
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-[#B3B3B3] hover:text-[#E7A3B0] transition-colors focus:outline-none cursor-pointer"
                        >
                            {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                        </button>
                    </div>

                    {/* Requirements Tracker */}
                    <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Requirements</p>
                        <div className="grid grid-cols-1 gap-2">
                            <ValidationItem isMet={validations.length} label="At least 8 characters long" />
                            <ValidationItem isMet={validations.uppercase} label="Contains an uppercase letter" />
                            <ValidationItem isMet={validations.lowercase} label="Contains a lowercase letter" />
                            <ValidationItem isMet={validations.number} label="Includes at least one number" />
                            <ValidationItem isMet={validations.special} label="Includes a special character" />
                        </div>
                    </div>

                    {/* Confirm Password Input */}
                    <div className="relative group pt-2">
                        <input 
                            type={showPassword ? "text" : "password"}
                            id="confirmPassword"
                            placeholder=" " 
                            className={`peer w-full px-5 py-[18px] rounded-2xl border bg-white/50 text-[#1A1A1A] focus:outline-none transition-all duration-300 pr-12 
                                ${isMatching ? 'border-emerald-200 focus:border-emerald-400 focus:ring-emerald-400' : 'border-[#F0F0F0] focus:border-[#E7A3B0] focus:ring-[#E7A3B0]'}`}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            suppressHydrationWarning
                        />
                        <label 
                            htmlFor="confirmPassword"
                            className="absolute left-5 top-1/2 -translate-y-1/2 text-[#999] font-medium text-[14px] transition-all duration-200 cursor-text pointer-events-none px-1.5 bg-white/0
                                      peer-focus:top-0 peer-focus:text-[12px] peer-focus:bg-white
                                      peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[12px] peer-[:not(:placeholder-shown)]:bg-white"
                            suppressHydrationWarning
                        >
                            Confirm Identity
                        </label>
                        {isMatching && (
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500">
                                <Check size={18} />
                            </div>
                        )}
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !isAllValid || !isMatching}
                        className="w-full relative bg-linear-to-r from-[#E7A3B0] to-[#E2899A] text-white font-bold py-[20px] rounded-2xl transition-all duration-300 mt-4 text-[15px] tracking-widest uppercase shadow-[0_12px_24px_-8px_rgba(231,163,176,0.6)] hover:shadow-[0_16px_32px_-8px_rgba(231,163,176,0.8)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none hover:-translate-y-0.5"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 size={18} className="animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            "Activate My Account"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

function ValidationItem({ isMet, label }: { isMet: boolean; label: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${isMet ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {isMet ? <Check size={12} strokeWidth={3} /> : <div className="w-1 h-1 rounded-full bg-current" />}
            </div>
            <span className={`text-[13px] transition-colors duration-300 ${isMet ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                {label}
            </span>
        </div>
    );
}
