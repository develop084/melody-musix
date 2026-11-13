import React, { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Role } from '../../types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'brand'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'outline'
    | 'purple'
    | 'cyan'
    | 'whatsapp'
    | 'saffron';
  role?: Role;
  size?: 'sm' | 'md';
  dot?: boolean;
  dotPulse?: boolean;
}

export function Badge({
  className,
  variant = 'default',
  role,
  size = 'sm',
  dot = false,
  dotPulse = false,
  children,
  ...props
}: BadgeProps) {
  let computedVariant = variant;

  if (role) {
    if (role === 'ADMIN') computedVariant = 'purple';
    else if (role === 'MANAGER') computedVariant = 'cyan';
    else computedVariant = 'default';
  }

  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    brand: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
    cyan: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
    purple: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    destructive: 'bg-rose-50 text-rose-700 border-rose-200 font-medium',
    whatsapp: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    saffron: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    outline: 'border-slate-300 text-slate-700 bg-transparent',
  };

  const dotColors = {
    default: 'bg-slate-400',
    brand: 'bg-blue-500',
    cyan: 'bg-blue-500',
    purple: 'bg-slate-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    destructive: 'bg-rose-500',
    whatsapp: 'bg-emerald-500',
    saffron: 'bg-amber-500',
    outline: 'bg-slate-400',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border text-xs font-medium tracking-normal transition-colors',
        variants[computedVariant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotColors[computedVariant])} />
        </span>
      )}
      {children || role}
    </span>
  );
}
