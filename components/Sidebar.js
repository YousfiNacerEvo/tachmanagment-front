'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { logout } from '../lib/auth';
import { useRouter } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, user, setUser } = useAuth();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard/projects', label: 'Projects', icon: '📁' },
    { href: '/dashboard/tasks', label: 'Tasks', icon: '✅' },
    { href: '/dashboard/calendar', label: 'Calendar', icon: '📅' },
  ];
  if (isAdmin) {
    navItems.push({ href: '/dashboard/add-user', label: 'Add User', icon: '➕' });
  }

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.replace('/login');
  };

  return (
    <aside className="h-screen bg-[#18181b] text-white flex flex-col w-64 min-w-[200px] border-r border-[#232329]">
      <div className="flex items-center justify-center h-20 text-2xl font-bold tracking-wide border-b border-[#232329]">
        MyApp
      </div>
      <nav className="flex-1 flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors font-medium text-base
                ${isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      {user && (
        <button
          onClick={handleLogout}
          className="m-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition-colors"
        >
          Log out
        </button>
      )}
    </aside>
  );
} 