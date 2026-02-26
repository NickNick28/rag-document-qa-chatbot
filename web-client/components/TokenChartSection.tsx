//ไฟล์นี้จะทำหน้าที่เรียก API app/api/analytics/tokens/route.ts
"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ArrowRight, Loader2 } from "lucide-react";
import TokenUsageChart from "@/components/TokenUsageChart";

export default function TokenChartSection() {
  // ตั้งค่าเริ่มต้น: 7 วันล่าสุด
  const todayStr = new Date().toISOString().split("T")[0];
  const dateMinus7 = new Date();
  dateMinus7.setDate(dateMinus7.getDate() - 6);
  const startStr = dateMinus7.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(startStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChartData = async (start: string, end: string) => {
    setIsLoading(true);
    try {
      // เรียก API ที่เราทำไว้
      const res = await fetch(`/api/analytics/tokens?from=${start}&to=${end}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch (error) {
      console.error("Failed to fetch token data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData(startDate, endDate);
  }, [startDate, endDate]);

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);

    // ✅ Logic Auto-correct:
    // ถ้าวันเริ่มที่เลือกใหม่ มันดัน "มากกว่า" วันจบปัจจุบัน -> ดันวันจบให้เท่ากับวันเริ่มทันที
    if (newStart > endDate) {
      setEndDate(newStart);
    }
  };

  // เมื่อเปลี่ยน "วันจบ"
  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = e.target.value;
    // ไม่ต้องเช็คย้อนหลังมาก เพราะเราจะ block ใน UI ด้วย min={startDate} แล้ว
    setEndDate(newEnd);
  };

  return (
    <div>
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
        <h3 className="text-xl font-bold text-slate-800">Token Usage Trends</h3>

        {/* Date Picker */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
          <CalendarIcon size={16} className="text-slate-500" />
          <input
            type="date"
            value={startDate}
            max={todayStr}
            onChange={handleStartChange}
            onClick={(e) => e.currentTarget.showPicker()}
            className="text-xs text-slate-600 font-medium bg-transparent border-none outline-none cursor-pointer focus:ring-0 p-0"
          />
          <ArrowRight size={12} className="text-slate-300" />
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={todayStr}
            onChange={handleEndChange}
            onClick={(e) => e.currentTarget.showPicker()}
            className="text-xs text-slate-600 font-medium bg-transparent border-none outline-none cursor-pointer focus:ring-0 p-0"
          />
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative min-h-[400px]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-10 rounded-xl">
            <Loader2 className="animate-spin text-purple-600" size={32} />
          </div>
        )}
        <TokenUsageChart data={chartData} />
      </div>
    </div>
  );
}
