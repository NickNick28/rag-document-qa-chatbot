"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes"; // 1. เพิ่ม import นี้

interface Props {
  children: React.ReactNode;
}

export default function Providers({ children }: Props) {
  return (
    <SessionProvider>
      {/* 2. เอา ThemeProvider มาครอบ children ไว้ข้างใน SessionProvider */}
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}