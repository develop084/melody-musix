import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100/70 text-slate-900 font-sans">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 bg-white text-center text-xs text-slate-500">
        <p>Melody Studio • YouTube Audio Sampler & Multitrack Mashup Workstation • Web Audio & LAME MP3 Engine</p>
      </footer>
    </div>
  );
}
