//Route สำหรับดึงข้อมูลกราฟ

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function
function getDateRangeArray(startStr: string, endStr: string) {
  const dates = [];
  const current = new Date(startStr);
  const end = new Date(endStr);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // รับ Query Params
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "Missing date range" }, { status: 400 });
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const isIncludeToday = toParam === todayStr;

  try {
    const [historicalStatsRes, todayLiveRes] = await Promise.all([
      // 1. ข้อมูลย้อนหลัง
      supabaseAdmin
        .from("daily_stats")
        .select("date, active_users, active_guests")
        .gte("date", fromParam)
        .lt("date", todayStr) // ถึงแค่เมื่อวาน
        .order("date", { ascending: true }),

      // 2. ข้อมูลสดวันนี้ (ถ้าจำเป็น)
      isIncludeToday
        ? supabaseAdmin
            .from("chat_history")
            .select("session_id")
            .eq("role", "user")
            .gte("created_at", todayStr)
        : Promise.resolve({ data: [] }),
    ]);

    const historicalData = historicalStatsRes.data || [];
    const todayRecords = todayLiveRes.data || [];

    // คำนวณยอดวันนี้ (Registered Users)
    const todayActiveUsers = new Set(
      todayRecords
        .filter((r: any) => !r.session_id.startsWith("guest_")) // กรอง guest ออก
        .map((r: any) => {
          const sessionId = r.session_id;
          // สมมติ format คือ email_botId
          // เราจะตัดส่วน _botId ข้างหลังออกเพื่อให้เหลือแค่ Email
          const lastUnderscoreIndex = sessionId.lastIndexOf("_");
          if (lastUnderscoreIndex !== -1) {
            return sessionId.substring(0, lastUnderscoreIndex);
          }
          return sessionId;
        })
    ).size;

    // คำนวณยอดวันนี้ (Guests)
    // Guest มักจะแยก session กันอยู่แล้ว นับตาม session_id ได้เลย
    // หรือถ้า guest_id_botId ก็ต้องตัดเหมือนกัน (แต่ปกติ Guest มักจะเป็น 1 session ต่อ 1 การเข้าชม)
    const todayActiveGuests = new Set(
      todayRecords
        .filter((r: any) => r.session_id.startsWith("guest_"))
        .map((r: any) => {
          // ถ้า Guest ก็นับตาม session เดิม หรือจะตัด ID เหมือน User ก็ได้ถ้า format เหมือนกัน
          // แต่ปกติ Guest คุยกับหลายบอทแยก session กันก็นับเป็นหลาย traffic ได้ (แล้วแต่ business logic)
          // ถ้าเอาชัวร์ว่า Guest คนเดิมคุยหลายบอทให้นับ 1 ให้ใช้ Logic เดียวกับข้างบนครับ
          const sessionId = r.session_id;
          const lastUnderscoreIndex = sessionId.lastIndexOf("_");
          if (lastUnderscoreIndex !== -1) {
            return sessionId.substring(0, lastUnderscoreIndex);
          }
          return sessionId;
        })
    ).size;

    // Map ข้อมูลให้ครบทุกวัน
    const dateBuckets = getDateRangeArray(fromParam, toParam);
    const chartData = dateBuckets.map((dateObj) => {
      const dateStr = dateObj.toISOString().split("T")[0];

      if (dateStr === todayStr && isIncludeToday) {
        return {
          date: dateObj.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
          }),
          user: todayActiveUsers,
          guest: todayActiveGuests,
        };
      }

      const record = historicalData.find((r: any) => r.date === dateStr);
      return {
        date: dateObj.toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
        }),
        user: record ? record.active_users : 0,
        guest: record ? record.active_guests : 0,
      };
    });

    return NextResponse.json(chartData);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
