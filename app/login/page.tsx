"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCircle, Lock, ArrowRight, ChevronLeft, Sparkles, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 2 * 60 * 1000;

import AnimatedMascot, { MascotMood } from "@/components/AnimatedMascot";




export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [mascotMood, setMascotMood] = useState<MascotMood>("idle");

  const router = useRouter();
  const { signIn, user } = useAuth();

  // Restore lockout
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("loginLockout");
      if (stored) {
        const { until, attempts } = JSON.parse(stored);
        if (until && until > Date.now()) {
          setLockedUntil(until);
          setLoginAttempts(attempts || MAX_LOGIN_ATTEMPTS);
        } else {
          sessionStorage.removeItem("loginLockout");
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) { setLockoutRemaining(0); return; }
    const update = () => {
      const remaining = Math.max(0, lockedUntil - Date.now());
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLoginAttempts(0);
        sessionStorage.removeItem("loginLockout");
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  // Return mascot to idle after transient states
  useEffect(() => {
    if (mascotMood === "success" || mascotMood === "error") {
      const t = setTimeout(() => setMascotMood("idle"), 3000);
      return () => clearTimeout(t);
    }
  }, [mascotMood]);

  const triggerDailyBackup = useCallback(async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      if (localStorage.getItem("lastBackupDate") === today) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch("/api/cron/daily-backup", {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const cd = response.headers.get("Content-Disposition");
        const fn = cd?.match(/filename="(.+)"/)?.[1] ?? `Backup_${today}.xlsx`;
        a.download = fn;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        localStorage.setItem("lastBackupDate", today);
      }
    } catch (err) { logger.error("Backup error:", err); }
  }, []);

  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  const isLockedOut = lockedUntil !== null && lockedUntil > Date.now();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setError("");
    setCurrentStep(2);
    setMascotMood("hiding");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (isLockedOut) return;
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setError("Login is taking too long. Please refresh.");
      setLoading(false);
    }, 15000);

    try {
      const loginEmail = username.includes("@")
        ? username.toLowerCase()
        : `${username.toLowerCase().replace(/[^a-z0-9_]/g, "")}@crunchy-times.local`;
      await signIn(loginEmail, password);
      clearTimeout(timeoutId);
      setLoginAttempts(0);
      setLockedUntil(null);
      sessionStorage.removeItem("loginLockout");
      setMascotMood("success");
      setLoading(false);
      triggerDailyBackup().catch(() => {});
    } catch (err: any) {
      clearTimeout(timeoutId);
      setLoading(false);
      setMascotMood("error");
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const until = Date.now() + LOCKOUT_DURATION_MS;
        setLockedUntil(until);
        sessionStorage.setItem("loginLockout", JSON.stringify({ until, attempts: newAttempts }));
        setError("Too many attempts. Please wait 2 minutes.");
        return;
      }
      setError(`Incorrect credentials. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempt${MAX_LOGIN_ATTEMPTS - newAttempts !== 1 ? "s" : ""} remaining.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B18] text-white flex items-center justify-center p-4 relative overflow-hidden font-outfit">
      {/* Multi-layer dark ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[5%] left-[5%] w-[45%] h-[45%] bg-red-900/20 blur-[160px] rounded-full" />
        <div className="absolute bottom-[10%] right-[5%] w-[35%] h-[35%] bg-amber-900/15 blur-[130px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-950/20 blur-[200px] rounded-full" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 xl:gap-16 items-center relative z-10">

        {/* ─── LEFT: Mascot Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex flex-col items-center"
        >
          <AnimatedMascot mood={mascotMood} className="max-w-[400px]" />

          {/* Brand identity */}
          <motion.div
            className="text-center mt-6 space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🍗</span>
              <h2 className="text-2xl font-black text-white italic tracking-tight">CRUNCHY TIME</h2>
            </div>
            <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.25em]">
              Administrative Portal • Secure Access
            </p>
          </motion.div>
        </motion.div>

        {/* ─── RIGHT: Form Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="w-full max-w-md mx-auto"
        >
          {/* Mobile: small emoji mascot strip */}
          <motion.div
            className="md:hidden flex items-center justify-center mb-6"
          >
            <AnimatedMascot mood={mascotMood} size="sm" />
          </motion.div>

          {/* Card */}
          <div className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 md:p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-crispy-gradient rounded-t-[2rem]" />
            {/* Subtle inner glow */}
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-red-500/[0.06] to-transparent pointer-events-none rounded-t-[2rem]" />

            {/* Step dots */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex gap-1.5">
                <motion.div
                  animate={{ width: currentStep === 1 ? 24 : 8, backgroundColor: currentStep >= 1 ? "hsl(5,85%,55%)" : "rgba(255,255,255,0.1)" }}
                  transition={{ duration: 0.3 }}
                  className="h-2 rounded-full"
                />
                <motion.div
                  animate={{ width: currentStep === 2 ? 24 : 8, backgroundColor: currentStep >= 2 ? "hsl(5,85%,55%)" : "rgba(255,255,255,0.1)" }}
                  transition={{ duration: 0.3 }}
                  className="h-2 rounded-full"
                />
              </div>
              <span className="text-[10px] font-black text-white/25 uppercase tracking-widest">
                Step {currentStep} of 2
              </span>
            </div>

            {/* Title */}
            <div className="mb-7">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={currentStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-3xl font-black text-white italic tracking-tight"
                >
                  {currentStep === 1 ? "Who's there? 👀" : "Secret PIN 🔐"}
                </motion.h1>
              </AnimatePresence>
              <p className="text-[11px] font-black text-white/25 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {currentStep === 1 ? "Identify yourself to proceed" : `Hey ${username}! Enter your PIN`}
              </p>
            </div>

            {/* Lockout */}
            {isLockedOut && (
              <div className="mb-5 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center space-y-2">
                <p className="text-orange-400 text-[10px] font-black uppercase tracking-widest">
                  🔒 Locked for {Math.ceil(lockoutRemaining / 1000)}s
                </p>
                <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-orange-500 h-full transition-all duration-1000"
                    style={{ width: `${(lockoutRemaining / LOCKOUT_DURATION_MS) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <p className="text-red-400 text-[11px] font-black uppercase tracking-tight">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form steps */}
            <AnimatePresence mode="wait">
              {currentStep === 1 ? (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  onSubmit={handleNextStep}
                  className="space-y-5"
                >
                  <div className="group">
                    <label className="text-[10px] font-black text-white/25 uppercase tracking-widest block mb-2 pl-1">
                      Identity Code
                    </label>
                    <div className="relative">
                      <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-red-400 transition-colors pointer-events-none" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onFocus={() => setMascotMood("typing")}
                        onBlur={() => { if (mascotMood === "typing") setMascotMood("idle"); }}
                        placeholder="USERNAME OR EMAIL"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-white placeholder:text-white/15 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/30 transition-all uppercase tracking-tight"
                        required
                        disabled={isLockedOut}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLockedOut || !username}
                    whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(239,68,68,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full bg-crispy-gradient text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 border border-white/10 flex items-center justify-center gap-3 disabled:opacity-40 transition-all"
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                           <div className="w-full h-full border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                        <span>IDENTIFYING...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                         <span>IDENTIFY ME</span>
                         <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </motion.button>
                </motion.form>
              ) : (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  onSubmit={handleLogin}
                  className="space-y-5"
                >
                  <div className="group">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-black text-white/25 uppercase tracking-widest pl-1">
                        Secret PIN
                      </label>
                      <button
                        type="button"
                        onClick={() => { setCurrentStep(1); setMascotMood("idle"); }}
                        className="text-[10px] font-black text-white/25 hover:text-white/60 uppercase tracking-wider flex items-center gap-1 transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" /> Change ID
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-red-400 transition-colors pointer-events-none" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setMascotMood("hiding")}
                        onBlur={() => { if (mascotMood === "hiding") setMascotMood("idle"); }}
                        placeholder="••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500/30 transition-all"
                        required
                        autoFocus
                        disabled={isLockedOut}
                      />
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={loading || isLockedOut || !password}
                    whileHover={{ scale: 1.02, boxShadow: "0 20px 40px -10px rgba(239,68,68,0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full bg-crispy-gradient text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-red-500/20 border border-white/10 flex items-center justify-center gap-3 disabled:opacity-40 transition-all"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        AUTHORIZING...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        UNLOCK SYSTEM <Sparkles className="w-4 h-4" />
                      </span>
                    )}
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <Link
                href="/"
                className="text-[10px] font-black text-white/20 hover:text-white/50 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </Link>
              <p className="text-[8px] font-black text-white/15 uppercase tracking-[0.2em]">
                🔒 Encrypted • Authorized Only
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
