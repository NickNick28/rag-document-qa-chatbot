import React from 'react';
import { motion } from 'framer-motion';

const ScrollReveal = ({ 
  children, 
  direction = 'up', // up, down, left, right
  delay = 0, 
  duration = 0.5, 
  className = '' 
}) => {
  // ตั้งค่าทิศทางที่ element จะเคลื่อนที่มาก่อนโชว์
  const variants = {
    hidden: {
      opacity: 0,
      y: direction === 'up' ? 30 : direction === 'down' ? -30 : 0,
      x: direction === 'left' ? 30 : direction === 'right' ? -30 : 0,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration: duration,
        delay: delay,
        ease: "easeOut" // การเคลื่อนที่แบบนุ่มนวล
      }
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10%" }} // once: true คือโชว์ครั้งเดียวไม่หายไปตอนเลื่อนกลับ
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;