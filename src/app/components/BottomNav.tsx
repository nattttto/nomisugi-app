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
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-ink bg-paper pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md gap-1 p-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-xs font-extrabold ${
                active ? "bg-beer text-ink shadow-sticker" : "text-muted"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
