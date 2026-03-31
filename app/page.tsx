"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { LayoutGrid, ShoppingBag, Receipt, Wallet, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-[#050B18] flex flex-col items-center justify-center p-8 overflow-hidden relative font-outfit">
      {/* Dynamic Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[20%] w-[20%] h-[20%] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <main className="text-center max-w-5xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-16"
        >
          <div className="flex justify-center mb-10">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 0 }}
              initial={{ rotate: -12 }}
              className="w-28 h-28 bg-crispy-gradient rounded-[2.5rem] flex items-center justify-center shadow-3xl shadow-red-500/20 border border-white/20 relative"
            >
               <Image
                 src="/logo.png"
                 alt="Crunchy Time Logo"
                 width={112}
                 height={112}
                 className="w-full h-full object-contain p-2"
               />
               <motion.div 
                 animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="absolute -top-2 -right-2"
               >
                 <Sparkles className="w-8 h-8 text-yellow-400" />
               </motion.div>
            </motion.div>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black text-white tracking-tighter uppercase leading-none italic mb-6">
            Crunchy Time
          </h1>
          <p className="text-[12px] font-black text-red-500 tracking-[0.5em] uppercase mb-12 flex items-center justify-center gap-4 opacity-80">
             <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
             Store Management Intelligence
          </p>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: 0.2 }}
           className="flex flex-col sm:flex-row gap-6 justify-center mb-24"
        >
          <Link 
            href="/login" 
            className="group px-14 py-7 bg-crispy-gradient text-white text-sm font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-red-500/40 hover:shadow-red-500/60 transition-all hover:-translate-y-1 flex items-center gap-4"
          >
            Open Terminal <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Link>
          <div className="px-14 py-7 glass-card border-white/10 text-white/40 text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-4 hover:border-white/20 transition-all">
             <ShieldCheck className="w-5 h-5 text-blue-500" /> Secured Access
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          {[
            { icon: ShoppingBag, label: "Inventory", desc: "Real-time stock monitoring and replenishment intelligence" },
            { icon: Receipt, label: "Sales", desc: "Seamless digital and cash terminal transaction management" },
            { icon: Wallet, label: "Cash", desc: "Automated daily reconciliation and financial audit logs" },
          ].map((feature, i) => (
            <motion.div 
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="p-10 glass-card border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all group relative overflow-hidden"
            >
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                <feature.icon className="w-32 h-32" />
              </div>
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-8 text-red-500 border border-white/5 group-hover:scale-110 transition-transform shadow-inner">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-white uppercase italic mb-4">{feature.label}</h3>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-widest leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1 }}
          className="mt-24 text-[10px] font-black text-white/40 uppercase tracking-[0.6em] italic"
        >
          Built for the Future of Food Service • CRUNCHY TIME
        </motion.div>
      </main>
    </div>
  );
}
