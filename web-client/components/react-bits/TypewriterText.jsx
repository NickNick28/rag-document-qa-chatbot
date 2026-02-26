import React from 'react';
import { motion } from 'framer-motion';

const TypewriterText = ({ 
  text, 
  className = '', 
  speed = 0.02, // ความเร็วในการพิมพ์ (ยิ่งน้อยยิ่งเร็ว)
  delay = 0     // เวลารอก่อนเริ่มพิมพ์
}) => {
  // แตกประโยคเป็นตัวอักษร
  const characters = Array.from(text);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: speed,
        delayChildren: delay,
      },
    },
  };

  const charVariants = {
    hidden: { opacity: 0, display: "none" }, // display none เพื่อไม่ให้กินที่ก่อนพิมพ์
    visible: { opacity: 1, display: "inline" },
  };

  return (
    <motion.p
      className={`inline-block ${className}`}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }} // เริ่มพิมพ์เมื่อเห็น 10% ของ element
    >
      {characters.map((char, index) => (
        <motion.span key={index} variants={charVariants}>
          {char}
        </motion.span>
      ))}
      
      {/* Cursor กระพริบปิดท้าย */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-[2px] h-[1em] bg-orange-500 ml-1 align-middle"
      />
    </motion.p>
  );
};

export default TypewriterText;