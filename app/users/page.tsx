"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, UserPlus, Shield, Key, Trash2, ArrowLeft, 
  CheckCircle2, AlertTriangle, UserCircle, Settings, 
  Lock, LayoutGrid, Fingerprint, Activity, Clock
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useUsers, User, CustomPermissions } from "@/hooks/useUsers";
import { useMessage } from "@/hooks/useMessage";
import { UserTable } from "@/components/users/UserTable";
import { EditPermissionsModal, CreateUserModal, ResetPasswordModal, ViewPermissionsModal } from "@/components/users/UserModals";
import PremiumLoader from "@/components/PremiumLoader";
import { cn } from "@/lib/utils";

function UsersContent() {
  const { message, messageType, showMessage } = useMessage();

  // Data layer
  const {
    users,
    loading,
    currentUserId,
    updateRole,
    createUser,
    deleteUser,
    savePermissions,
    resetPermissions,
    resetPassword,
  } = useUsers(showMessage);

  // UI state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<"admin" | "staff">("staff");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedPermissionsRole, setSelectedPermissionsRole] = useState<
    "admin" | "staff" | null
  >(null);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleEditRole = (user: User) => {
    setEditingUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    try {
      await updateRole(editingUser.id, newRole);
      showMessage(
        "success",
        `Updated ${editingUser.display_name}'s role to ${newRole}`
      );
    } catch {
      showMessage("error", "Failed to update role");
    } finally {
      setEditingUser(null);
    }
  };

  const handleCreateUser = async (payload: {
    username: string;
    password: string;
    display_name: string;
    role: "admin" | "staff";
  }) => {
    await createUser(payload);
    showMessage(
      "success",
      `Created user! Username: ${payload.username} | Password: ${payload.password}`
    );
  };

  const handleDeleteUser = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to delete ${user.display_name}? This action cannot be undone.`
      )
    )
      return;
    try {
      await deleteUser(user);
      showMessage("success", `Deleted ${user.display_name}`);
    } catch {
      showMessage("error", "Failed to delete user");
    }
  };

  const handleSavePermissions = async (permissions: CustomPermissions) => {
    if (!editingPermissionsUser) return;
    try {
      await savePermissions(editingPermissionsUser.id, permissions);
      showMessage(
        "success",
        `Updated permissions for ${editingPermissionsUser.display_name}`
      );
    } catch {
      showMessage("error", "Failed to update permissions");
    } finally {
      setShowEditPermissionsModal(false);
      setEditingPermissionsUser(null);
    }
  };

  const handleResetPermissions = async () => {
    if (!editingPermissionsUser) return;
    if (
      !confirm(
        "Reset to default role permissions? This will remove all custom permissions."
      )
    )
      return;
    try {
      await resetPermissions(editingPermissionsUser.id);
      showMessage(
        "success",
        `Reset permissions for ${editingPermissionsUser.display_name}`
      );
    } catch {
      showMessage("error", "Failed to reset permissions");
    } finally {
      setShowEditPermissionsModal(false);
      setEditingPermissionsUser(null);
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!resetPasswordUser) return;
    await resetPassword(resetPasswordUser.id, newPassword);
    showMessage(
      "success",
      `Reset password for ${resetPasswordUser.display_name}. New password: ${newPassword}`
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 font-inter text-slate-200 overflow-x-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[10%] -left-[10%] w-[50%] h-[50%] bg-purple-900/30 blur-[150px] rounded-full" />
        <div className="absolute bottom-[20%] -right-[5%] w-[40%] h-[40%] bg-blue-900/30 blur-[130px] rounded-full" />
      </div>

      <div className="max-w-[1400px] mx-auto p-4 lg:p-12 space-y-12 relative z-10 pb-32">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-5 mb-4">
              <div className="w-14 h-14 bg-crispy-gradient rounded-2xl flex items-center justify-center shadow-3xl shadow-red-500/20 transform -rotate-6 border border-white/20 text-white overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Crunchy Time Logo"
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-4xl font-outfit font-black text-white tracking-tight uppercase leading-none italic">CRUNCHY TIME</h1>
                <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] mt-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  Team Management • {users.length} People
                </p>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCreateModal(true)}
              className="px-8 py-4 bg-crispy-gradient rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] text-white shadow-3xl shadow-red-500/20 flex items-center gap-3 border border-white/20"
            >
              <UserPlus className="w-4 h-4" /> Add New Person
            </motion.button>
            <Link href="/dashboard">
              <button className="p-4 bg-white/5 border border-white/10 rounded-2xl text-muted-foreground hover:text-white transition-all hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </header>

        {/* Message Banner */}
        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
               <div className={cn(
                "p-4 rounded-2xl border-white/10 flex items-center gap-4 mb-6",
                messageType === "success" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              )}>
                {messageType === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                <p className="text-[10px] font-black tracking-widest uppercase">{message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Info Pane (Sidebar) */}
          <div className="lg:col-span-1 space-y-8">
             <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }}
               className="glass-card p-8 border-white/5 space-y-6"
             >
                <div className="flex items-center gap-3">
                   <Shield className="w-5 h-5 text-purple-400" />
                   <h3 className="text-sm font-black text-white uppercase italic">Permissions</h3>
                </div>
                <div className="space-y-4">
                   <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover-lift cursor-default group transition-all">
                      <p className="text-[10px] font-black text-purple-400 uppercase mb-1">Admin</p>
                      <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">Full access to everything in the shop.</p>
                   </div>
                   <div className="p-4 bg-white/5 rounded-xl border border-white/5 hover-lift cursor-default group transition-all">
                      <p className="text-[10px] font-black text-green-400 uppercase mb-1">Staff</p>
                      <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">Access to selling food and adding expenses.</p>
                   </div>
                </div>
             </motion.div>

             <motion.div 
               initial={{ opacity: 0, y: 20 }} 
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="glass-card p-8 border-blue-500/10 bg-blue-500/5 space-y-6"
             >
                <div className="flex items-center gap-3">
                   <Fingerprint className="w-5 h-5 text-blue-400" />
                   <h3 className="text-sm font-black text-white uppercase italic">Status</h3>
                </div>
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Activity className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-white uppercase">Connection</p>
                      <p className="text-[9px] text-muted-foreground font-medium">It&apos;s working!</p>
                   </div>
                </div>
             </motion.div>
          </div>

          {/* Unit List Pane */}
          <div className="lg:col-span-3 space-y-10">
             <motion.div 
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               className="glass-card border-white/5 overflow-hidden"
             >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <div>
                      <h2 className="text-xl font-outfit font-black text-white uppercase italic tracking-tight">Team Members</h2>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">List of everyone on the team</p>
                   </div>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                         <div className="w-2 h-2 rounded-full bg-green-500" />
                         <span className="text-[9px] font-black text-white uppercase tracking-tighter">Connected</span>
                      </div>
                   </div>
                </div>

                <div className="p-2">
                  {loading ? (
                    <div className="py-24 text-center">
                       <PremiumLoader icon="zap" message="Fetching team..." />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="py-32 text-center opacity-20 flex flex-col items-center justify-center gap-4">
                      <Users className="w-16 h-16 text-white" />
                      <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">No one on the team yet</p>
                    </div>
                  ) : (
                    <UserTable
                      users={users}
                      currentUserId={currentUserId}
                      editingUserId={editingUser?.id ?? null}
                      newRole={newRole}
                      onNewRoleChangeAction={setNewRole}
                      onEditRoleAction={handleEditRole}
                      onSaveRoleAction={handleSaveRole}
                      onCancelEditAction={() => setEditingUser(null)}
                      onViewPermissionsAction={(role: "admin" | "staff") => {
                        setSelectedPermissionsRole(role);
                        setShowPermissionsModal(true);
                      }}
                      onEditPermissionsAction={(user: User) => {
                        setEditingPermissionsUser(user);
                        setShowEditPermissionsModal(true);
                      }}
                      onResetPasswordAction={(user: User) => {
                        setResetPasswordUser(user);
                        setShowPasswordResetModal(true);
                      }}
                      onDeleteUserAction={handleDeleteUser}
                    />
                  )}
                </div>
             </motion.div>
          </div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────── */}

      {showCreateModal && (
        <CreateUserModal
          onSubmit={handleCreateUser}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {showPermissionsModal && selectedPermissionsRole && (
        <ViewPermissionsModal
          role={selectedPermissionsRole}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedPermissionsRole(null);
          }}
        />
      )}

      {showEditPermissionsModal && editingPermissionsUser && (
        <EditPermissionsModal
          user={editingPermissionsUser}
          onSave={handleSavePermissions}
          onReset={handleResetPermissions}
          onClose={() => {
            setShowEditPermissionsModal(false);
            setEditingPermissionsUser(null);
          }}
        />
      )}

      {showPasswordResetModal && resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onSave={handleResetPassword}
          onClose={() => {
            setShowPasswordResetModal(false);
            setResetPasswordUser(null);
          }}
        />
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UsersContent />
    </ProtectedRoute>
  );
}
