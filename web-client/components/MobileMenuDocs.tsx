'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // <--- 1. Import ตัวช่วยวาร์ป
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronRight, Book } from 'lucide-react';

type MobileMenuProps = {
  groupedDocs: Record<string, { slug: string; title: string }[]>;
  sortedCategories: string[];
};

export function MobileMenu({ groupedDocs, sortedCategories }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // State เช็คว่าโหลดหน้าเสร็จหรือยัง
  const pathname = usePathname();

  // รอให้หน้าเว็บโหลดเสร็จก่อนถึงจะใช้ Portal ได้ (ป้องกัน Error ตอน Server Render)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // ส่วนของหน้าต่างเมนู (Drawer) แยกออกมาเป็นตัวแปร
  const menuContent = (
    <div className="fixed inset-0 z-[9999] flex font-sans">
      
      {/* Backdrop: สีดำจางๆ */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer: ตัวเมนู */}
      <div className="relative w-[85%] max-w-[320px] h-full bg-background/95 backdrop-blur-xl border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
        
        {/* Header ของ Drawer */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500 font-bold text-lg tracking-tight">
            <Book className="w-6 h-6" />
            <span>Contents</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* List รายการ (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
          {sortedCategories.map((category) => (
            <div key={category} className="mb-6 last:mb-0">
              <h4 className="px-3 mb-2 text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest opacity-70">
                {category}
              </h4>
              
              <ul className="space-y-1">
                {groupedDocs[category].map((doc) => {
                  const href = `/docs/${doc.slug}`;
                  const isActive = pathname === href;

                  return (
                    <li key={doc.slug}>
                      <Link
                        href={href}
                        onClick={() => setIsOpen(false)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                          ${isActive
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20' 
                            : 'text-foreground/80 hover:bg-secondary hover:text-foreground'
                          }
                        `}
                      >
                        <span className="truncate">{doc.title}</span>
                        {isActive && <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-secondary/30 text-xs text-center text-muted-foreground/60 shrink-0">
          Documentation v1.0
        </div>
      </div>
    </div>
  );

  return (
    <div className="lg:hidden">
      {/* 1. ปุ่มกด (ยังคงอยู่ใน Header ตามปกติ) */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-muted-foreground hover:bg-secondary rounded-md active:scale-95 transition-transform"
        aria-label="Open Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* 2. ใช้ Portal วาร์ปหน้าต่างเมนูไปที่ document.body */}
      {mounted && isOpen && createPortal(menuContent, document.body)}
    </div>
  );
}