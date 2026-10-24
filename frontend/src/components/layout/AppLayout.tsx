import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        <p>Spec-Driven Scalable Core Architecture • OpenAPI 3.1 • Express & React • RBAC Ready</p>
      </footer>
    </div>
  );
}
