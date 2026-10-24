import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { dashboardApi } from '../api/dashboard';
import { DashboardStats } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import {
  Users,
  Activity,
  ShieldAlert,
  Server,
  KeyRound,
  FileCode2,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            System overview and role-based access control state.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchStats} isLoading={isLoading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh Metrics
          </Button>
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <Link to="/users">
              <Button size="sm">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                Manage Users
              </Button>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" title="Metric Load Error">
          {error}
        </Alert>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Total Registered Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : stats?.totalUsers ?? 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Managed accounts in SQLite / Postgres</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : stats?.activeUsers ?? 0}
            </div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Valid refresh tokens active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Server Health</CardTitle>
            <Server className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : stats?.systemStatus ?? 'OK'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Uptime: {stats?.serverUptime ?? 'N/A'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-slate-500">Your Assigned Role</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mt-1">
              <Badge role={user?.role} className="text-sm py-1 px-3" />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {user?.role === 'ADMIN'
                ? 'Full superuser privileges'
                : user?.role === 'MANAGER'
                ? 'Roster view & audit scope'
                : 'Standard personal scope'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dual Grid: Permissions Inspector & Spec Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Identity & RBAC Permissions Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-blue-600" />
                  Active Security & RBAC Context
                </CardTitle>
                <CardDescription>
                  Resolved permissions attached to your current JWT access token
                </CardDescription>
              </div>
              <Badge role={user?.role} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">User ID</span>
                <p className="font-mono text-xs text-slate-700 truncate">{user?.id}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Email</span>
                <p className="text-xs text-slate-700 font-medium truncate">{user?.email}</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                Granted Permissions ({user?.permissions.length ?? 0})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {user?.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-mono text-xs border border-blue-200"
                  >
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Spec-Driven Architecture Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-emerald-600" />
              Spec-Driven Development Architecture
            </CardTitle>
            <CardDescription>
              Contract-first synchronization between OpenAPI, Backend, and Frontend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Single Source of Truth:</strong> OpenAPI 3.1 specification at{' '}
                  <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-800">spec/openapi.yaml</code>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Auto Type Generation:</strong> Compile contracts into TypeScript interfaces with{' '}
                  <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-800">npm run codegen</code>
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Token Rotation:</strong> Short-lived access token (15m) + revocable refresh token (7d)
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Zustand State Store:</strong> Atomic authentication store with automatic 401 retry interceptor
                </span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="http://localhost:4000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Inspect Live OpenAPI 3.1 Swagger UI Documentation &rarr;
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
