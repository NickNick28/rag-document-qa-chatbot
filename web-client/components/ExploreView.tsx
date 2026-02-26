"use client";

import { useState, useMemo } from "react";
import {
  Bot,
  Search,
  Calendar,
  Clock,
  Globe,
  MessageCircle,
  Filter,      // ✅ เพิ่ม Icon
  ArrowUpDown, // ✅ เพิ่ม Icon
} from "lucide-react";

export type BotData = {
  bot_id: string;
  name: string;
  description: string;
  owner_id?: string;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
};

interface ExploreViewProps {
  bots: BotData[];
  onSelectBot: (botId: string) => void;
  isLoading: boolean;
}

export default function ExploreView({
  bots,
  onSelectBot,
  isLoading,
}: ExploreViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  
  // ✅ State สำหรับ Filter และ Sort
  const [sortBy, setSortBy] = useState<"updated" | "created">("updated"); // Default: อัปเดตล่าสุด
  const [timeFilter, setTimeFilter] = useState<"all" | "7days" | "30days">("all"); // Default: ทั้งหมด

  const filteredAndSortedBots = useMemo(() => {
    // 1. Filter: ค้นหาด้วย Text (ชื่อ/คำอธิบาย)
    let result = bots.filter(
      (bot) =>
        bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bot.description &&
          bot.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // ✅ 2. Filter: กรองตามช่วงเวลา (Timeframe)
    if (timeFilter !== "all") {
        const now = new Date();
        const daysToSubtract = timeFilter === "7days" ? 7 : 30;
        const cutoffDate = new Date(now.setDate(now.getDate() - daysToSubtract));

        result = result.filter((bot) => {
            // เช็คจากวันที่ตาม Sort ที่เลือก (ถ้าเรียง created ก็กรอง created, ถ้า updated ก็กรอง updated)
            const targetDateStr = sortBy === "created" ? bot.created_at : bot.updated_at;
            const targetDate = new Date(targetDateStr || 0);
            return targetDate >= cutoffDate;
        });
    }

    // ✅ 3. Sort: เรียงลำดับตามตัวเลือก
    result.sort((a, b) => {
        const dateA = new Date((sortBy === "created" ? a.created_at : a.updated_at) || 0).getTime();
        const dateB = new Date((sortBy === "created" ? b.created_at : b.updated_at) || 0).getTime();
        
        // เรียงจาก มาก -> น้อย (ใหม่สุดขึ้นก่อนเสมอ)
        return dateB - dateA;
    });

    return result;
  }, [bots, searchTerm, sortBy, timeFilter]);

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

  return (
    <div className="flex-1 h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* --- HEADER --- */}
      <div className="px-8 py-8 bg-white border-b border-slate-200 shrink-0 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
          <Globe className="text-orange-500" /> Explore Assistants
        </h1>
        <p className="text-slate-500 text-sm mb-6 max-w-2xl mx-auto">
          ค้นหาและใช้งาน AI Chatbot ที่ถูกสร้างโดยชุมชนและองค์กรของคุณ
        </p>

        {/* Search Bar & Filters Wrapper */}
        <div className="max-w-xl mx-auto space-y-4">
            {/* Search Input */}
            <div className="relative w-full">
                <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                />
                <input
                    type="text"
                    placeholder="ค้นหาชื่อบอท หรือ รายละเอียด..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all text-sm shadow-sm"
                />
            </div>

            {/* ✅ Filter Controls Row */}
            <div className="flex items-center justify-center gap-3">
                {/* Sort Selector */}
                <div className="relative">
                    <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "updated" | "created")}
                        className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:border-orange-400 hover:bg-slate-50 cursor-pointer appearance-none shadow-sm"
                    >
                        <option value="updated">Recently Updated</option>
                        <option value="created">Newest Created</option>
                    </select>
                </div>

                {/* Timeframe Filter */}
                <div className="relative">
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <select 
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value as "all" | "7days" | "30days")}
                        className="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:border-orange-400 hover:bg-slate-50 cursor-pointer appearance-none shadow-sm"
                    >
                        <option value="all">All Time</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                    </select>
                </div>
            </div>
        </div>
      </div>

      {/* --- GRID CONTENT --- */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-48 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse"
              />
            ))}
          </div>
        ) : filteredAndSortedBots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Bot size={48} className="mb-4 opacity-20" />
            <p>ไม่พบรายการบอทที่คุณค้นหา</p>
            {/* แสดงข้อความเพิ่มเติมกรณีติด Filter */}
            {(timeFilter !== 'all' || searchTerm) && (
                <button 
                    onClick={() => {setSearchTerm(""); setTimeFilter("all");}}
                    className="cursor-pointer mt-2 text-xs text-orange-600 hover:underline"
                >
                    ล้างการค้นหาทั้งหมด
                </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            {filteredAndSortedBots.map((bot) => (
              <div
                key={bot.bot_id}
                onClick={() => onSelectBot(bot.bot_id)}
                className="group bg-white hover:bg-orange-50/30 p-5 rounded-2xl border border-slate-200 hover:border-orange-200 transition-all cursor-pointer flex flex-col h-full hover:shadow-lg hover:-translate-y-1 duration-200"
              >
                {/* Header Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Bot size={24} />
                  </div>{" "}
                  <span className="flex items-center justify-center rounded-full px-2 py-1.5 text-[10px] font-medium bg-orange-50 text-orange-600 border border-orange-100 shadow-sm transition-all duration-300 ease-in-out group-hover:bg-orange-300 group-hover:text-white group-hover:border-orange-100 group-hover:shadow-md">
                    <MessageCircle
                      size={14}
                      className="transition-transform duration-300 group-hover:-rotate-12"
                    />
                    <span className="max-w-0 overflow-hidden opacity-0 whitespace-nowrap transition-all duration-300 ease-in-out group-hover:max-w-[60px] group-hover:opacity-100 group-hover:ml-1.5">
                      Chat now
                    </span>
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 mb-4">
                  <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-1 group-hover:text-orange-700 transition-colors">
                    {bot.name}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {bot.description || "ไม่มีคำอธิบายเพิ่มเติม"}
                  </p>
                </div>

                {/* ส่วนแสดงวันที่ (Create / Update) */}
                <div className="pt-4 border-t border-slate-100 mt-auto">
                  <div className="flex flex-col gap-1.5">
                    {/* Created Date */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className={`flex items-center gap-1.5 ${sortBy === 'created' ? 'text-orange-600 font-medium' : ''}`}>
                        <Calendar size={12} className={sortBy === 'created' ? 'text-orange-500' : 'text-slate-300'} />{" "}
                        Created
                      </span>
                      <span className={`font-medium ${sortBy === 'created' ? 'text-orange-600' : 'text-slate-600'}`}>
                        {formatDate(bot.created_at)}
                      </span>
                    </div>

                    {/* Updated Date */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className={`flex items-center gap-1.5 ${sortBy === 'updated' ? 'text-orange-600 font-medium' : ''}`}>
                        <Clock size={12} className={sortBy === 'updated' ? 'text-orange-500' : 'text-slate-300'} /> Updated
                      </span>
                      <span className={`font-medium ${sortBy === 'updated' ? 'text-orange-600' : 'text-slate-600'}`}>
                        {formatDateTime(bot.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}