"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, ListTodo, LogOut, FileBarChart2, Settings } from "lucide-react";

interface HeaderProps {
  userName?: string | null;
  userEmail?: string | null;
  isAdmin?: boolean;
  isManager?: boolean;
}

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tarefas", label: "Tarefas", icon: ListTodo },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Header({ userName, userEmail, isAdmin, isManager }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-surface-200 flex-shrink-0">
      <div className="flex items-center h-12 md:h-14 px-3 md:px-5">
        <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/favicon.png"
              alt="Méliès"
              className="w-7 h-7 object-contain"
            />
            <span className="text-surface-700 font-semibold text-[13px] tracking-tight hidden lg:inline">
              Méliès
            </span>
          </div>
          <div className="h-5 w-px bg-surface-200 shrink-0" />

          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 md:gap-2 px-2.5 md:px-3.5 py-1.5 rounded text-[13px] font-medium transition-all ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-surface-500 hover:text-surface-800 hover:bg-surface-50"
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden sm:flex items-center gap-1.5">
            {isAdmin && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-semibold uppercase tracking-wider">
                Admin
              </span>
            )}
            {isManager && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-semibold uppercase tracking-wider">
                Líder
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-medium text-surface-700 leading-tight truncate max-w-[140px]">
              {userName}
            </p>
            <p className="text-[10px] text-surface-400 hidden md:block">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded hover:bg-surface-100 text-surface-400 hover:text-surface-700 transition-all"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
