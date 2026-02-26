import { NextResponse } from "next/server";
import { getMcpClient } from "@/app/lib/mcp-client";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js"; // ✅ Import เพื่อสร้าง Admin Client

// ✅ สร้าง Admin Client ไว้ใช้ Bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// 1. GET: ดึงรายชื่อบอท
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = session.user.email;

    // 1. Query ข้อมูลบอท พร้อม Join ตาราง bot_requests
    // (ใช้ชื่อ relation ที่ถูกต้องตามที่คุณแก้ไปรอบก่อน เช่น bot_requests_bot_id_fkey)
    const { data, error } = await supabaseAdmin
      .from("bots")
      .select(
        `
        *,
        bot_requests:bot_requests!bot_requests_bot_id_fkey (
          status,
          request_type
        )
      `,
      )
      .eq("owner_id", userEmail)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch Bots Error:", error);
      throw error;
    }

    // 2. Map ข้อมูลส่งกลับ Frontend
    const botsWithStatus = data.map((bot) => {
      const requests = bot.bot_requests as any;

      // หา Request ที่ยัง Pending อยู่
      const pendingReqObj =
        requests && Array.isArray(requests)
          ? requests.find((r: any) => r.status === "pending")
          : null;

      return {
        ...bot,
        // ส่ง flag ว่ามี pending ไหม
        has_pending_request: !!pendingReqObj,

        // [จุดสำคัญที่ต้องเพิ่ม] ส่งประเภทของ Request กลับไปด้วย
        pending_request_type: pendingReqObj ? pendingReqObj.request_type : null,

        // ลบ field นี้ออกเพื่อความสะอาดของ response (optional)
        bot_requests: undefined,
      };
    });

    return NextResponse.json(botsWithStatus);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: สร้างบอทใหม่
export async function POST(req: Request) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userRole = (session.user as any).role || "user";
  const userEmail = session.user.email;

  // ---------------------------------------------------------
  // LOGIC: จำกัดสิทธิ์ User สร้างได้ไม่เกิน 2 ตัว
  // ---------------------------------------------------------
  if (userRole === "user") {
    // 1. นับจำนวนบอทที่ User คนนี้เป็นเจ้าของอยู่
    const { count, error } = await supabaseAdmin
      .from("bots")
      .select("*", { count: "exact", head: true }) // head: true คือนับจำนวนเฉยๆ ไม่เอาข้อมูล
      .eq("owner_id", userEmail);

    if (error) {
      console.error("Error checking bot count:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // 2. เช็คว่าเกินโควต้าไหม (2 ตัว)
    if (count !== null && count >= 2) {
      return NextResponse.json(
        { error: "Limit Exceeded: Users can create up to 2 bots only." },
        { status: 403 }, // 403 Forbidden
      );
    }
  }

  const body = await req.json();
  const { bot_id, name, description } = body;

  if (!bot_id || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const defaultSystemInstruction =
    "คุณคือผู้ช่วย AI ที่มีความรู้ความสามารถ ตอบคำถามอย่างสุภาพและช่วยเหลือผู้ใช้งานอย่างเต็มที่";

  // ✅ เปลี่ยนจาก supabase -> supabaseAdmin
  const { error } = await supabaseAdmin.from("bots").insert([
    {
      bot_id: bot_id,
      name: name,
      description: description || "",
      owner_id: userEmail,
      is_public: false,
      is_external: false,
      recommend_chat: [],
      system_instruction: defaultSystemInstruction,
      temperature: 0.5,
    },
  ]);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Bot ID นี้มีอยู่แล้ว" },
        { status: 400 },
      );
    }
    console.error("Create Bot Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Created successfully" });
}

