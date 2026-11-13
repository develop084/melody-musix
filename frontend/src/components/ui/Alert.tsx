import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'destructive';
  title?: string;
}

export function Alert({ className, variant = 'info', title, children, ...props }: AlertProps) {
  const icons = {
    info: <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />,
    destructive: <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />,
  };

  const variants = {
    info: 'bg-slate-50 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    destructive: 'bg-rose-50 text-rose-900 border-rose-200',
  };

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-xl border p-4 text-sm flex gap-3', variants[variant], className)}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
}
