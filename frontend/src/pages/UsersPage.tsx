import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../api/users';
import { User, Role } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';
import { ShieldCheck, UserCheck, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

export function UsersPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Role Edit Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<Role>('USER');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await usersApi.updateUserRole(selectedUser.id, newRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSuccessMessage(`Successfully updated ${updated.name}'s role to ${updated.role}`);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setIsUpdating(false);
    }
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            User Management & RBAC Roster
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enforces granular role permissions: Administrators can modify roles; Managers have audit access.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} isLoading={isLoading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh Roster
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" title="Operation Error">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Role Updated">
          {successMessage}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Registered System Users</CardTitle>
              <CardDescription>
                {users.length} registered accounts loaded from backend
              </CardDescription>
            </div>
            {!isAdmin && (
              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Read-Only Mode (Manager Scope)
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Effective Permissions</th>
                  <th className="px-4 py-3">Registered Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 uppercase">
                            {u.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge role={u.role} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.permissions.slice(0, 3).map((perm) => (
                            <span key={perm} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                              {perm}
                            </span>
                          ))}
                          {u.permissions.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{u.permissions.length - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {isAdmin ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRoleModal(u)}
                            className="text-xs"
                          >
                            Change Role
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No Edit Rights</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Modification Modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="Modify User Role"
        description={`Update the assigned role and permissions for ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
            <p>
              <strong>Email:</strong> {selectedUser?.email}
            </p>
            <p>
              <strong>Current Role:</strong> <Badge role={selectedUser?.role} />
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Select New Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as Role)}
              className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="USER">USER (Standard Member)</option>
              <option value="MANAGER">MANAGER (Operations & Auditor)</option>
              <option value="ADMIN">ADMIN (Full Superuser Privileges)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateRole} isLoading={isUpdating}>
              <UserCheck className="w-4 h-4 mr-1.5" />
              Save New Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
