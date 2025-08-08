'use client';
import React from 'react';
import Sidebar from '../../components/Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f7f9fb] text-[#171717]">
      <Sidebar />
      <main className="ml-0 lg:ml-64 flex-1 p-6 overflow-y-auto h-screen">{children}</main>
    </div>
  );
} 