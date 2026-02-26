import React from "react";
import { notFound } from "next/navigation";
import { getDocBySlug, getAllDocsMeta, getHeadings } from "@/app/lib/mdx";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Calendar, ChevronRight } from "lucide-react";
import remarkUnwrapImages from "remark-unwrap-images";
import rehypeSlug from "rehype-slug";
import TableOfContents from "@/components/TableOfContents";

// MDX Components
import { Callout } from "@/components/mdx/Callout";
import { MDXImage } from "@/components/mdx/MDXImage";

export async function generateStaticParams() {
  const docs = await getAllDocsMeta();
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);

  // ดึงหัวข้อเตรียมไว้
  const headings = await getHeadings(slug);

  if (!doc) {
    return notFound();
  }

  return (
    <div className="flex xl:grid xl:grid-cols-[1fr_250px] gap-10 max-w-7xl mx-auto py-10 px-6">
      <article className="min-w-0 max-w-3xl w-full">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span>Docs</span>
            <ChevronRight className="w-4 h-4" />
            {/* ปรับสี Badge: โหมดมืดใช้พื้นหลังสีส้มเข้มจางๆ และตัวหนังสือสีส้มสว่าง */}
            <span className="text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded">
              {doc.meta.category}
            </span>
          </div>

          {/* ปรับสีหัวข้อ: โหมดมืดใช้สีเกือบขาว */}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mb-4">
            {doc.meta.title}
          </h1>

          {doc.meta.updated && (
            <div className="flex items-center text-sm text-gray-400 dark:text-gray-500">
              <Calendar className="w-4 h-4 mr-2" />
              Last updated: {doc.meta.updated}
            </div>
          )}
        </div>

        {/* Content */}
        <div
          className="
        prose prose-slate max-w-none
        dark:prose-invert  /* <--- หัวใจสำคัญ: กลับสีอัตโนมัติ */

        /* Headings */
        prose-headings:text-gray-900 dark:prose-headings:text-gray-100
        prose-headings:font-semibold

        /* Paragraphs */
        prose-p:text-gray-600 dark:prose-p:text-gray-400
        prose-p:leading-7

        /* Links: ปรับสีส้มให้อ่อนลงใน Dark Mode เพื่อให้อ่านง่าย */
        prose-a:text-orange-600 dark:prose-a:text-orange-400 
        prose-a:no-underline 
        hover:prose-a:text-orange-700 dark:hover:prose-a:text-orange-300

        /* Strong */
        prose-strong:text-gray-900 dark:prose-strong:text-gray-100

        /* Inline Code: ปรับพื้นหลังให้ไม่จ้าเกินไปในโหมดมืด */
        prose-code:text-orange-700 dark:prose-code:text-orange-400
        prose-code:bg-orange-50 dark:prose-code:bg-orange-900/20
        prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md 
        prose-code:before:content-none prose-code:after:content-none

        /* Pre Code Blocks */
        prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 
        prose-pre:text-gray-50 prose-pre:rounded-xl

        /* Blockquotes */
        prose-blockquote:border-l-4 prose-blockquote:border-orange-500
        prose-blockquote:bg-gray-50 dark:prose-blockquote:bg-gray-900/50
        prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic 
        prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300

        /* Lists & Images */
        prose-li:text-gray-600 dark:prose-li:text-gray-400
        prose-img:rounded-xl prose-img:shadow-sm
      "
        >
          <MDXRemote
            source={doc.content}
            components={{ Callout, img: MDXImage }}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkUnwrapImages],
                rehypePlugins: [rehypeSlug],
              },
            }}
          />
        </div>
      </article>

      {/* --- ส่วนสารบัญขวา (Right Sidebar) --- */}
      <aside className="hidden xl:block w-full">
        <TableOfContents headings={headings} />
      </aside>
    </div>
  );
}
