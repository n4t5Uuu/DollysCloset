'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Users, Eye, Zap } from 'lucide-react';

const BRAND = '#E7A3B0';
const BRAND_LIGHT = '#fdf2f4';
const REFRESH_INTERVAL = 30_000;

interface RealtimeData {
  activeUsers: number;
  totalViews: number;
  totalEvents: number;
}

export function RealtimeSection() {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [open, setOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/realtime');
      const json = await res.json();
      if (!json.error) {
        setData(json);
        setLastUpdated(new Date());
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    fetchRealtime();
    const interval = setInterval(fetchRealtime, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRealtime]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      {/* Pill button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
        style={{
          backgroundColor: open ? BRAND_LIGHT : 'white',
          border: `1px solid ${open ? BRAND : '#e5e7eb'}`,
          color: '#374151',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {/* Pulsing dot */}
        <span className="relative flex items-center justify-center w-2 h-2">
          <span
            className="absolute inline-flex w-full h-full rounded-full opacity-50"
            style={{ backgroundColor: BRAND, animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite' }}
          />
          <span className="relative inline-flex w-2 h-2 rounded-full" style={{ backgroundColor: BRAND }} />
        </span>
        {data !== null ? (
          <span><span className="font-semibold" style={{ color: '#111827' }}>{data.activeUsers}</span> live</span>
        ) : (
          <span style={{ color: '#9ca3af' }}>live</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 z-50"
          style={{
            width: 280,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Dropdown header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid #f3f4f6' }}
          >
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>
              Live — Last 30 min
            </span>
            {lastUpdated && (
              <span className="text-xs" style={{ color: '#9ca3af' }}>
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {/* Metrics */}
          {!data ? (
            <div className="p-4 space-y-2 animate-pulse">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg" style={{ backgroundColor: '#f3f4f6' }} />
              ))}
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {[
                { icon: <Users className="w-4 h-4" style={{ color: BRAND }} />, label: 'Active users', value: data.activeUsers, bg: BRAND_LIGHT },
                { icon: <Eye className="w-4 h-4" style={{ color: '#22c55e' }} />, label: 'Page views', value: data.totalViews, bg: '#f0fdf4' },
                { icon: <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />, label: 'Events', value: data.totalEvents, bg: '#fffbeb' },
              ].map(item => (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ backgroundColor: item.bg }}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span className="text-sm" style={{ color: '#374151' }}>{item.label}</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: '#111827' }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
