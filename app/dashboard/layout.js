'use client';
import React from 'react';
import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <>
      <div className="fixed left-0 top-0 h-screen w-64 bg-[#18181b] z-20">
        <Sidebar />
      </div>
      <main className="min-h-screen pl-64 p-6 bg-background">
        {children}
      </main>
    </>
  );
} 