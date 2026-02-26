'use client'; // ต้องมีบรรทัดนี้ เพราะเราใช้ usePathname

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// กำหนด Type ของข้อมูลที่รับเข้ามา
type SidebarProps = {
  groupedDocs: Record<string, { slug: string; title: string }[]>;
  sortedCategories: string[];
};

export function SidebarDocs({ groupedDocs, sortedCategories }: SidebarProps) {
  const pathname = usePathname(); // ดึง URL ปัจจุบัน (เช่น /docs/introduction)

  return (
    <aside className="hidden lg:block w-64 border-r border-border h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
      {sortedCategories.map((category) => (
        <div key={category} className="mb-8">
          <h4 className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {category}
          </h4>
          
          <ul className="space-y-1">
            {groupedDocs[category].map((doc) => {
              const href = `/docs/${doc.slug}`;
              const isActive = pathname === href; // เช็คว่า URL ตรงกันไหม

              return (
                <li key={doc.slug}>
                  <Link
                    href={href}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive 
                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-semibold' // Active Style
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80' // Inactive Style
                      }
                    `}
                  >
                    {doc.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}