import { auth } from "@/app/lib/auth";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Users,
  Bot,
  ShieldCheck,
  MessageSquare,
  Coins,
} from "lucide-react";

// Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function StatCard({ title, value, icon: Icon, colorClass, subText }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
        <p className={`text-3xl font-bold ${colorClass}`}>{value || 0}</p>
        {subText && <p className="text-xs text-slate-400 mt-1">{subText}</p>}
      </div>
      <div
        className={`p-3 rounded-xl ${colorClass
          .replace("text-", "bg-")
          .replace("600", "100")} opacity-80`}
      >
        <Icon className={colorClass} size={24} />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session) return redirect("/");
  const isAdmin = (session.user as any).role === "admin";
  if (!isAdmin) return redirect("/");

  // Fetch Data
  const [
    botsRes,
    usersCountRes,
    authUserMsgRes,
    guestMsgRes,
    aiMsgRes,
    tokenUsageRes 
  ] = await Promise.all([
    supabaseAdmin.from("bots").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true }),

    // Total Counts (Messages)
    supabaseAdmin
      .from("chat_history")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .not("session_id", "ilike", "guest_%"),
    supabaseAdmin
      .from("chat_history")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .ilike("session_id", "guest_%"),
    supabaseAdmin
      .from("chat_history")
      .select("*", { count: "exact", head: true })
      .eq("role", "assistant"),
      
    // Token Data
    supabaseAdmin
        .from("user_usage")
        .select("user_email, tokens_used")
  ]);

  // 1. Stats Variables
  const botCount = botsRes.count || 0;
  const userCount = usersCountRes.count || 0;
  
  // Message Counts
  const authUserMsgCount = authUserMsgRes.count || 0;
  const guestMsgCount = guestMsgRes.count || 0;
  const aiMsgCount = aiMsgRes.count || 0;
  const totalMessages = authUserMsgCount + guestMsgCount + aiMsgCount;

  // 2. 🪙 Calculate Tokens
  const usageData = tokenUsageRes.data || [];

  // แยก User (ที่ไม่ใช่ guest_)
  const totalUserTokens = usageData
    .filter((row) => !row.user_email.startsWith("guest_"))
    .reduce((sum, row) => sum + (row.tokens_used || 0), 0);

  // แยก Guest (ที่ขึ้นต้นด้วย guest_)
  const totalGuestTokens = usageData
    .filter((row) => row.user_email.startsWith("guest_"))
    .reduce((sum, row) => sum + (row.tokens_used || 0), 0);

  const grandTotalTokens = totalUserTokens + totalGuestTokens;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span className="bg-orange-600 text-white p-2 rounded-lg">
              <ShieldCheck size={28} />
            </span>
            Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-2 ml-14">
            ยินดีต้อนรับ, {session.user.name || session.user.email}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Assistants */}
          <StatCard
            title="Total Assistants"
            value={botCount}
            icon={Bot}
            colorClass="text-blue-600"
          />
          
          {/* 2. Users */}
          <StatCard
            title="Registered Users"
            value={userCount}
            icon={Users}
            colorClass="text-orange-600"
            subText="Users with account"
          />

          {/* 3. Token Usage */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">
                  Total Tokens
                </h3>
                <p className="text-3xl font-bold text-purple-600">
                  {(grandTotalTokens).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100 opacity-80">
                <Coins className="text-purple-600" size={24} />
              </div>
            </div>
            {/* Breakdown */}
            <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                        User
                    </span>
                    <span className="font-semibold text-slate-700">{totalUserTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                    <span className="text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Guest
                    </span>
                    <span className="font-semibold text-slate-700">{totalGuestTokens.toLocaleString()}</span>
                </div>
            </div>
          </div>

          {/* 4. Messages */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-slate-500 text-sm font-medium mb-1">
                  Total Messages
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {totalMessages.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-100 opacity-80">
                <MessageSquare className="text-green-600" size={24} />
              </div>
            </div>
            {/* Breakdown */}
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-500">User</span>
                <span className="font-semibold text-slate-700">
                  {authUserMsgCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-500">Guest</span>
                <span className="font-semibold text-slate-700">
                  {guestMsgCount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs items-center pt-1 border-t border-slate-100 mt-1">
                <span className="text-slate-500">AI</span>
                <span className="font-semibold text-slate-700">
                  {aiMsgCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}