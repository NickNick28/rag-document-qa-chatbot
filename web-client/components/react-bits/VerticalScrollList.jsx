import React from 'react';
import { motion } from 'framer-motion';

const VerticalScrollList = ({ 
  items, 
  color = "orange", 
  speed = 20, // ระยะเวลาใน 1 รอบ (ยิ่งเยอะยิ่งช้า)
  height = "h-[280px]" // ความสูงของกรอบ
}) => {
  // สร้างรายการซ้ำ 4 ชุด เพื่อให้การ Loop เนียนตาที่สุด (0% -> -50% จะใช้ข้อมูล 2 ชุด)
  const duplicatedItems = [...items, ...items, ...items, ...items];

  // กำหนดสีตาม Theme
  const theme = {
    orange: { dot: 'bg-orange-500', borderHover: 'hover:border-orange-300', bgHover: 'hover:bg-orange-50' },
    blue: { dot: 'bg-blue-900', borderHover: 'hover:border-blue-300', bgHover: 'hover:bg-blue-50' }
  };
  const selectedTheme = theme[color];

  return (
    <div className={`relative ${height} overflow-hidden group`}>
      
      {/* 1. Mask ไล่สีด้านบนและล่าง เพื่อให้รายการค่อยๆ จางหายไป */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent z-10 pointer-events-none"></div>

      {/* 2. ส่วนที่เคลื่อนไหว */}
      <motion.div
        className="flex flex-col gap-4"
        animate={{ transform: ["translate3d(0, 0%, 0)", "translate3d(0, -50%, 0)"] }}// เลื่อนจากบนลงล่างครึ่งทาง (เพราะเราเบิ้ลข้อมูลไว้แล้ว)
        transition={{
          duration: speed,
          ease: "linear",
          repeat: Infinity, // ทำซ้ำตลอดไป
        }}
        // หยุด animation เมื่อเอาเมาส์ไปชี้ (Optional: ถ้าอยากให้หยุดให้เพิ่ม style นี้)
        style={{ willChange: "transform" }}
      >
         {/* Render รายการ */}
         {duplicatedItems.map((item, index) => (
            <div 
                key={index}
                className={`flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 transition-all duration-300 ${selectedTheme.borderHover} ${selectedTheme.bgHover} shadow-sm hover:shadow-md cursor-default`}
            >
                <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${selectedTheme.dot}`} />
                <span className="text-slate-600 font-medium leading-relaxed">{item}</span>
            </div>
         ))}
      </motion.div>
    </div>
  );
};

export default VerticalScrollList;