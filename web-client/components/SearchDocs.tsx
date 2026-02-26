"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom"; // <--- 1. Import ตัวช่วยวาร์ป
import { useRouter } from "next/navigation";
import {
  Search as SearchIcon,
  FileText,
  CornerDownLeft,
  X,
} from "lucide-react";
import Fuse from "fuse.js";

type DocItem = {
  slug: string;
  meta: {
    title: string;
    category: string;
  };
};

export default function SearchDocs({ docs }: { docs: DocItem[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DocItem[]>([]);
  const [isOpen, setIsOpen] = useState(false); // สำหรับ Desktop Dropdown
  const [showMobileSearch, setShowMobileSearch] = useState(false); // สำหรับ Mobile Modal
  const [mounted, setMounted] = useState(false); // <--- 2. State เช็คว่าโหลดหน้าเสร็จยัง

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const fuse = new Fuse(docs, {
    keys: ["meta.title", "meta.category", "slug"],
    threshold: 0.3,
  });

  // รอให้หน้าเว็บโหลดเสร็จก่อนใช้ Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const searchResults = fuse.search(query);
    setResults(searchResults.map((result) => result.item));

    if (!showMobileSearch) setIsOpen(true);
  }, [query, showMobileSearch]);

  useEffect(() => {
    if (showMobileSearch) {
      // Focus input หลังจาก Modal เด้งขึ้นมานิดนึง
      setTimeout(() => mobileInputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMobileSearch]);

  // Desktop Cmd+K & Click Outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowMobileSearch(false);
        inputRef.current?.blur();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (slug: string) => {
    setIsOpen(false);
    setShowMobileSearch(false);
    setQuery("");
    router.push(`/docs/${slug}`);
  };

  // --- ส่วนของ Mobile Modal ที่จะวาร์ปไป body ---
  const mobileModalContent = (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200 font-sans">
      {/* Header: Input + Close Button */}
      <div className="flex items-center gap-2 p-4 border-b border-border bg-background">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
          <input
            ref={mobileInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาในเอกสาร..."
            className="w-full bg-secondary/50 rounded-full pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
          />
          {query.length > 0 && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowMobileSearch(false)}
          className="p-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ยกเลิก
        </button>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {query.trim().length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-muted-foreground/50 gap-2">
            <SearchIcon className="w-10 h-10 opacity-20" />
            <span className="text-sm">พิมพ์คำค้นหาเพื่อเริ่ม</span>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-1">
            <div className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              ผลการค้นหา ({results.length})
            </div>
            <ResultList results={results} onSelect={handleSelect} />
          </div>
        ) : (
          <div className="text-center text-muted-foreground mt-20 text-sm">
            ไม่พบข้อมูลสำหรับ "{query}"
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop View */}
      <div
        className="relative group flex-1 max-w-md mx-4 hidden md:block"
        ref={searchRef}
      >
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length > 0 && setIsOpen(true)}
            placeholder="ค้นหาหัวข้อ..."
            className="block w-full pl-10 pr-12 py-1.5 rounded-md leading-5 
              bg-secondary/50 text-foreground placeholder-muted-foreground
              border border-transparent focus:border-orange-500 focus:bg-background focus:ring-1 focus:ring-orange-500
              sm:text-sm transition-all outline-none"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-muted-foreground text-xs border border-border rounded px-1.5 py-0.5 font-sans">
              ⌘K
            </span>
          </div>
        </div>

        {isOpen && results.length > 0 && (
          <div className="absolute top-full mt-2 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            <div className="max-h-96 overflow-y-auto py-2">
              <ResultList results={results} onSelect={handleSelect} />
            </div>
          </div>
        )}
      </div>

      {/* 2. Mobile View (Trigger Button) */}
      <div className="md:hidden">
        <button
          onClick={() => setShowMobileSearch(true)}
          className="p-2.5 text-muted-foreground hover:bg-secondary rounded-md active:scale-95 transition-transform"
        >
          <SearchIcon className="w-5 h-5" />
        </button>
      </div>

      {/* 3. Mobile Full-Screen Modal (Portal) */}
      {/* ใช้ Portal เพื่อวาร์ปไป body ทะลุ Header ออกมา */}
      {mounted &&
        showMobileSearch &&
        createPortal(mobileModalContent, document.body)}
    </>
  );
}

// Component ย่อยสำหรับแสดงรายการ (ใช้ร่วมกัน)
function ResultList({
  results,
  onSelect,
}: {
  results: DocItem[];
  onSelect: (slug: string) => void;
}) {
  return (
    <>
      {results.map((doc) => (
        <button
          key={doc.slug}
          onClick={() => onSelect(doc.slug)}
          // 1. เปลี่ยน group -> group/item
          className="w-full text-left px-3 py-3 flex items-start gap-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors group/item border border-transparent hover:border-orange-100 dark:hover:border-orange-500/20"
        >
          <div
            className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground 
                        group-hover/item:text-orange-600 dark:group-hover/item:text-orange-400"
          >
            {/* 2. เปลี่ยน group-hover -> group-hover/item */}
            <FileText className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-medium text-foreground 
                            group-hover/item:text-orange-700 dark:group-hover/item:text-orange-300"
            >
              {/* 3. เปลี่ยน group-hover -> group-hover/item */}
              {doc.meta.title}
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              ในหมวด: {doc.meta.category}
            </div>
          </div>

          <CornerDownLeft
            className="w-4 h-4 text-muted-foreground opacity-0 
                        group-hover/item:opacity-100 transition-opacity self-center"
          />
          {/* 4. เปลี่ยน group-hover -> group-hover/item */}
        </button>
      ))}
    </>
  );
}