// 3. DELETE: ลบ
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const body = await req.json();
  const { botId } = body;

  if (!botId) {
    return NextResponse.json({ error: "Missing botId" }, { status: 400 });
  }

  try {
    // ✅ เปลี่ยนจาก supabase -> supabaseAdmin
    // (ถ้าตั้ง CASCADE DELETE ใน DB แล้ว บรรทัดนี้จะลบ Documents ให้เอง)
    const { error, count } = await supabaseAdmin
      .from("bots")
      .delete({ count: "exact" })
      .eq("bot_id", botId)
      .eq("owner_id", userEmail);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json(
        { error: "Bot not found or permission denied" },
        { status: 403 },
      );
    }

    // ล้าง Pinecone
    try {
      const client = await getMcpClient();
      const tools = await client.listTools();
      if (tools.tools.some((t) => t.name === "delete_bot")) {
        await client.callTool({
          name: "delete_bot",
          arguments: { bot_id: botId },
        });
      }
    } catch (err) {
      console.warn("Warning: Failed to cleanup Pinecone", err);
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. PUT: แก้ไขบอท
export async function PUT(req: Request) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // ดึง botId ออกมาเช็คก่อน
    const { botId } = body;

    if (!botId)
      return NextResponse.json({ error: "Bot ID required" }, { status: 400 });

    // 1. เช็คความเป็นเจ้าของ
    const { data: botCheck } = await supabaseAdmin
      .from("bots")
      .select("owner_id, share_token")
      .eq("bot_id", botId)
      .single();

    const isOwner = botCheck?.owner_id === session.user.email;
    const isAdmin = userRole === "admin";

    if (!botCheck || (!isOwner && !isAdmin)) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // ✅ 2. สร้าง Update Payload แบบ Dynamic (Partial Update)
    // เริ่มต้นด้วย field ที่ต้องอัปเดตเสมอ
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    // เช็คทีละ field ว่ามีการส่งมาไหม ถ้ามีค่อยยัดใส่ payload
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.description !== undefined)
      updatePayload.description = body.description;
    if (body.system_instruction !== undefined)
      updatePayload.system_instruction = body.system_instruction;
    if (body.temperature !== undefined)
      updatePayload.temperature = body.temperature;

    // ส่วน Permission
    if (body.is_public !== undefined) updatePayload.is_public = body.is_public;
    if (body.is_external !== undefined)
      updatePayload.is_external = body.is_external;

    // ส่วน Token (ถ้ามีส่งมา ให้ใช้ตัวที่ส่งมา)
    if (body.share_token) {
      updatePayload.share_token = body.share_token;
    }
    // Logic Auto-generate: ถ้าเปิด External แต่ยังไม่มี Token และไม่ได้ส่งมา -> Server สร้างให้
    else if (body.is_external === true && !botCheck.share_token) {
      updatePayload.share_token = crypto.randomUUID();
    }

    // ส่วน Recommend Chat Array
    if (body.recommend_chat !== undefined) {
      let recommendChatArray: string[] = [];
      if (typeof body.recommend_chat === "string") {
        recommendChatArray = body.recommend_chat
          .split("\n")
          .map((s: string) => s.trim())
          .filter((s: string) => s !== "");
      } else if (Array.isArray(body.recommend_chat)) {
        recommendChatArray = body.recommend_chat;
      }
      updatePayload.recommend_chat = recommendChatArray;
    }

    // 3. ทำการ Update
    const { data: updatedBot, error } = await supabaseAdmin
      .from("bots")
      .update(updatePayload)
      .eq("bot_id", botId)
      .select()
      .single();

    if (error) throw error;

    // -----------------------------------------------------------------
    // LOGIC: ถ้า Admin เป็นคนแก้ ให้ "อนุมัติ" คำร้องที่ค้างอยู่ทันที
    // -----------------------------------------------------------------
    if (isAdmin) {
      // อนุมัติ request ที่ค้างอยู่ (ถ้ามี)
      await supabaseAdmin
        .from("bot_requests")
        .update({
          status: "approved",
          admin_note: "Auto-approved by Admin update",
          updated_at: new Date().toISOString(),
        })
        .eq("bot_id", botId)
        .eq("status", "pending");

      // (Optional) ถ้า Admin กดปิด is_public/is_external อาจจะต้องไป cancel request หรือไม่ แล้วแต่ Logic
    }
    // -----------------------------------------------------------------

    // ✅ Return ข้อมูลล่าสุดกลับไป Frontend (Frontend จะได้เอา share_token ไปโชว์ได้เลย)
    return NextResponse.json(updatedBot);
  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
