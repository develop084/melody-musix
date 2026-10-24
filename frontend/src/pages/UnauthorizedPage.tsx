import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export function UnauthorizedPage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="max-w-md w-full text-center border-slate-200 shadow-xl shadow-slate-200/50">
        <CardHeader className="items-center pb-2">
          <div className="h-14 w-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
            <ShieldX className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl text-slate-900">403 - Access Denied</CardTitle>
          <CardDescription>
            You lack sufficient role permissions to view or interact with this resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold uppercase">Current Role:</span>
              <Badge role={user?.role} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold uppercase">User Email:</span>
              <span className="font-medium text-slate-800">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link to="/">
              <Button size="md">
                <Home className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
