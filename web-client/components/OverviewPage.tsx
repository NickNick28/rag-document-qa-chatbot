"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Bot,
  MessageSquare,
  Plus,
  MessageCircle,
  Coins,
  Settings,
  Trash2,
  Globe,
  Lock,
  Share2,
  Link2Off,
  Calendar,
  Clock,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";

type BotData = {
  id: string;
  name: string;
  desc: string;
  is_external?: boolean;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
  has_pending_request?: boolean;
};

interface OverviewPageProps {
  bots: BotData[]; // รับจาก MainPageClient
  onSelectBot: (id: string) => void;
  onCreateNew: () => void;
  userEmail?: string | null;
  totalConversations: number;
  onEditBot: (bot: BotData) => void;
  onDeleteBot: (id: string) => void;
  tokensUsed: number;
  maxTokens: number;
  isLoading?: boolean;
}

export default function OverviewPage({
  bots: initialBots, // เปลี่ยนชื่อ props ให้ชัดเจน
  onSelectBot,
  onCreateNew,
  userEmail,
  totalConversations,
  onEditBot,
  onDeleteBot,
  tokensUsed,
  maxTokens,
  isLoading: parentLoading = false,
}: OverviewPageProps) {
  // ✅ 1. State สำหรับเก็บข้อมูลบอท (เริ่มต้นด้วยค่าที่ส่งมาจาก Parent หรือ Array ว่าง)
  const [botList, setBotList] = useState<BotData[]>(initialBots || []);

  // ✅ 2. State สำหรับ Loading เฉพาะหน้านี้
  const [isFetching, setIsFetching] = useState(true);

  // ✅ 3. useEffect: ดึงข้อมูลใหม่ทุกครั้งที่หน้านี้ถูกโหลด (Mount) เพื่อความชัวร์
  useEffect(() => {
    const fetchLatestBots = async () => {
      try {
        setIsFetching(true);
        // เรียก API โดยใช้ no-store เพื่อไม่ให้จำ Cache เก่า
        const res = await fetch("/api/bots", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();

        if (Array.isArray(data)) {
          // Map ข้อมูลให้ตรง structure ถ้าจำเป็น (ในที่นี้สมมติว่าตรงแล้ว)
          const mappedBots = data.map((b: any) => ({
            id: b.bot_id || b.id,
            name: b.name,
            desc: b.description || b.desc,
            is_external: b.is_external,
            is_public: b.is_public,
            created_at: b.created_at,
            updated_at: b.updated_at,
            has_pending_request: b.has_pending_request,
          }));
          setBotList(mappedBots);
        }
      } catch (error) {
        console.error("Error fetching latest bots:", error);
        // ถ้า fetch ล้มเหลว ก็ใช้ค่าจาก initialBots ไปก่อน
      } finally {
        setIsFetching(false);
      }
    };

    fetchLatestBots();
  }, []); // [] = ทำงานครั้งเดียวตอนเปิดหน้า Overview

  // ✅ 4. useEffect: Sync ข้อมูลเมื่อ Parent (MainPageClient) ส่งค่าใหม่มา (เช่น ตอนกด Create/Edit/Delete)
  useEffect(() => {
    if (initialBots) {
      setBotList(initialBots);
    }
  }, [initialBots]);

  // 5. State สำหรับ Search
  const [searchTerm, setSearchTerm] = useState("");

  // 6. State สำหรับ Filter และ Sort
  const [sortBy, setSortBy] = useState<"updated" | "created">("updated");
  const [timeFilter, setTimeFilter] = useState<"all" | "7days" | "30days">(
    "all",
  );

  // 7. Logic: กรอง (Filter) + เรียงลำดับ (Sort)
  // ⚠️ เปลี่ยนมาใช้ botList แทน bots
  const filteredAndSortedBots = useMemo(() => {
    let result = botList.filter(
      (bot) =>
        bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bot.desc && bot.desc.toLowerCase().includes(searchTerm.toLowerCase())),
    );

    if (timeFilter !== "all") {
      const now = new Date();
      const daysToSubtract = timeFilter === "7days" ? 7 : 30;
      const cutoffDate = new Date(now.setDate(now.getDate() - daysToSubtract));

      result = result.filter((bot) => {
        const targetDateStr =
          sortBy === "created" ? bot.created_at : bot.updated_at;
        const targetDate = new Date(targetDateStr || 0);
        return targetDate >= cutoffDate;
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(
        (sortBy === "created" ? a.created_at : a.updated_at) || 0,
      ).getTime();
      const dateB = new Date(
        (sortBy === "created" ? b.created_at : b.updated_at) || 0,
      ).getTime();
      return dateB - dateA;
    });

    return result;
  }, [botList, searchTerm, sortBy, timeFilter]);

  // --- Helpers ---
  const isUnlimited = maxTokens === null || maxTokens === Infinity;
  const percentage = isUnlimited
    ? 0
    : maxTokens > 0
      ? Math.min((tokensUsed / maxTokens) * 100, 100)
      : 0;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  // console.log("Debug Bot List:", botList);

  // =========================================================
  // 💀 SKELETON LOADING VIEW
  // =========================================================
  // โชว์ Skeleton ถ้า Parent กำลังโหลด หรือ ตัวเองกำลัง Fetch ใหม่
  if (parentLoading || isFetching) {
    return (
      <div className="flex-1 h-full bg-slate-50 overflow-y-auto custom-scrollbar p-6 space-y-8">
        {/* Header Skeleton */}
        <div>
          <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 rounded-lg animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 animate-pulse"
            >
              <div className="w-14 h-14 rounded-full bg-slate-200 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                <div className="h-8 w-16 bg-slate-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Bot Grid Skeleton */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 w-32 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-slate-200 rounded-xl animate-pulse"></div>
          </div>
          <div className="h-11 w-full bg-slate-200 rounded-xl animate-pulse mb-6"></div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse h-full flex flex-col"
              >
                <div className="flex justify-between mb-4">
                  <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                  <div className="flex gap-1">
                    <div className="w-12 h-5 bg-slate-200 rounded-full"></div>
                    <div className="w-12 h-5 bg-slate-200 rounded-full"></div>
                  </div>
                </div>
                <div className="space-y-3 flex-1 mb-4">
                  <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                </div>
                <div className="pt-3 border-t border-slate-50 space-y-2 mb-3">
                  <div className="flex justify-between">
                    <div className="h-3 w-12 bg-slate-200 rounded"></div>
                    <div className="h-3 w-20 bg-slate-200 rounded"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="h-3 w-12 bg-slate-200 rounded"></div>
                    <div className="h-3 w-24 bg-slate-200 rounded"></div>
                  </div>
                </div>
                <div className="h-8 bg-slate-200 rounded-lg w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================
  return (
    <div className="flex-1 h-full bg-slate-50 overflow-y-auto custom-scrollbar p-6 space-y-8 animate-in fade-in duration-500">
      {/* --- Header Section --- */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Overview Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          ยินดีต้อนรับคุณ{" "}
          <span className="text-orange-600 font-semibold">
            {userEmail?.split("@")[0]}
          </span>
        </p>
      </div>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Bots - ใช้ botList.length */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
          <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Bot size={28} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">My Chatbots</p>
            <h2 className="text-3xl font-bold text-slate-800">
              {botList.length}
            </h2>
          </div>
        </div>

        {/* Card 2: Total Conversations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <MessageCircle size={28} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">
              Total Conservation
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-bold text-slate-800">
                {totalConversations.toLocaleString()}
              </h2>
              <span className="text-xs text-slate-400">session</span>
            </div>
          </div>
        </div>

        {/* Card 3: Token Usage */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center transition-transform hover:scale-[1.02]">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <Coins size={28} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-medium">
                Token Usage (Monthly)
              </p>
              <div className="flex items-baseline gap-1">
                <h2 className="text-2xl font-bold text-slate-800">
                  {tokensUsed.toLocaleString()}
                </h2>
                <span className="text-xs text-slate-400">
                  /{isUnlimited ? "∞" : (maxTokens || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${
                isUnlimited
                  ? "bg-purple-600"
                  : percentage > 90
                    ? "bg-red-500"
                    : percentage > 70
                      ? "bg-yellow-500"
                      : "bg-purple-600"
              }`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[10px] text-slate-400">
              Resets every 1st of months
            </p>
            <p className="text-[10px] font-bold text-purple-600">
              {percentage.toFixed(1)}% Used
            </p>
          </div>
        </div>
      </div>

      {/* --- My Bots Grid --- */}
      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-slate-400" />{" "}
            บอทของคุณทั้งหมด
          </h2>
          <button
            onClick={onCreateNew}
            className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 text-sm shadow-md shadow-orange-100"
          >
            <Plus size={18} /> สร้างบอทใหม่
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาบอท..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all text-sm shadow-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            {/* Sort Selector */}
            <div className="relative">
              <ArrowUpDown
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "updated" | "created")
                }
                className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-orange-400 hover:bg-slate-50 cursor-pointer appearance-none shadow-sm"
              >
                <option value="updated">Recently Updated</option>
                <option value="created">Newest Created</option>
              </select>
            </div>

            {/* Timeframe Filter */}
            <div className="relative">
              <Filter
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <select
                value={timeFilter}
                onChange={(e) =>
                  setTimeFilter(e.target.value as "all" | "7days" | "30days")
                }
                className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:outline-none focus:border-orange-400 hover:bg-slate-50 cursor-pointer appearance-none shadow-sm"
              >
                <option value="all">All Time</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid Content */}
        {filteredAndSortedBots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
            {timeFilter !== "all" || searchTerm ? (
              <>
                <p className="text-slate-500">ไม่พบรายการบอทที่คุณค้นหา</p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setTimeFilter("all");
                  }}
                  className="cursor-pointer mt-2 text-xs text-orange-600 hover:underline"
                >
                  ล้างการค้นหาทั้งหมด
                </button>
              </>
            ) : (
              <p className="text-slate-500">ยังไม่มีบอท</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSortedBots.map((bot) => (
              <div
                key={bot.id}
                className="group bg-white hover:bg-orange-50/50 p-5 rounded-2xl border border-slate-200 hover:border-orange-200 transition-all flex flex-col h-full hover:shadow-md relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot size={20} />
                  </div>

                  {/* Actions & Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {/* ✅ Badge ใหม่: Pending Request Status (แทรกตรงนี้) */}
                    {bot.has_pending_request && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 border bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse"
                        title="Waiting for Approval"
                      >
                        <Clock size={10} />
                        <span>รออนุมัติ</span>
                      </span>
                    )}
                    {/* Badge 1: Explore Status */}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
                        bot.is_public
                          ? "bg-green-50 text-green-600 border-green-100"
                          : "bg-slate-50 text-slate-400 border-slate-100"
                      }`}
                      title={bot.is_public ? "Public on Explore" : "Private"}
                    >
                      {bot.is_public ? <Globe size={10} /> : <Lock size={10} />}
                      <span className="hidden min-[1400px]:inline">
                        {bot.is_public ? "Public" : "Private"}
                      </span>
                    </span>

                    {/* Badge 2: Share Status */}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 border ${
                        bot.is_external
                          ? "bg-orange-50 text-orange-600 border-orange-100"
                          : "bg-slate-50 text-slate-400 border-slate-100"
                      }`}
                      title={
                        bot.is_external ? "Shared via Link" : "Link Closed"
                      }
                    >
                      {bot.is_external ? (
                        <Share2 size={10} />
                      ) : (
                        <Link2Off size={10} />
                      )}
                      <span className="hidden min-[1400px]:inline">
                        {bot.is_external ? "Shared" : "Closed"}
                      </span>
                    </span>

                    {/* Buttons */}
                    <div className="flex items-center border-l border-slate-100 pl-1.5 ml-0.5 gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditBot(bot);
                        }}
                        className="cursor-pointer p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Settings"
                      >
                        <Settings size={15} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBot(bot.id);
                        }}
                        className="cursor-pointer p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Area กดเพื่อเข้าแชท */}
                <div
                  onClick={() => onSelectBot(bot.id)}
                  className="cursor-pointer flex-1 mb-2"
                >
                  <h3 className="font-bold text-slate-800 mb-1 line-clamp-1 group-hover:text-orange-700 transition-colors">
                    {bot.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                    {bot.desc || "ไม่มีคำอธิบาย"}
                  </p>
                </div>

                {/* ส่วนแสดงวันที่ (Created & Updated) */}
                <div className="pt-3 border-t border-slate-100 mt-auto mb-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span
                        className={`flex items-center gap-1.5 ${
                          sortBy === "created"
                            ? "text-orange-600 font-medium"
                            : ""
                        }`}
                      >
                        <Calendar
                          size={12}
                          className={
                            sortBy === "created"
                              ? "text-orange-500"
                              : "text-slate-300"
                          }
                        />{" "}
                        Created
                      </span>
                      <span
                        className={`font-medium ${
                          sortBy === "created"
                            ? "text-orange-600"
                            : "text-slate-600"
                        }`}
                      >
                        {formatDate(bot.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span
                        className={`flex items-center gap-1.5 ${
                          sortBy === "updated"
                            ? "text-orange-600 font-medium"
                            : ""
                        }`}
                      >
                        <Clock
                          size={12}
                          className={
                            sortBy === "updated"
                              ? "text-orange-500"
                              : "text-slate-300"
                          }
                        />{" "}
                        Updated
                      </span>
                      <span
                        className={`font-medium ${
                          sortBy === "updated"
                            ? "text-orange-600"
                            : "text-slate-600"
                        }`}
                      >
                        {formatDateTime(bot.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onSelectBot(bot.id)}
                  className="cursor-pointer w-full py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium group-hover:bg-orange-600 group-hover:text-white transition-colors"
                >
                  เริ่มแชท
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
