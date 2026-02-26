import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    const currentUserRole = (session?.user as any)?.role;

    // 1. Check Admin Permission
    if (currentUserRole !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Body
    const body = await req.json();
    const { email, role } = body;

    console.log("🛠️ Admin Action: Updating user", { email, role });

    if (!email || !role) {
      return NextResponse.json({ error: "Missing email or role" }, { status: 400 });
    }

    // 3. Create Admin Client (Service Role)
    // จำเป็นต้องใช้ Service Role เพื่อแก้ไขข้อมูล (Bypass RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 4. Update Database
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .update({ role: role })  // สิ่งที่ต้องการแก้
      .eq('email', email)      // เงื่อนไข (WHERE email = ...) สำคัญมาก!
      .select();

    if (error) {
      console.error("❌ Supabase Update Error:", error.message);
      throw error;
    }

    console.log("✅ Update Success:", data);

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("🔥 Server Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}