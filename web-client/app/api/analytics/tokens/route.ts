import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (!fromParam || !toParam)
    return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const todayStr = new Date().toISOString().split("T")[0];
  const isIncludeToday = toParam === todayStr;

  try {
    const [historicalRes, currentUsageRes, lastDailyStatsRes] =
      await Promise.all([
        // 1. ประวัติย้อนหลัง (รายวัน)
        supabaseAdmin
          .from("daily_stats")
          .select("date, user_token_count, guest_token_count")
          .gte("date", fromParam)
          .lt("date", todayStr)
          .order("date", { ascending: true }),

        // 2. ยอดสะสมปัจจุบัน (Real-time Accumulate) จาก user_usage
        isIncludeToday
          ? supabaseAdmin.from("user_usage").select("user_email, tokens_used")
          : Promise.resolve({ data: [] }),

        // 3. ยอดสะสมล่าสุดที่บันทึกไว้ (Last Record Accumulate) จาก daily_stats
        isIncludeToday
          ? supabaseAdmin
              .from("daily_stats")
              .select("acc_user_tokens, acc_guest_tokens")
              .order("date", { ascending: false })
              .limit(1)
          : Promise.resolve({ data: [] }),
      ]);

    const historicalData = historicalRes.data || [];

    // --- คำนวณยอด "วันนี้" (Live Token Usage) ---
    let todayUserTokens = 0;
    let todayGuestTokens = 0;

    if (isIncludeToday) {
      // A. หาเลขไมล์ปัจจุบัน
      const currentRecords = currentUsageRes.data || [];
      const currUserAcc = currentRecords
        .filter((r) => !r.user_email.startsWith("guest_"))
        .reduce((sum, r) => sum + (r.tokens_used || 0), 0);
      const currGuestAcc = currentRecords
        .filter((r) => r.user_email.startsWith("guest_"))
        .reduce((sum, r) => sum + (r.tokens_used || 0), 0);

      // B. หาเลขไมล์เมื่อวาน (จุด Checkpoint ล่าสุด)
      const lastStat = lastDailyStatsRes.data?.[0] || {
        acc_user_tokens: 0,
        acc_guest_tokens: 0,
      };

      //C. คำนวณ
      // ถ้าเลขปัจจุบัน น้อยกว่า เมื่อวาน แสดงว่ามีการ Reset -> ให้ใช้เลขปัจจุบันเป็นยอดวันนี้เลย
      // ถ้าเลขปัจจุบัน มากกว่า เมื่อวาน แสดงว่าใช้งานปกติ -> ให้เอามาลบกัน

      // For Users
      if (currUserAcc < (lastStat.acc_user_tokens || 0)) {
        todayUserTokens = currUserAcc; // กรณี Reset
      } else {
        todayUserTokens = currUserAcc - (lastStat.acc_user_tokens || 0); // กรณีปกติ
      }

      // For Guests
      if (currGuestAcc < (lastStat.acc_guest_tokens || 0)) {
        todayGuestTokens = currGuestAcc; // กรณี Reset
      } else {
        todayGuestTokens = currGuestAcc - (lastStat.acc_guest_tokens || 0); // กรณีปกติ
      }
    }

    // รวมข้อมูล
    const dateBuckets = getDateRangeArray(fromParam, toParam);
    const chartData = dateBuckets.map((dateObj) => {
      const dateStr = dateObj.toISOString().split("T")[0];

      if (dateStr === todayStr && isIncludeToday) {
        return {
          date: dateObj.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
          }),
          user: todayUserTokens,
          guest: todayGuestTokens,
        };
      }

      const record = historicalData.find((r: any) => r.date === dateStr);
      return {
        date: dateObj.toLocaleDateString("th-TH", {
          day: "numeric",
          month: "short",
        }),
        user: record ? record.user_token_count : 0,
        guest: record ? record.guest_token_count : 0,
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
