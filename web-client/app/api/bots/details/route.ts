// app/api/bots/details/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const botId = searchParams.get("botId");

  if (!botId) return NextResponse.json({ error: "No Bot ID" }, { status: 400 });

  const { data, error } = await supabase
    .from("bots")
    .select("name, description, is_public, owner_id, is_external, recommend_chat")
    .eq("bot_id", botId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}