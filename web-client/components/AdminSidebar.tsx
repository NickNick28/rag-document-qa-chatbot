"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  LineChart,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Home,
  User,
  CheckCircle,
  Wrench,
} from "lucide-react";

const navItems = [
  { name: "Back to Main", href: "/main", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "User Management", href: "/dashboard/users", icon: Users },
  { name: "Bot Management", href: "/dashboard/bots", icon: Wrench },
  { name: "Approvals", href: "/dashboard/approvals", icon: CheckCircle },
  { name: "Insights", href: "/dashboard/insights", icon: LineChart },
];

export default function AdminSidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header (Fixed Top) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-orange-600" size={24} />
          <span className="font-bold text-slate-800">Admin Panel</span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 md:static 
          /* ✅ เปลี่ยนจาก h-screen เป็น h-full บน Desktop เพื่อให้ยืดตาม Layout Parent */
          h-screen md:h-full
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="h-16 flex-shrink-0 flex items-center gap-3 px-6 border-b border-slate-100">
            <div className="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center shadow-sm shadow-orange-200">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">
                Admin Panel
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                System Manager
              </p>
            </div>
            <button
              onClick={closeSidebar}
              className="md:hidden ml-auto text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links (Scrollable area inside Sidebar) */}
          <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase mb-2">
              Menu
            </p>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const isHome = item.href === "/";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeSidebar}
                  className={`
                    group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? "bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200"
                        : isHome
                        ? "text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 mb-2"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      size={18}
                      className={`transition-colors ${
                        isActive
                          ? "text-orange-600"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    {item.name}
                  </div>
                  {isActive && (
                    <ChevronRight size={14} className="text-orange-400" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border border-white shadow-sm overflow-hidden">
                {/* ถ้ามีรูป Profile ให้แสดงรูป ถ้าไม่มีให้แสดงตัวอักษรแรก */}
                {user?.image ? (
                  <img
                    src={user.image}
                    alt="User"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="cursor-pointer w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-100 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
