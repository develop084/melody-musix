import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Role } from '../../types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'purple' | 'cyan';
  role?: Role;
}

export function Badge({ className, variant = 'default', role, children, ...props }: BadgeProps) {
  let computedVariant = variant;

  if (role) {
    if (role === 'ADMIN') computedVariant = 'purple';
    else if (role === 'MANAGER') computedVariant = 'cyan';
    else computedVariant = 'default';
  }

  const variants = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    destructive: 'bg-red-50 text-red-700 border-red-200',
    outline: 'border-slate-300 text-slate-700 bg-transparent',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 font-semibold',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors',
        variants[computedVariant],
        className
      )}
      {...props}
    >
      {children || role}
    </span>
  );
}
