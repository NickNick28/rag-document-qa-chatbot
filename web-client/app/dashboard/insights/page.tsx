import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Coins, Users, User } from "lucide-react";
import DashboardChartSection from "@/components/DashboardChartSection"; // กราฟคน (User)
import TokenChartSection from "@/components/TokenChartSection"; // ✅ กราฟ Token (ที่เราเพิ่งสร้าง)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function InsightsPage() {
  const session = await auth();

  // 1. Security Check
  if (!session) return redirect("/");
  const isAdmin = (session.user as any).role === "admin";
  if (!isAdmin) return redirect("/");

  // 2. Fetch Data: ดึงยอดรวมจาก user_usage
  const { data: usageData, error } = await supabaseAdmin
    .from("user_usage")
    .select("user_email, tokens_used");

  if (error) console.error("Error fetching user_usage:", error);

  // 3. Calculate Totals
  const allRecords = usageData || [];

  const totalUserTokens = allRecords
    .filter((r) => !r.user_email.startsWith("guest_"))
    .reduce((sum, r) => sum + (r.tokens_used || 0), 0);

  const totalGuestTokens = allRecords
    .filter((r) => r.user_email.startsWith("guest_"))
    .reduce((sum, r) => sum + (r.tokens_used || 0), 0);

  const grandTotalTokens = totalUserTokens + totalGuestTokens;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- Header --- */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-orange-100 text-orange-600 p-3 rounded-xl">
            <LineChart size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Insights & Analytics
            </h1>
            <p className="text-slate-500 text-sm">
              เจาะลึกข้อมูลการใช้งานและ Token Consumption
            </p>
          </div>
        </div>

        {/* --- Section 1: Total Tokens Cards (Data from user_usage) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Grand Total */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-2 -mt-2 z-0"></div>
            <div className="z-10">
              <h3 className="text-slate-500 text-sm font-medium mb-1">
                Total Tokens Consumed
              </h3>
              <p className="text-3xl font-bold text-purple-600">
                {(grandTotalTokens).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">All-time usage</p>
            </div>
            <div className="z-10 p-3 rounded-xl bg-purple-100 text-purple-600">
              <Coins size={24} />
            </div>
          </div>

          {/* User Total */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">
                Registered Users
              </h3>
              <p className="text-2xl font-bold text-slate-700">
                {(totalUserTokens).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">Tokens used</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <Users size={24} />
            </div>
          </div>

          {/* Guest Total */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-slate-500 text-sm font-medium mb-1">
                Guest Users
              </h3>
              <p className="text-2xl font-bold text-slate-700">
                {(totalGuestTokens).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">Tokens used</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 text-slate-600">
              <User size={24} />
            </div>
          </div>
        </div>

        {/* --- Section 2: Charts --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* กราฟ 1: Token Usage Daily Trend */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <TokenChartSection /> 
          </div>

          {/* กราฟ 2: Active Users Trend */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <DashboardChartSection />
          </div>
        </div>

      </div>
    </div>
  );
}