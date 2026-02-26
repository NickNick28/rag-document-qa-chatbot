// auth.config.ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login", // หรือหน้าที่คุณต้องการ
  },
  providers: [], // สำคัญ! ปล่อยว่างไว้ในไฟล์นี้
  callbacks: {
    // ฟังก์ชัน authorized นี้จะทำงานใน proxy.ts
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const userEmail = auth?.user?.email;
      const isChatPage = nextUrl.pathname.startsWith("/main");

      // เปลี่ยนตรงนี้เป็น Domain องค์กรของคุณ
      const isOrgEmail = userEmail?.endsWith("@nu.ac.th");

      if (isChatPage) {
        if (!isLoggedIn) return false; // ส่งไป Login
        if (!isOrgEmail) return false; // ผิด Domain ก็ส่งไป Login (หรือจะ Handle เป็น Redirect ก็ได้)
        return true;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
