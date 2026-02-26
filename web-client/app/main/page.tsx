import { auth } from "@/app/lib/auth"; 
import MainPageClient from "@/components/MainPageClient";

export default async function MainPage() {
  // ดึง Session ฝั่ง Server
  const session = await auth();
  
  // ดึง Role (ถ้าไม่มีให้เป็น user)
  const userRole = (session?.user as any)?.role || "user";

  // Render Client Component และส่ง Role เข้าไป
  return <MainPageClient userRole={userRole} />;
}