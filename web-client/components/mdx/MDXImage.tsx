import Image from "next/image";

// รับ Props ทุกอย่างที่ tag <img> ปกติควรจะมี (เช่น src, alt)
export function MDXImage(props: any) {
  // ดึง src และ alt ออกมา
  const { src, alt, ...rest } = props;

  return (
    // ใช้ <figure> เพื่อห่อรูปภาพและคำอธิบาย (Caption)
    <span className="block w-full my-8">
      <span className="block relative flex flex-col items-center justify-center">
        <Image
          src={src}
          alt={alt || "Documentation image"}
          {...rest}
          width={0}
          height={0}
          sizes="(max-width: 768px) 100vw, 700px"
          style={{ width: "100%", height: "auto" }}
          className="rounded-xl shadow-md border border-gray-100 dark:border-gray-800 object-cover"
          quality={75}
        />

        {alt && (
          // เปลี่ยน <figcaption> -> <span> เพราะ figcaption อยู่ใน span ไม่ได้
          <span className="block mt-3 text-center text-sm text-gray-500 italic">
            — {alt}
          </span>
        )}
      </span>
    </span>
  );
}
