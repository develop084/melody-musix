import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: ReactNode;
  badge?: string;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  className,
  size = 'sm',
}: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className={cn('border-b border-slate-200 flex gap-4', className)}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex items-center gap-2 pb-2.5 font-medium text-xs sm:text-sm border-b-2 transition-all cursor-pointer',
                isActive
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                    isActive ? 'bg-slate-200 text-slate-900 font-medium' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Pill / Segmented variant (Untitled UI style)
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/80',
        className
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg font-medium transition-all duration-150 select-none cursor-pointer',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs sm:text-sm',
              isActive
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-transparent'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-mono',
                  isActive ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-slate-200 text-slate-600'
                )}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
