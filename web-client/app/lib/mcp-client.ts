import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"; // 1. เปลี่ยน Import

// ตัวแปร Global สำหรับเก็บ Client ที่เชื่อมต่อแล้ว (Singleton)
let globalClient: Client | null = null;
let globalTransport: SSEClientTransport | null = null; // 2. แก้ Type ของ Transport

export async function getMcpClient() {
    // ถ้ามี Client อยู่แล้ว ให้ใช้ตัวเดิม (Singleton Pattern)
    if (globalClient && globalTransport) {
        // (Optional) อาจจะเพิ่มการเช็คสถานะ transport ว่ายัง connected อยู่ไหมถ้าจำเป็น
        return globalClient;
    }

    try {
        console.log("🔌 Connecting to MCP Server via SSE...");
        
        // 3. กำหนด URL ของ Server
        // แนะนำให้เพิ่มบรรทัดนี้ในไฟล์ .env: MCP_SERVER_URL=http://localhost:8000/sse
        // หรือถ้ายังไม่ได้ตั้ง ก็ใช้ Hardcode ไปก่อนได้ครับ
        const serverUrl = process.env.MCP_SERVER_URL || "http://localhost:8000/sse";

        // 4. สร้าง Transport แบบ SSE
        const transport = new SSEClientTransport(new URL(serverUrl));

        const client = new Client(
            { name: "nextjs-persistent-client", version: "1.0.0" },
            { capabilities: {} }
        );

        // เริ่มการเชื่อมต่อ
        await client.connect(transport);

        globalClient = client;
        globalTransport = transport;

        console.log("✅ MCP Connected via SSE Ready.");

        return client;
    } catch (error) {
        // ถ้า Connect พัง ให้เคลียร์ค่าทิ้ง ครั้งหน้าจะได้ลองใหม่
        console.error("❌ Connection failed:", error);
        globalClient = null;
        globalTransport = null;
        throw error;
    }
}