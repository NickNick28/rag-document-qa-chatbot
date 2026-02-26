//ไฟล์นี้เพื่อจัดการ Logic การคำนวณและตรวจสอบลิมิต
import { createClient } from "@supabase/supabase-js";

// 1. กำหนดลิมิตของแต่ละ Role
export const ROLE_LIMITS: Record<string, number> = {
  guest: 25000, // Guest: 25,000 tokens
  user: 100000, // User: 500,000 tokens
  staff: 100000,// Staff: 10,000,000 tokens
  admin: Infinity, // Admin: ไม่จำกัด
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper เช็คว่าเป็นคนละเดือนกันหรือไม่
function isNewMonth(lastUpdated: string | null): boolean {
  if (!lastUpdated) return true; // ถ้าไม่มีประวัติ ถือว่าเป็นเดือนใหม่
  const date = new Date(lastUpdated);
  const now = new Date();
  return (
    date.getMonth() !== now.getMonth() ||
    date.getFullYear() !== now.getFullYear()
  );
}

/**
 * ฟังก์ชันเช็คว่า User ใช้งานเกินลิมิตหรือยัง
 * พร้อม Logic รีเซ็ตแบบ "ชนเพดานค่อยรีในเดือนถัดไป"
 */
export async function checkTokenLimit(email: string, role: string = "user") {
  const limit = ROLE_LIMITS[role] || ROLE_LIMITS["user"];

  // Admin ผ่านโลด
  if (limit === Infinity)
    return { allowed: true, remaining: Infinity, used: 0, limit };

  // 1. ดึงข้อมูลล่าสุด
  const { data } = await supabaseAdmin
    .from("user_usage")
    .select("tokens_used, last_updated")
    .eq("user_email", email)
    .single();

  let used = data?.tokens_used || 0;
  const lastUpdated = data?.last_updated;

  // 2. ตรวจสอบเงื่อนไขการรีเซ็ต
  // เงื่อนไข: ขึ้นเดือนใหม่ (isNewMonth) AND ใช้เกินหรือเท่ากับลิมิตแล้ว (used >= limit)
  if (isNewMonth(lastUpdated) && used >= limit) {
    console.log(
      `🔄 New month and limit reached for ${email}. Resetting tokens.`
    );

    // รีเซ็ตค่าใน DB ทันที
    await supabaseAdmin
      .from("user_usage")
      .update({ tokens_used: 0, last_updated: new Date().toISOString() })
      .eq("user_email", email);

    used = 0; // ปรับค่าตัวแปร local เพื่อให้ return allowed = true
  }

  // หมายเหตุ: ถ้า isNewMonth แต่ used < limit เราจะไม่ทำอะไร (ปล่อยให้ใช้ต่อแบบทบยอด)

  // 3. เช็คสถานะปัจจุบัน
  if (used >= limit) {
    return { allowed: false, used, limit };
  }

  return { allowed: true, used, limit };
}

/**
 * ฟังก์ชันอัปเดตยอดใช้งาน
 */
export async function incrementTokenUsage(email: string, amount: number) {
  // ดึงค่าเก่า (เพื่อความชัวร์ หรือจะใช้ RPC ของ supabase increment ก็ได้)
  const { data } = await supabaseAdmin
    .from("user_usage")
    .select("tokens_used")
    .eq("user_email", email)
    .single();

  const currentUsed = data?.tokens_used || 0;
  const newUsed = currentUsed + amount;

  // Upsert และอัปเดต last_updated เป็นปัจจุบันเสมอ
  const { error } = await supabaseAdmin.from("user_usage").upsert({
    user_email: email,
    tokens_used: newUsed,
    last_updated: new Date().toISOString(),
  });

  if (error) console.error("Error updating tokens:", error);
}
// (แบบง่าย)ฟังก์ชันประมาณการจำนวน Tokens จากข้อความ (ประมาณ 4 ตัวอักษร = 1 token))
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// คำอธิบายการทำงาน (Scenario)
// สมมติ Limit = 50,000

// เดือนมกราคม:

// ใช้ไป 40,000 (ยังไม่ถึง Limit)

// checkTokenLimit: ยอมให้ผ่าน

// เข้าเดือนกุมภาพันธ์:

// ระบบเช็ค: "เป็นเดือนใหม่แล้ว" แต่ "ยอดใช้ (40,000) ยังน้อยกว่า Limit (50,000)"

// ผล: ไม่รีเซ็ต (ทบยอดมาใช้ต่อ)

// ใช้เพิ่มอีก 10,000 -> รวมเป็น 50,000 (เต็ม Limit) -> User เริ่มใช้งานไม่ได้ (Blocked)

// เข้าเดือนมีนาคม:

// ระบบเช็ค: "เป็นเดือนใหม่แล้ว" และ "ยอดใช้ (50,000) >= Limit"

// ผล: รีเซ็ตเป็น 0 ✅

// User กลับมาใช้งานได้ใหม่