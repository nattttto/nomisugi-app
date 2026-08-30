"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Beer, User } from "lucide-react";

const ITEMS = [
  { href: "/home", label: "今日飲む", icon: Beer },
  { href: "/history", label: "振り返る", icon: BarChart3 },
  { href: "/profile", label: "マイページ", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs ${
                active ? "text-amber-400" : "text-slate-500"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
