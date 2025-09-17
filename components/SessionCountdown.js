"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '../lib/auth';
import { useUser } from '../hooks/useUser';

// Configuration
const ONE_HOUR_MS = 60 * 60 * 1000; // 60 minutes
const STORAGE_KEY_POS = 'tach:sessionCounter:pos';
const STORAGE_KEY_LOGIN_AT = 'tach:loginAt';

export default function SessionCountdown() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [now, setNow] = useState(Date.now());
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const elementSizeRef = useRef({ width: 0, height: 0 });
  const rafIdRef = useRef(null);
  const pendingPosRef = useRef(null);
  const containerRef = useRef(null);

  // Read and write position from localStorage
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { top: 12, right: 12 };
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_POS);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { top: 12, right: 12 };
  });

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-logout when time elapsed since login
  useEffect(() => {
    if (!user) return;
    const loginAt = (() => {
      try {
        const v = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY_LOGIN_AT) : null;
        return v ? parseInt(v, 10) : Date.now();
      } catch (_) { return Date.now(); }
    })();
    const elapsed = now - loginAt;
    if (elapsed >= ONE_HOUR_MS) {
      (async () => {
        try { await logout(); } catch (_) {}
        try { if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY_LOGIN_AT); } catch (_) {}
        router.replace('/login');
      })();
    }
  }, [now, user, router]);

  // Plus d'écoute d'activité: compteur strict basé sur l'heure de connexion

  const remainingMs = useMemo(() => {
    const loginAt = (() => {
      try {
        const v = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY_LOGIN_AT) : null;
        return v ? parseInt(v, 10) : Date.now();
      } catch (_) { return Date.now(); }
    })();
    const remaining = ONE_HOUR_MS - (now - loginAt);
    return Math.max(0, remaining);
  }, [now]);

  const remaining = useMemo(() => {
    const totalSec = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const seconds = (totalSec % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [remainingMs]);

  const startDrag = useCallback((e) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    elementSizeRef.current = { width: rect.width, height: rect.height };
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
    dragOffsetRef.current = { x: clientX - rect.left, y: clientY - rect.top };

    const move = (evt) => {
      const cx = evt.clientX ?? (evt.touches && evt.touches[0]?.clientX) ?? 0;
      const cy = evt.clientY ?? (evt.touches && evt.touches[0]?.clientY) ?? 0;
      // Prevent scrolling on touch while dragging
      if (evt.cancelable) evt.preventDefault?.();

      const width = elementSizeRef.current.width;
      const height = elementSizeRef.current.height;
      let left = cx - dragOffsetRef.current.x;
      let top = cy - dragOffsetRef.current.y;
      // Clamp inside viewport
      left = Math.min(Math.max(8, left), Math.max(8, window.innerWidth - width - 8));
      top = Math.min(Math.max(8, top), Math.max(8, window.innerHeight - height - 8));
      const right = Math.max(8, window.innerWidth - (left + width));

      const next = { top, right };
      pendingPosRef.current = next;
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (pendingPosRef.current) {
            setPosition(pendingPosRef.current);
            pendingPosRef.current = null;
          }
        });
      }
    };

    const end = () => {
      setIsDragging(false);
      try { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(pendingPosRef.current || position)); } catch (_) {}
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', move, { passive: false });
      window.removeEventListener('touchend', end);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
  }, [position]);

  const onDragStart = useCallback((e) => {
    // Prevent native drag image behavior
    e.preventDefault?.();
  }, []);

  if (loading || !user) return null;

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', top: position.top, right: position.right, zIndex: 9999, cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      className="select-none"
      onDragStart={onDragStart}
    >
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className="bg-black/80 text-white text-sm px-3 py-2 rounded-lg shadow-lg backdrop-blur border border-white/10"
        data-cy="session-countdown"
        title="Déconnexion automatique après 60 minutes d'inactivité. Glisser pour déplacer."
      >
        <span className="font-semibold">Déconnexion dans</span> <span className="tabular-nums">{remaining}</span>
      </div>
    </div>
  );
}


