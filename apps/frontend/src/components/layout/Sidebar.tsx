'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Library,
  ListChecks,
  Plug,
  Settings,
  Plus,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import { routes } from '@/lib/routes';
import { CURRENT_USER, LIBRARY_ITEMS, QUEUE_ITEMS } from '@/mocks';

const navItems = [
  { href: routes.home, label: '대시보드', icon: LayoutDashboard, count: null },
  {
    href: routes.library,
    label: '라이브러리',
    icon: Library,
    count: LIBRARY_ITEMS.length,
  },
  {
    href: routes.queue,
    label: '발행 큐',
    icon: ListChecks,
    count: QUEUE_ITEMS.filter((q) => q.state === 'processing' || q.state === 'pending').length,
    live: QUEUE_ITEMS.some((q) => q.state === 'processing'),
  },
  { href: routes.channels, label: '채널', icon: Plug, count: null },
  { href: routes.settings, label: '설정', icon: Settings, count: null },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-[240px] shrink-0 bg-surface border-r border-border flex-col p-[14px_12px] gap-3.5 sticky top-0 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-1.5">
        <div
          className="w-5 h-5 rounded"
          style={{
            background: 'linear-gradient(135deg, #5b5bd6, #8b5cf6)',
          }}
        />
        <span className="text-[13px] font-semibold text-text">content-pipeline</span>
        <span className="ml-auto text-[10px] font-mono text-text-3 px-1.5 py-0.5 bg-surface-2 rounded">
          v0.2
        </span>
      </div>

      {/* New content */}
      <Link
        href={routes.newContent}
        className="flex items-center gap-2 bg-text text-white rounded-md px-3 py-2 text-[12.5px] font-semibold hover:bg-black transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>새 콘텐츠</span>
        <span className="ml-auto text-[10px] font-mono opacity-60">⌘N</span>
      </Link>

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-md px-2.5 py-1.5">
        <Search className="w-3.5 h-3.5 text-text-3" />
        <input
          placeholder="검색"
          className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-text-3"
        />
        <span className="text-[10px] font-mono text-text-3">⌘K</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active =
            item.href === routes.home ? pathname === routes.home : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12.5px] transition-colors ${
                active
                  ? 'bg-accent-soft text-accent font-semibold'
                  : 'text-text-2 hover:bg-surface-2 hover:text-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              {item.count != null && (
                <span
                  className={`ml-auto text-[10.5px] font-medium ${
                    active ? 'text-accent' : 'text-text-3'
                  }`}
                >
                  {item.count}
                </span>
              )}
              {'live' in item && item.live ? (
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-[pulse-dot_1.4s_infinite]" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Recent */}
      <div className="flex flex-col gap-1.5 mt-2">
        <span className="text-[10.5px] uppercase tracking-wider text-text-3 px-2.5">최근</span>
        {LIBRARY_ITEMS.slice(0, 3).map((it) => {
          const dotColor =
            it.state === 'live'
              ? 'bg-success'
              : it.state === 'processing'
                ? 'bg-accent'
                : it.state === 'scheduled'
                  ? 'bg-warn'
                  : it.state === 'failed'
                    ? 'bg-danger'
                    : 'bg-text-3';
          return (
            <Link
              key={it.id}
              href={routes.libraryItem(it.id)}
              className="flex items-center gap-2 px-2.5 py-1 rounded text-[11.5px] text-text-2 hover:bg-surface-2 hover:text-text"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              <span className="truncate">{it.title}</span>
            </Link>
          );
        })}
      </div>

      {/* User */}
      <div className="mt-auto flex items-center gap-2 px-1.5 py-1.5 rounded-md hover:bg-surface-2">
        <div className="w-7 h-7 rounded-md bg-accent text-white text-[12px] font-semibold flex items-center justify-center">
          {CURRENT_USER.initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-text truncate">{CURRENT_USER.name}</div>
          <div className="text-[10.5px] text-text-3 truncate">{CURRENT_USER.email}</div>
        </div>
        <MoreHorizontal className="w-3.5 h-3.5 text-text-3" />
      </div>
    </aside>
  );
}
