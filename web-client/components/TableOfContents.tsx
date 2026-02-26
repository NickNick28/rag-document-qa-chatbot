'use client';

import React, { useEffect, useState } from 'react';

type Heading = {
  text: string;
  level: number;
  id: string;
};

export default function TableOfContents({ headings }: { headings: Heading[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '0% 0% -80% 0%' } // ปรับค่านี้เพื่อให้ Highlight เปลี่ยนตอนหัวข้อเลื่อนมาถึงด้านบน
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-auto pl-4">
      <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
        On This Page
      </h4>
      <ul className="space-y-3 text-sm">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: `${(heading.level - 2) * 1}rem` }} // ย่อหน้าตามระดับหัวข้อ
          >
            <a
              href={`#${heading.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(heading.id)?.scrollIntoView({
                  behavior: 'smooth',
                });
                setActiveId(heading.id); // คลิกปุ๊บเปลี่ยนสีปั๊บ
              }}
              className={`block transition-colors duration-200 border-l-2 pl-3 ${
                activeId === heading.id
                  ? 'border-orange-500 text-orange-600 font-medium' // Active State
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}