import fs from "fs";
import path from "path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";

// กำหนดว่าห้องเก็บเอกสารของเราชื่อโฟลเดอร์ 'content'
const contentDirectory = path.join(process.cwd(), "content");

// ===== Types =====
export type DocMeta = {
  title: string;
  category: string;
  updated?: string;
  order?: number; // เพิ่ม order
};

export type Doc = {
  slug: string;
  meta: DocMeta;
  content: string; // เนื้อหา Markdown ดิบๆ
};

// เพิ่ม order ใน type ของ grouped docs ด้วย
export type GroupedDocs = Record<
  string,
  { slug: string; title: string; order?: number }[]
>;

// ===== Helpers =====
function parseOrder(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// 1) ฟังก์ชันสำหรับหยิบ "เอกสาร 1 ใบ" ตามชื่อ (Slug)
export async function getDocBySlug(slug: string): Promise<Doc | null> {
  try {
    const realSlug = slug.replace(/\.mdx$/, "");
    const fullPath = path.join(contentDirectory, `${realSlug}.mdx`);

    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data, content } = matter(fileContents);

    // แปลง order ให้เป็น number เสมอ
    const meta: DocMeta = {
      title: (data.title as string) ?? realSlug,
      category: (data.category as string) ?? "General",
      updated: data.updated as string | undefined,
      order: parseOrder(data.order),
    };

    return {
      slug: realSlug,
      meta,
      content,
    };
  } catch (error) {
    console.error(`Error reading doc: ${slug}`, error);
    return null;
  }
}

// 2) ฟังก์ชันสำหรับ "ดูรายชื่อไฟล์ทั้งหมด"
export async function getAllDocsMeta(): Promise<Omit<Doc, "content">[]> {
  const files = fs.readdirSync(contentDirectory);

  const docs = files.map((fileName) => {
    const slug = fileName.replace(/\.mdx$/, "");
    const fullPath = path.join(contentDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);

    // แปลง order ให้เป็น number เสมอ
    const meta: DocMeta = {
      title: (data.title as string) ?? slug,
      category: (data.category as string) ?? "General",
      updated: data.updated as string | undefined,
      order: parseOrder(data.order),
    };

    return { slug, meta };
  });

  return docs;
}

export async function getHeadings(slug: string) {
  const realSlug = slug.replace(/\.mdx$/, "");
  const fullPath = path.join(contentDirectory, `${realSlug}.mdx`);
  const fileContents = fs.readFileSync(fullPath, "utf8");

  const { content } = matter(fileContents);
  const slugger = new GithubSlugger();

  const headingLines = content.split("\n").filter((line) => {
    return line.match(/^#{1,3}\s/); // H1, H2, H3
  });

  return headingLines.map((raw) => {
    const text = raw.replace(/^#{1,3}\s/, "");
    const level = raw.match(/^#{1,3}/)?.[0].length || 1;
    const id = slugger.slug(text);
    return { text, level, id };
  });
}

export async function getDocsGroupedByCategory(): Promise<GroupedDocs> {
  const allDocs = await getAllDocsMeta();

  const grouped = allDocs.reduce((acc, doc) => {
    const category = doc.meta.category || "General";

    if (!acc[category]) acc[category] = [];

    acc[category].push({
      slug: doc.slug,
      title: doc.meta.title,
      order: doc.meta.order, // ส่ง order ออกไปด้วย
    });

    return acc;
  }, {} as GroupedDocs);

  // เรียงภายในหมวดตาม order ก่อนส่งออก
  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => {
      const oa = typeof a.order === "number" ? a.order : 9999;
      const ob = typeof b.order === "number" ? b.order : 9999;
      if (oa !== ob) return oa - ob;
      return (a.title || "").localeCompare(b.title || "", "th");
    });
  }

  return grouped;
}