import React from 'react';
import { motion } from 'framer-motion';

const AnimatedIcon = ({ children, color = "blue", className = '' }) => {
  // กำหนดสีตาม Theme (Blue หรือ Orange)
  const colors = {
    blue: {
      border: "border-blue-200",
      dashed: "border-blue-400",
      glow: "bg-blue-400/10",
    },
    orange: {
      border: "border-orange-200",
      dashed: "border-orange-400",
      glow: "bg-orange-400/10",
    }
  };
  
  const theme = colors[color] || colors.blue;

  return (
    <div className={`relative flex items-center justify-center w-16 h-16 rounded-full ${className}`}>
      
      {/* 1. วงแหวนพื้นหลัง (Background Ring) */}
      <div className={`absolute inset-0 rounded-full border ${theme.border} opacity-30`}></div>

      {/* 2. วงแหวนประ หมุนวน (Spinning Dashed Ring) - Loop Effect */}
      <motion.div
        className={`absolute inset-[-2px] rounded-full border border-dashed ${theme.dashed} opacity-40`}
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 10, // หมุนช้าๆ 1 รอบใช้เวลา 10 วิ
          repeat: Infinity, // ทำซ้ำตลอดไป
          ease: "linear" // ความเร็วคงที่
        }}
      />

      {/* 3. วงแหวนด้านใน หมุนสวนทาง (Counter-Spinning Inner Ring) */}
      <motion.div
        className={`absolute inset-[4px] rounded-full border-t-2 ${theme.border} opacity-60`}
        animate={{ rotate: -360 }}
        transition={{ 
          duration: 15, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      />

      {/* 4. แสง Glow ตรงกลางแบบ Pulse */}
      <motion.div
        className={`absolute inset-0 rounded-full ${theme.glow} blur-md`}
        animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {/* 5. ตัวไอคอน ลอยขึ้นลงเบาๆ */}
      <motion.div
        animate={{ y: [-2, 2, -2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default AnimatedIcon;