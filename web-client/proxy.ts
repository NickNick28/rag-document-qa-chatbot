// proxy.ts
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// สร้าง instance ของ auth
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const userEmail = req.auth?.user?.email;
  const path = req.nextUrl.pathname;
  const userRole = req.auth?.user?.role;

  // Log ดูว่า Middleware ทำงานไหม (ดูใน Terminal ฝั่ง Server)
  console.log(
    `Middleware Checking: Path=${path}, User=${userEmail}, LoggedIn=${isLoggedIn}, Role=${userRole}`
  );

  // ================================ถ้าจะให้ user mail อื่นเข้าให้ comment logic การป้องกัน===============================================================
  // Logic การป้องกัน
  const isProtectedPage = path.startsWith("/main") || path.startsWith("/dashboard"); //เพิ่มหน้าป้องกันตรงนี้ ex. || path.startsWith("/dashboard")
  const isOrgEmail = userEmail?.endsWith("@nu.ac.th");

  if (isProtectedPage) {
    if (!isLoggedIn) {
      console.log("🚫 Redirecting to Login");
      // ส่งไปหน้า Login และจำไว้ว่าเดิมจะไปหน้าไหน (callbackUrl)
      const newUrl = new URL("/login", req.nextUrl);
      newUrl.searchParams.set("callbackUrl", path);
      return Response.redirect(newUrl);
    }

    if (!isOrgEmail) {
      console.log("🚫 Unauthorized Domain");
      return Response.redirect(new URL("/", req.nextUrl));
    }
  }

  console.log("✅ Access Granted");
});

// Config นี้สำคัญมาก ห้ามลบ!
export const config = {
  // บังคับให้ Middleware ทำงานทุกหน้า ยกเว้นไฟล์ static และ api auth
  // matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
  matcher: ["/dashboard/:path*", "/api/auth/:path*", "/main/:path*"],
};
