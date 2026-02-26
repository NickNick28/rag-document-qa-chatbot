// types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  /**
   * ขยาย interface Session เพื่อให้รองรับ accessToken
   */
  interface Session {
    accessToken?: string;
    user: {
      // ถ้าอยากเพิ่ม field อื่นใน user เช่น role ก็เพิ่มตรงนี้ได้
      id?: string;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * ขยาย interface JWT เพื่อให้รับ accessToken จาก provider ได้
   */
  interface JWT {
    accessToken?: string;
  }
}
