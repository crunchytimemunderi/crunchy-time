"use client";

import Link from "next/link";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { motion } from "framer-motion";
import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Shield, 
  Lock, 
  ArrowLeft, 
  Bell, 
  Database, 
  LayoutGrid,
  ChevronRight,
  UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

function SettingsContent() {
  const { userData, user } = useAuth();

  return (
    <div className="min-h-screen bg-[#050B18] text-white overflow-x-hidden relative font-outfit">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-900/30 blur-[150px] rounded-full" />
        <div className="absolute bottom-[20%] -right-[5%] w-[40%] h-[40%] bg-red-900/30 blur-[130px] rounded-full" />
      </div>

      <div className="max-w-[1200px] mx-auto p-4 lg:p-12 space-y-12 relative z-10 pb-32">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-5 mb-4">
              <div className="w-14 h-14 bg-crispy-gradient rounded-2xl flex items-center justify-center shadow-3xl shadow-red-500/20 transform -rotate-6 border border-white/20 text-white overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Crunchy Time"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-4xl font-outfit font-black text-white tracking-tight uppercase leading-none italic">CRUNCHY TIME</h1>
                <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] mt-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Device Configuration • PROFILE
                </p>
              </div>
            </div>
          </motion.div>

          <Link href="/dashboard">
            <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-muted-foreground hover:text-white uppercase tracking-widest transition-all flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Exit
            </button>
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           {/* Sidebar Info */}
           <div className="lg:col-span-4 space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-10 border-white/5 space-y-8 text-center"
              >
                  <div className="w-24 h-24 bg-crispy-gradient rounded-3xl mx-auto flex items-center justify-center text-4xl font-outfit font-black text-white shadow-2xl">
                    {(userData?.displayName || user?.email)?.[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-outfit font-black text-white uppercase italic">{userData?.displayName || "USER"}</h3>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em] mt-2">{userData?.role || "Staff"}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40">System ID</p>
                    <p className="text-[11px] font-mono text-white opacity-60 break-all">{user?.id}</p>
                  </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-8 border-red-500/20 bg-red-500/5"
              >
                 <div className="flex items-center gap-4 mb-4">
                    <Shield className="w-5 h-5 text-red-500" />
                    <h4 className="text-xs font-black text-white uppercase italic">Security Shield</h4>
                 </div>
                 <p className="text-[10px] text-muted-foreground leading-relaxed">Your data is synced with the main shop ledger in real-time. Unauthorized changes are flagged instantly.</p>
              </motion.div>
           </div>

           {/* Main Settings */}
           <div className="lg:col-span-8 space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-10 border-white/5 space-y-8"
              >
                 <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                    <UserCircle className="w-6 h-6 text-blue-400" />
                    <h3 className="text-xl font-outfit font-black text-white uppercase italic">About You</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Primary Email</p>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white italic opacity-60">
                        {user?.email}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Display Name</p>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-black text-white italic">
                        {userData?.displayName || "NOT SET"}
                      </div>
                    </div>
                 </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-10 border-white/5 space-y-8"
              >
                 <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                    <Lock className="w-6 h-6 text-red-400" />
                    <h3 className="text-xl font-outfit font-black text-white uppercase italic">Security Logic</h3>
                 </div>

                 <Link href="/settings/password">
                   <div className="group bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/[0.08] hover:border-white/20 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-xl group-hover:scale-110 group-hover:rotate-6 transition-all border border-red-500/20">
                            <Lock className="w-6 h-6" />
                         </div>
                         <div>
                            <h4 className="text-lg font-outfit font-black text-white uppercase italic">Credential Sync</h4>
                            <p className="text-[10px] font-black text-muted-foreground uppercase mt-1">Get a new password for this login</p>
                         </div>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-white group-hover:translate-x-2 transition-all" />
                   </div>
                 </Link>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-10 border-white/5 space-y-8"
              >
                 <div className="flex items-center gap-4 border-b border-white/5 pb-6 font-outfit font-black text-white uppercase italic">
                    <SettingsIcon className="w-6 h-6 text-purple-400" /> Future Logic
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 opacity-40">
                    {[
                      { icon: Bell, label: "Signals" },
                      { icon: Database, label: "Archive" },
                      { icon: SettingsIcon, label: "Theme" }
                    ].map((item) => (
                      <div key={item.label} className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center space-y-4">
                        <item.icon className="w-6 h-6 mx-auto text-muted-foreground" />
                        <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                      </div>
                    ))}
                 </div>
              </motion.div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
