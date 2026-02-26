// app/api/status/route.ts
import { NextResponse } from "next/server";
import { getMcpClient } from "@/app/lib/mcp-client";

// บังคับให้ route นี้เป็น Dynamic ไม่ cache
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const rawFilename = searchParams.get('filename');
        const filename = rawFilename ? decodeURIComponent(rawFilename) : null;
        const botId = searchParams.get('botId') || "general";

        if (!filename || !botId) {
            return NextResponse.json({ status: "INVALID_PARAMS" });
        }

        const client = await getMcpClient();

        // เรียก Tool ตัวใหม่ที่เราเพิ่งแก้
        const result = await client.callTool({
            name: "check_file_status",
            arguments: { filename: filename, bot_id: botId }
        });

        // Python ส่งกลับมาเป็น string สั้นๆ เช่น "PROCESSING" หรือ "COMPLETED"
        const statusText = (result as any).content[0].text;

        console.log(`Checking Status -> Key: ${botId}:${filename} | Result: ${statusText}`);

        return NextResponse.json({ status: statusText });

    } catch (error) {
        console.error("Status check error:", error);
        return NextResponse.json({ status: "ERROR" });
    }
}