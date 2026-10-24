import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants = {
      primary: 'bg-cyan-600 text-slate-950 font-bold hover:bg-cyan-500 active:bg-cyan-700 shadow-sm shadow-cyan-900/30',
      secondary: 'bg-slate-800 text-slate-200 hover:bg-slate-750 hover:text-white active:bg-slate-700 border border-slate-700/80',
      destructive: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 shadow-sm',
      outline: 'border border-slate-700/80 bg-slate-900/40 text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700',
      ghost: 'bg-transparent text-slate-400 hover:bg-slate-850 hover:text-slate-200 active:bg-slate-800',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
