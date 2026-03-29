"use client";

import { User } from "@/hooks/useUsers";

interface UserTableProps {
  users: User[];
  currentUserId: string | undefined;
  editingUserId: string | null;
  newRole: "admin" | "staff";
  onNewRoleChange: (role: "admin" | "staff") => void;
  onEditRole: (user: User) => void;
  onSaveRole: () => void;
  onCancelEdit: () => void;
  onViewPermissions: (role: "admin" | "staff") => void;
  onEditPermissions: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDeleteUser: (user: User) => void;
}

/**
 * Presentational table listing all system users with inline role editing.
 */
export function UserTable({
  users,
  currentUserId,
  editingUserId,
  newRole,
  onNewRoleChange,
  onEditRole,
  onSaveRole,
  onCancelEdit,
  onViewPermissions,
  onEditPermissions,
  onResetPassword,
  onDeleteUser,
}: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {["User", "Username", "Role", "Permissions", "Joined", "Actions"].map(
              (col) => (
                <th
                  key={col}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  {col}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => (
            <tr
              key={user.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {/* User cell */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="font-medium">
                    {user.display_name}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                        (You)
                      </span>
                    )}
                  </div>
                </div>
              </td>

              {/* Username cell */}
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                @{user.username}
              </td>

              {/* Role cell */}
              <td className="px-6 py-4 whitespace-nowrap">
                {editingUserId === user.id ? (
                  <select
                    aria-label="Change user role"
                    value={newRole}
                    onChange={(e) =>
                      onNewRoleChange(e.target.value as "admin" | "staff")
                    }
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="staff">Staff</option>
                  </select>
                ) : (
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === "admin"
                        ? "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                        : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                    }`}
                  >
                    {user.role === "admin" ? "👑 Admin" : "👤 Staff"}
                  </span>
                )}
              </td>

              {/* Permissions cell */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewPermissions(user.role)}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm"
                  >
                    View
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => onEditPermissions(user)}
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium text-sm"
                  >
                    {user.custom_permissions ? "✏️ Edit (Custom)" : "✏️ Edit"}
                  </button>
                </div>
              </td>

              {/* Joined cell */}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {new Date(user.created_at).toLocaleDateString()}
              </td>

              {/* Actions cell */}
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {editingUserId === user.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={onSaveRole}
                      className="text-green-600 hover:text-green-800 dark:text-green-400 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-400 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => onEditRole(user)}
                      disabled={user.id === currentUserId}
                      className={`font-medium ${
                        user.id === currentUserId
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      }`}
                    >
                      {user.id === currentUserId ? "Cannot edit" : "Edit"}
                    </button>
                    <button
                      onClick={() => onResetPassword(user)}
                      className="text-orange-600 hover:text-orange-800 dark:text-orange-400 font-medium"
                    >
                      🔑 Reset PW
                    </button>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => onDeleteUser(user)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
