"use client";

import { User } from "@/hooks/useUsers";
import { 
  Shield, User as UserIcon, ShieldCheck, 
  Key as KeyIcon, Trash2, Edit3, Eye, MoreHorizontal,
  ChevronRight, Award, Fingerprint, Lock as LockIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UserTableProps {
  users: User[];
  currentUserId: string | undefined;
  editingUserId: string | null;
  newRole: "admin" | "staff";
  onNewRoleChangeAction: (role: "admin" | "staff") => void;
  onEditRoleAction: (user: User) => void;
  onSaveRoleAction: () => void;
  onCancelEditAction: () => void;
  onViewPermissionsAction: (role: "admin" | "staff") => void;
  onEditPermissionsAction: (user: User) => void;
  onResetPasswordAction: (user: User) => void;
  onDeleteUserAction: (user: User) => void;
}

export function UserTable({
  users,
  currentUserId,
  editingUserId,
  newRole,
  onNewRoleChangeAction,
  onEditRoleAction,
  onSaveRoleAction,
  onCancelEditAction,
  onViewPermissionsAction,
  onEditPermissionsAction,
  onResetPasswordAction,
  onDeleteUserAction,
}: UserTableProps) {
  return (
    <div className="space-y-4 p-4">
      {users.map((user, index) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: 10, backgroundColor: "rgba(255,255,255,0.06)" }}
          whileTap={{ scale: 0.995 }}
          transition={{ 
            delay: index * 0.05,
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
          className={cn(
            "glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group transition-colors border-white/5 relative overflow-hidden active-scale",
            user.id === currentUserId && "border-blue-500/20 bg-blue-500/5 shadow-2xl shadow-blue-500/5"
          )}
        >
          {/* Subtle Background Glow on Hover */}
          <div className="absolute inset-0 bg-crispy-gradient opacity-0 group-hover:opacity-[0.03] transition-opacity pointer-events-none" />

          {/* Unit Identity */}
          <div className="flex items-center gap-5 min-w-[250px] relative z-10">
            <div className="relative">
               <motion.div 
                 whileHover={{ rotate: 5, scale: 1.1 }}
                 className={cn(
                   "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-outfit font-black text-xl shadow-xl transform transition-transform",
                   user.role === "admin" ? "bg-crispy-gradient shadow-red-500/20" : "bg-white/10"
                 )}
               >
                 {user.display_name.charAt(0).toUpperCase()}
               </motion.div>
               {user.id === currentUserId && (
                 <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-950 flex items-center justify-center glow-pulse shadow-lg shadow-blue-500/40">
                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                 </div>
               )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white uppercase italic tracking-tight">{user.display_name}</h4>
                {user.id === currentUserId && (
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded-md border border-blue-500/20">
                    Self
                  </span>
                )}
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1 italic">
                 @{user.username} • Joined {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Authorization Tier */}
          <div className="flex items-center gap-8">
            <div className="min-w-[120px]">
              {editingUserId === user.id ? (
                <div className="relative group/select">
                   <select
                    aria-label="Change user role"
                    value={newRole}
                    onChange={(e) => onNewRoleChangeAction(e.target.value as "admin" | "staff")}
                    className="w-full h-10 px-4 bg-slate-900 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white tracking-widest focus:ring-2 focus:ring-red-500 appearance-none cursor-pointer"
                  >
                    <option value="admin">ADMIN TIER</option>
                    <option value="staff">OPERATOR TIER</option>
                  </select>
                  <ChevronRight className="absolute right-3 top-3 w-4 h-4 text-muted-foreground rotate-90 pointer-events-none" />
                </div>
              ) : (
                <div className={cn(
                  "px-4 py-2 rounded-xl border flex items-center gap-2",
                  user.role === "admin" 
                    ? "bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]" 
                    : "bg-green-500/10 border-green-500/20 text-green-400"
                )}>
                  {user.role === "admin" ? <Award className="w-3 h-3" /> : <Fingerprint className="w-3 h-3" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {user.role === "admin" ? "Admin" : "Staff"}
                  </span>
                </div>
              )}
            </div>

            <div className="h-8 w-px bg-white/5 hidden md:block" />

            <div className="flex items-center gap-4">
              <button
                onClick={() => onViewPermissionsAction(user.role)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-blue-400 hover:border-blue-500/30 transition-all group/btn"
              >
                <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => onEditPermissionsAction(user)}
                className={cn(
                  "px-4 h-10 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2",
                  user.custom_permissions ? "text-purple-400 border-purple-500/30" : "text-muted-foreground"
                )}
              >
                <LockIcon className="w-3 h-3" />
                {user.custom_permissions ? "Custom" : "Edit"}
              </button>
            </div>
          </div>

          {/* Final Actions */}
          <div className="flex items-center justify-end gap-3 min-w-[200px]">
             {editingUserId === user.id ? (
                <div className="flex gap-2 w-full">
                   <button
                    onClick={onSaveRoleAction}
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-500/20"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={onCancelEditAction}
                    className="flex-1 py-3 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
             ) : (
                <>
                  <button
                    onClick={() => onResetPasswordAction(user)}
                    className="p-3 bg-white/5 border border-white/10 rounded-xl text-muted-foreground hover:text-orange-400 hover:bg-orange-400/10 hover:border-orange-500/30 transition-all flex items-center gap-2"
                  >
                    <KeyIcon className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase hidden lg:inline">Reset</span>
                  </button>
                  
                  <button
                    onClick={() => onEditRoleAction(user)}
                    disabled={user.id === currentUserId}
                    className={cn(
                      "p-3 rounded-xl transition-all flex items-center gap-2",
                      user.id === currentUserId 
                        ? "bg-transparent text-muted-foreground opacity-20 cursor-not-allowed" 
                        : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
                    )}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteUserAction(user)}
                    disabled={user.id === currentUserId}
                    className={cn(
                      "p-3 rounded-xl shadow-lg transition-all flex items-center gap-2",
                      user.id === currentUserId 
                        ? "bg-transparent text-muted-foreground opacity-20 cursor-not-allowed" 
                        : "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
             )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
