import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import { supabaseAdmin } from "@/app/lib/supabase-admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // เช็คว่า User เพิ่งล็อกอินเข้ามาหรือไม่ (มี user object) หรือ Token ยังไม่มี Role
      if (user || !token.role) {
        const email = user?.email || token.email;

        if (email) {
          // ลองดึง Role ดูก่อน
          // ใช้ .maybeSingle() แทน .single() ถ้าไม่เจอ จะคืนค่า null แทนที่จะ Error
          // ✅ ใช้ supabaseAdmin เพื่อให้มั่นใจว่าอ่านข้อมูลได้แน่นอน ไม่ติด RLS (กรณี User ยังไม่มีสิทธิ์)
          let { data, error } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("email", email)
            .maybeSingle();

          // ถ้าไม่เจอข้อมูล (แสดงว่าเป็น User ใหม่) -> ให้บันทึกลลง Database เลย
          if (!data) {
            console.log("🆕 New user detected, registering:", email);

            // เพิ่มลงตาราง user_roles เป็น role 'user'
            // ✅ ใช้ supabaseAdmin เพื่อให้มั่นใจว่าเขียนลง DB ได้แน่นอน
            const { error: insertError } = await supabaseAdmin
              .from("user_roles")
              .insert([{ email: email, role: "user" }]);

            if (!insertError) {
              // ถ้าบันทึกสำเร็จ ให้ตั้งค่า data เป็น user ธรรมดา
              data = { role: "user" };
            } else {
              console.error("Failed to auto-register user:", insertError);
            }
          }

          // 3. ฝัง Role ลง Token
          token.role = data?.role || "user";
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.role) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
