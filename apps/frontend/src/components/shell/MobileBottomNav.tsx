"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Library, ListChecks, Plug } from "lucide-react";
import { routes } from "@/lib/routes";

const items = [
  { href: routes.home, label: "대시보드", icon: LayoutDashboard },
  { href: routes.library, label: "라이브러리", icon: Library },
  { href: routes.queue, label: "큐", icon: ListChecks },
  { href: routes.channels, label: "채널", icon: Plug },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border grid grid-cols-4">
      {items.map((it) => {
        const active =
          it.href === routes.home
            ? pathname === routes.home
            : pathname.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] ${
              active ? "text-accent" : "text-text-3"
            }`}
          >
            <Icon className="w-5 h-5" />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
