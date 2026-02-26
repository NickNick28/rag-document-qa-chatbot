import React, { useState } from "react";
import { HelpCircle, Phone, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const departments = [
  {
    name: "งานทะเบียนนิสิตและประมวลผล :",
    phone: "0 5596 8300 / 8324 / 8314 / 8315",
  },
  { name: "งานส่งเสริมการจัดการศึกษา :", phone: "0 5596 8317" },
  { name: "กยศ :", phone: "8316 / 8319" },
  { name: "หน่วยสนับสนุนการเรียนการสอน :", phone: "0 5596 8310 / 8311" },
  { name: "หน่วยตารางเรียน/ตารางสอน :", phone: "0 5596 8312" },
  { name: "งานจัดการศึกษาทั่วไป :", phone: "0 5596 8330 / 8331 / 8332" },
  { name: "งานพัฒนาหลักสูตร :", phone: "0 5596 8318 / 8306" },
  { name: "งานอำนวยการ :", phone: "0 5596 8303 / 8322" },
  { name: "หน่วยรับเข้า :", phone: "0 5596 8304 / 8309" },
];

const ContactPopover = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Trigger Button (ส่วนที่แสดงปกติ) */}
      <div
        className={`flex items-center gap-3 cursor-pointer transition-all duration-300 p-2 -ml-2 rounded-lg ${
          isOpen
            ? "bg-slate-800 text-white"
            : "text-slate-400 hover:text-orange-400"
        }`}
      >
        <div
          className={`p-1.5 rounded-full transition-colors ${
            isOpen ? "bg-orange-600" : "bg-transparent"
          }`}
        >
          <Phone
            className={`h-5 w-5 flex-shrink-0 ${
              isOpen ? "text-white" : "text-slate-500"
            }`}
          />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            ติดต่อหน่วยงานภายใน
          </span>
          <span className="text-xs text-slate-500 group-hover:text-slate-400">
            คลิกหรือชี้เพื่อดูเบอร์โทรศัพท์
          </span>
        </div>
        <ChevronUp
          className={`h-4 w-4 ml-2 transition-transform duration-300 ${
            isOpen ? "rotate-0 text-orange-500" : "rotate-180 text-slate-600"
          }`}
        />
      </div>

      {/* Popover List (ส่วนที่จะเด้งขึ้นมา) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-0 mb-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header ของ Popover */}
            <div className="bg-slate-900/50 p-3 border-b border-slate-700 flex items-center justify-between">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                Department Contact List
              </span>
              <span className="text-[10px] text-orange-500">
                08:30 - 16:30 น.
              </span>
            </div>

            {/* List รายการ */}
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1">
              {departments.map((dept, index) => (
                <div
                  key={index}
                  className="p-3 hover:bg-slate-700/50 rounded-lg transition-colors group border-b border-slate-700/50 last:border-0"
                >
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white mb-1">
                    {dept.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 group-hover:text-orange-300">
                    <Phone className="h-3 w-3" />
                    <a
                      href={`tel:${dept.phone
                        .split(",")[0]
                        .replace(/\s/g, "")}`}
                      className="hover:underline"
                    >
                      {dept.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContactPopover;
