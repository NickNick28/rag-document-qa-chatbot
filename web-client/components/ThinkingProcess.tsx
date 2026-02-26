"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, Sparkles, Database } from "lucide-react";

export type StepItem = {
  id: string;
  title: string;
  status: "running" | "completed" | "error";
};

interface ThinkingProcessProps {
  steps: StepItem[];
  isFinished: boolean;
}

export default function ThinkingProcess({ steps, isFinished }: ThinkingProcessProps) {
  // สร้าง State ควบคุมการกาง/หุบ (ซ่อนรายละเอียดไว้เป็นค่าเริ่มต้น)
  const [isExpanded, setIsExpanded] = useState(false);

  if (!steps || steps.length === 0) return null;

  // หา Step ล่าสุดเพื่อเอาข้อความมาโชว์ตอนที่ยังไม่กาง
  const currentStep = steps[steps.length - 1];
  
  // กำหนดข้อความหลักของกล่อง
  const mainTitle = isFinished 
    ? "ประมวลผลและค้นหาข้อมูลสำเร็จ" 
    : currentStep?.title || "กำลังประมวลผล...";

  return (
    <div className="mb-4 text-sm w-full max-w-sm">
      {/* 🟢 ส่วน Header (ตัวที่คลิกได้เพื่อกาง/หุบ) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2.5 px-3 py-2 bg-slate-100/70 hover:bg-slate-200/60 border border-slate-200 rounded-xl text-slate-600 transition-colors w-auto cursor-pointer"
      >
        {isFinished ? (
          <Sparkles size={16} className="text-green-500" />
        ) : (
          <Loader2 size={16} className="text-orange-500 animate-spin" />
        )}
        
        <span className="font-medium text-xs select-none">
          {mainTitle}
        </span>
        
        {isExpanded ? (
          <ChevronDown size={14} className="text-slate-400 ml-1" />
        ) : (
          <ChevronRight size={14} className="text-slate-400 ml-1" />
        )}
      </button>

      {/* 🔵 ส่วน Content (รายการที่ซ่อนอยู่) */}
      {isExpanded && (
        <div className="mt-2 ml-1 border-l-2 border-slate-200 pl-4 py-1 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
          {steps.map((step) => (
            <div key={step.id} className="flex items-start gap-3">
              {/* Icon ตามสถานะ */}
              <div className="mt-0.5 shrink-0">
                {step.status === "completed" ? (
                  <CheckCircle2 size={14} className="text-slate-400" />
                ) : step.status === "error" ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-red-100 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </div>
                ) : (
                  <Loader2 size={14} className="text-orange-400 animate-spin" />
                )}
              </div>
              
              {/* ข้อความรายละเอียด */}
              <div className={`text-xs ${step.status === "completed" ? "text-slate-500" : "text-slate-700 font-medium"}`}>
                {step.title}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}