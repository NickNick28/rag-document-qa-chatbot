import React from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAllDocsMeta, getDocsGroupedByCategory } from "@/app/lib/mdx";
import SearchDocs from "@/components/SearchDocs";
import { SidebarDocs } from "@/components/SidebarDocs";
import { MobileMenu } from "@/components/MobileMenuDocs";
import Link from "next/link";

// ===== Types (กัน TypeScript งง) =====
type DocMeta = {
  slug: string;
  title: string;
  category: string;
  updated?: string;
  order?: number; // <- สำคัญ: ใช้เรียงในหมวด
};

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allDocs = await getAllDocsMeta();
  const groupedDocsRaw = (await getDocsGroupedByCategory()) as Record<
    string,
    DocMeta[]
  >;

  // 1) จัดลำดับหมวดหมู่
  const categoryOrder = [
    "Introduction",
    "Getting Started",
    "Manage Assistant",
    "Using AI Chat",
    "Prompting",
    "Troubleshooting",
    "Appendix",
  ];

  const sortedCategories = Object.keys(groupedDocsRaw).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // 2) เรียงเอกสาร “ภายในแต่ละหมวด” ด้วย meta.order (ถ้ามี)
  const groupedDocs: Record<string, DocMeta[]> = {};
  for (const category of Object.keys(groupedDocsRaw)) {
    const list = groupedDocsRaw[category] || [];
    groupedDocs[category] = [...list].sort((a, b) => {
      const oa = typeof a.order === "number" ? a.order : 9999;
      const ob = typeof b.order === "number" ? b.order : 9999;
      if (oa !== ob) return oa - ob;

      // tie-breaker: title -> slug
      const ta = a.title || "";
      const tb = b.title || "";
      const tcmp = ta.localeCompare(tb, "th");
      if (tcmp !== 0) return tcmp;

      return (a.slug || "").localeCompare(b.slug || "");
    });
  }

  console.log(
    "Getting Started orders:",
    (groupedDocsRaw["Getting Started"] || []).map((d) => ({
      slug: d.slug,
      title: d.title,
      order: d.order,
    }))
  );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <MobileMenu
            groupedDocs={groupedDocs}
            sortedCategories={sortedCategories}
          />
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="hidden sm:inline-block">คู่มือการใช้งานระบบ</span>
          <span className="sm:hidden">Docs</span>
        </div>

        <div className="flex items-center gap-2">
          <SearchDocs docs={allDocs} />

          <div className="flex items-center pt-4 mb-4 mx-4">
            <Link href={"/main"}>
              <button
                className="
                  group rounded-lg border border-orange-200 
                  bg-orange-50 text-orange-700 
                  hover:bg-orange-600 hover:text-white hover:border-orange-600
                  transition-all duration-300
                  p-2 md:px-4 md:py-2 flex items-center justify-center cursor-pointer
                "
              >
                <span className="hidden md:inline font-medium text-sm mr-2">
                  เริ่มต้นใช้งาน
                </span>
                <ExternalLink className="h-5 w-5 md:h-4 md:w-4 transition-transform group-hover:rotate-45"/>
              </button>
            </Link>
          </div>

          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex items-start">
        <SidebarDocs groupedDocs={groupedDocs} sortedCategories={sortedCategories} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}