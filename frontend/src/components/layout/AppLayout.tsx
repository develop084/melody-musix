import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0d13] text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 w-full max-w-[1560px] mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800/60 py-2.5 bg-[#08090d] text-center text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 font-mono text-[10px] text-slate-500">
          <span className="text-slate-400 font-semibold tracking-wider">MELODY STUDIO PRO</span>
          <span>•</span>
          <span>44.1 kHz 16-BIT DSP ENGINE</span>
          <span>•</span>
          <span>REAL-TIME NON-DESTRUCTIVE SEQUENCER</span>
        </div>
      </footer>
    </div>
  );
}
