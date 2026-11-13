import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="flex-1 w-full max-w-[1560px] mx-auto px-2 sm:px-4 py-3 sm:py-4">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-3 bg-white text-center text-slate-500">
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
          <span className="font-medium text-slate-700">Melody Studio</span>
          <span>—</span>
          <span>Web Audio Editor</span>
        </div>
      </footer>
    </div>
  );
}
