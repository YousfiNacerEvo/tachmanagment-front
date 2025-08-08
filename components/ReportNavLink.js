"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ReportNavLink() {
  const pathname = usePathname();
  const active = pathname?.includes('/dashboard/reports');
  return (
    <Link
      href="/dashboard/reports"
      className={`block px-3 py-2 rounded hover:bg-white/10 ${active ? 'bg-white/10 text-white' : 'text-slate-300'}`}
    >
      Reports
    </Link>
  );
}


