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
    default: 'bg-slate-800/80 text-slate-300 border-slate-700/80',
    success: 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60',
    warning: 'bg-amber-950/60 text-amber-400 border-amber-700/60',
    destructive: 'bg-red-950/60 text-red-400 border-red-700/60',
    outline: 'border-slate-700 text-slate-300 bg-transparent',
    purple: 'bg-purple-950/60 text-purple-300 border-purple-700/60 font-semibold',
    cyan: 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60 font-semibold',
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
