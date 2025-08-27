'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '../hooks/useUser';
import { logout } from '../lib/auth';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, 
  CheckSquare, 
  Users, 
  Calendar, 
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Building,
  ChevronRight,
  ChartColumnBig,
  FolderKanban
} from 'lucide-react';
import Image from 'next/image';
export default function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, user, loading, role } = useUser();
  const router = useRouter();
  const { setUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Interface différente selon le rôle
  let navItems = [];
  
  if (isAdmin) {
    // Interface complète pour les admins
    navItems = [
      { href: '/dashboard/projects', label: 'Projects', icon: FolderOpen },
      { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
      { href: '/dashboard/statistics', label: 'Statistics', icon: ChartColumnBig },
      { href: '/dashboard/task-load-overview', label: 'Task Load Overview', icon: FolderKanban },
      { href: '/dashboard/reports', label: 'Reports', icon: Settings },
      { href: '/dashboard/users', label: 'Users', icon: Users },
      { href: '/dashboard/groups', label: 'Groups', icon: Building },
      { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    ];
  } else {
    // Interface simplifiée pour Members et Guests
    navItems = [
      { href: '/dashboard/my-work', label: 'My Work', icon: FolderOpen },
      { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
    ];
  }

  const handleLogout = async () => {
    // Optimistic clear of local state to avoid UI flicker/loops
    try { setUser(null); } catch (_) {}
    try {
      if (typeof window !== 'undefined') {
        Object.keys(window.localStorage)
          .filter(k => k.startsWith('tach:lastRole:') || k === 'tach:lastRole')
          .forEach(k => window.localStorage.removeItem(k));
      }
    } catch (_) {}
    try { await logout(); } catch (_) {}
    router.replace('/login');
  };

  // Afficher un loader pendant le chargement initial OU tant que le rôle n'est pas encore résolu
  if (loading || (user && role == null)) {
    return (
      <aside className="h-screen bg-white border-r border-gray-200 flex flex-col w-64 min-w-[200px]">
        <div className="flex items-center justify-center h-16 text-xl font-bold tracking-wide border-b border-gray-200">
          <Image src="/asbuLogo.png" alt="Logo" width={100} height={100} />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        </div>
      </aside>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between  p-4 border-b border-gray-200">
      <Image src="/asbuLogo.png" alt="Logo" width={200} height={200} className=''/>
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
        >
          <X size={20} className="text-gray-600" />
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-2 p-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <motion.div
              key={item.href}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-xl font-medium transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon size={18} className={`transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <ChevronRight size={16} className="text-blue-600 ml-auto" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>
      
      {/* User Section */}
      {user && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border-t border-gray-200"
        >
              <div className="mb-5 p-5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Logged in as suisisdsfj</div>
                <div className="text-gray-900 font-medium truncate break-all max-w-[150px]">{user.email}</div>
              </div>
            </div>
                <div className="text-xs text-blue-600 font-medium">
                  {isAdmin ? 'Administrator' : (role == null ? 'Resolving role…' : 'Member')}
                </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            data-cy="logout-button"
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3.5 px-5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Sign Out
          </motion.button>
        </motion.div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        <Menu size={20} className="text-gray-600" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-0 h-full bg-white border-r border-gray-200 flex flex-col w-80 z-50 overflow-y-auto"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 min-w-[280px] bg-white border-r border-gray-200 flex-col overflow-y-auto z-30">
        <SidebarContent />
      </aside>
    </>
  );
} 