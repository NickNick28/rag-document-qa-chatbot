// web-client/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  createToolCallingAgent,
  AgentExecutor,
} from "@langchain/classic/agents";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { getMcpClient } from "@/app/lib/mcp-client";
import { auth } from "@/app/lib/auth";
import { createClient } from "@supabase/supabase-js";
import {
  checkTokenLimit,
  incrementTokenUsage,
  estimateTokens,
} from "@/app/lib/token-service";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { LLMResult } from "@langchain/core/outputs";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// =========================================================
// 1. ดึงประวัติแชท (จำกัด 6 messages ล่าสุดเพื่อประหยัด token)
// =========================================================
async function getChatHistory(sessionId: string, maxMessages: number = 6) {
  const { data } = await supabaseAdmin
    .from("chat_history")
    .select("role, content, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false }) // ✅ เรียงใหม่→เก่าก่อน
    .limit(maxMessages);                        // ✅ เอาแค่ 6 ล่าสุด

  if (!data || data.length === 0) return [];

  // reverse กลับให้เป็นลำดับเก่า→ใหม่
  return data.reverse().map((msg) =>
    msg.role === "user"
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content),
  );
}

// =========================================================
// 2. บันทึกประวัติ
// =========================================================
async function saveChatHistory(
  sessionId: string,
  userMsg: string,
  aiMsg: string,
  botId: string,
) {
  const now = new Date();
  const userTime = now.toISOString();
  const aiTime = new Date(now.getTime() + 500).toISOString();

  await supabaseAdmin.from("chat_history").insert([
    {
      session_id: sessionId,
      role: "user",
      content: userMsg,
      created_at: userTime,
      bot_id: botId,
    },
    {
      session_id: sessionId,
      role: "assistant",
      content: aiMsg,
      created_at: aiTime,
      bot_id: botId,
    },
  ]);
}

// =========================================================
// 3. Token Tracker
// =========================================================
class TokenUsageTracker extends BaseCallbackHandler {
  name = "TokenUsageTracker";
  totalTokens = 0;
  inputTokens = 0;
  outputTokens = 0;

  handleLLMEnd(output: LLMResult) {
    const generations = output.generations.flat();
    let foundInMessage = false;

    for (const gen of generations) {
      const usage = (gen as any).message?.usage_metadata;
      if (usage) {
        this.totalTokens += usage.total_tokens || 0;
        this.inputTokens += usage.input_tokens || 0;
        this.outputTokens += usage.output_tokens || 0;
        foundInMessage = true;
      }
    }

    if (!foundInMessage && output.llmOutput?.tokenUsage) {
      const usage = output.llmOutput.tokenUsage;
      this.totalTokens += usage.totalTokens || 0;
      this.inputTokens += usage.promptTokens || 0;
      this.outputTokens += usage.completionTokens || 0;
    }
  }
}

// =========================================================
// MAIN POST HANDLER
// =========================================================
export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json();
    const { message, botId, guestSessionId } = body;

    let userEmail = "";
    let isAuthorized = false;
    let userRole = "user";
    let userCustomInstruction: string | null = null;
    let botTemperature = 0.0;

    // --- 1. CHECK PERMISSION ---
    if (session?.user?.email?.endsWith("@nu.ac.th")) {
      userEmail = session.user.email;
      isAuthorized = true;
      userRole = (session.user as any).role || "user";
    } else if (guestSessionId) {
      const { data: bot } = await supabaseAdmin
        .from("bots")
        .select("is_external, system_instruction, temperature")
        .eq("bot_id", botId)
        .single();

      if (bot?.is_external) {
        userEmail = `guest_${guestSessionId}`;
        isAuthorized = true;
        userRole = "guest";
        userCustomInstruction = bot.system_instruction;
        if (bot.temperature !== null) botTemperature = bot.temperature;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized or Bot is private" },
        { status: 401 },
      );
    }

    // --- 2. CHECK TOKEN LIMIT ---
    try {
      const limitCheck = await checkTokenLimit(userEmail, userRole);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: `Token Limit Exceeded! Used ${limitCheck.used.toLocaleString()} / ${limitCheck.limit.toLocaleString()}`,
          },
          { status: 403 },
        );
      }
    } catch (error) {
      console.error("Token Check Error:", error);
    }

    // --- 3. OWNER CHECK ---
    const sessionId = `${userEmail}_${botId || "general"}`;

    if (botId && !guestSessionId) {
      const { data: botData } = await supabaseAdmin
        .from("bots")
        .select("owner_id, is_public, system_instruction, temperature")
        .eq("bot_id", botId)
        .single();

      if (botData) {
        const isOwner = botData.owner_id === userEmail;
        const isPublic = botData.is_public === true;

        if (!isOwner && !isPublic) {
          return NextResponse.json({ error: "Access Denied" }, { status: 403 });
        }

        userCustomInstruction = botData.system_instruction;
        if (botData.temperature !== null) botTemperature = botData.temperature;
      }
    }

    // --- 4. LOAD HISTORY (จำกัด 6 messages) ---
    const chatHistory = await getChatHistory(sessionId, 6);

    // --- 5. SETUP MCP & TOOLS ---
    const client = await getMcpClient();
    const toolsList = await client.listTools();
    const allowedToolNames = [
      "query_knowledge_base",
      "check_available_doc_years",
    ];
    const relevantMcpTools = toolsList.tools.filter((t) =>
      allowedToolNames.includes(t.name),
    );

    const langchainTools = relevantMcpTools.map((mcpTool) => {
      let toolSchema;

      if (mcpTool.name === "query_knowledge_base" || mcpTool.name === "check_available_doc_years") {
        toolSchema = z.object({
          query: z
            .string()
            .min(1)
            .describe("Search keywords extracted from user question — MUST NOT be empty."),
          bot_id: z
            .string()
            .describe(`Bot ID for this knowledge base. Default: "${botId}"`),
          year: z
            .number()
            .int()
            .optional()
            .describe(
              "Filter by document year in พ.ศ. ONLY (e.g. 2568, 2567). NEVER use ค.ศ. year like 2025."
            ),
        });
      } else {
        toolSchema = z.object({
          query: z.string().optional(),
          bot_id: z.string().optional(),
        });
      }

      return new DynamicStructuredTool({
        name: mcpTool.name,
        description: mcpTool.description || "MCP Tool",
        schema: toolSchema,
        func: async (args: any) => {
          console.log(`🤖 AI calling '${mcpTool.name}' with args:`, args);

          const finalArgs = { ...args };

          // ✅ Auto-inject bot_id เสมอ (ไม่ว่า AI จะส่งมาหรือไม่)
          if (botId) finalArgs.bot_id = botId;

          // ✅ Guard: ถ้า query_knowledge_base แต่ไม่มี query → return error ทันที
          if (
            mcpTool.name === "query_knowledge_base" &&
            (!finalArgs.query || !finalArgs.query.trim())
          ) {
            return JSON.stringify({
              error: "query is required and must not be empty.",
              hint: "Please retry with a meaningful query extracted from the user question.",
            });
          }

          const res = await client.callTool({
            name: mcpTool.name,
            arguments: finalArgs,
          });

          const content = (res.content as any[]) || [];
          return content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
        },
      });
    });

    // --- 6. LLM + AGENT ---
    const llm_model = new ChatGoogleGenerativeAI({
      model: "gemini-3-flash-preview",
      temperature: botTemperature,
      apiKey: process.env.GOOGLE_API_KEY,
      streaming: true,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    // =========================================================
    // SYSTEM PROMPT
    // =========================================================
    const coreSystemLogic = `
=== CORE INSTRUCTIONS ===
- ตอบคำถามโดยอ้างอิงข้อมูลจาก Knowledge Base ของ Bot ID: ${botId || "N/A"}
- ห้ามกุเรื่อง (No Hallucination)

=== YEAR HANDLING (สำคัญมาก) ===
- เอกสารในระบบใช้ปี พ.ศ. เสมอ เช่น 2568, 2567, 2566
- ❌ ห้ามแปลงปีเป็น ค.ศ. เด็ดขาด (ห้ามใช้ 2025, 2024, 2023)
- parameter 'year' ต้องเป็น พ.ศ. เท่านั้น เช่น 2568

=== RETRIEVAL STRATEGY ===
ทำตามขั้นตอนนี้เท่านั้น:

1. ถ้าคำถามไม่ระบุปี:
   → เรียก check_available_doc_years ครั้งเดียว
   → ถ้ามีแค่ปีเดียว: เรียก query_knowledge_base พร้อม year นั้นได้เลย
   → ถ้ามีหลายปี: ถามผู้ใช้ว่าต้องการปีไหน แล้วหยุดรอ

2. ถ้าคำถามระบุปีหรือผู้ใช้เลือกปีแล้ว:
   → เรียก query_knowledge_base พร้อม year (พ.ศ.) ทันที

3. ถ้าเป็นคำถามทั่วไปไม่เกี่ยวกับเวลา:
   → เรียก query_knowledge_base โดยไม่ต้องใส่ year

❌ ห้ามเรียก tool รวมกันเกิน 3 ครั้งต่อคำถาม
❌ ห้ามเรียก query_knowledge_base ด้วย query ว่าง
❌ ห้ามเรียก check_available_doc_years ซ้ำ

=== RESPONSE FORMATTING ===
- ใช้ Markdown เสมอ
- ข้อมูลที่มีโครงสร้าง → แสดงเป็น Markdown Table
- ระบุแหล่งที่มา (ชื่อไฟล์ / หน้า) เมื่อมีข้อมูลจาก context
`;

    const defaultUserPrompt =
      "คุณคือผู้ช่วย AI ที่มีความรู้ความสามารถ ตอบคำถามอย่างสุภาพและช่วยเหลือผู้ใช้งานอย่างเต็มที่";
    const userPersona = userCustomInstruction || defaultUserPrompt;
    const finalSystemPrompt = `${coreSystemLogic}\n\n=== USER CUSTOM INSTRUCTIONS ===\n${userPersona}`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", finalSystemPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"],
    ]);

    const agent = createToolCallingAgent({
      llm: llm_model as any,
      tools: langchainTools,
      prompt,
    });

    const executor = new AgentExecutor({
      agent,
      tools: langchainTools,
      verbose: false,
      maxIterations: 5, // ✅ เพิ่มจาก 4 → 5 เพื่อมี buffer
      // ❌ ลบ earlyStoppingMethod ออกแล้ว
    });

    const tokenTracker = new TokenUsageTracker();
    const encoder = new TextEncoder();

    // --- 7. STREAMING RESPONSE ---
    const customStream = new ReadableStream({
      async start(controller) {
        let fullResponseText = "";

        try {
          const eventStream = await executor.streamEvents(
            { input: message, chat_history: chatHistory },
            { version: "v2", callbacks: [tokenTracker] },
          );

          for await (const event of eventStream) {
            if (event.event === "on_tool_start") {
              const toolName = event.name;
              let statusText = "กำลังประมวลผล...";

              if (toolName === "query_knowledge_base") {
                const args = event.data?.input;
                if (args?.year) {
                  statusText = `กำลังค้นหาข้อมูลเอกสารปี ${args.year}...`;
                } else {
                  statusText = "กำลังค้นหาข้อมูลในเอกสาร...";
                }
              } else if (toolName === "check_available_doc_years") {
                statusText = "กำลังตรวจสอบปีของเอกสารที่มี...";
              }

              const payload =
                JSON.stringify({ type: "status", content: statusText }) + "\n";
              controller.enqueue(encoder.encode(payload));
            } else if (event.event === "on_tool_end") {
              const payload =
                JSON.stringify({
                  type: "status",
                  content: "อ่านข้อมูลเสร็จสิ้น กำลังเรียบเรียงคำตอบ...",
                }) + "\n";
              controller.enqueue(encoder.encode(payload));
            } else if (
              event.event === "on_chat_model_stream" &&
              event.data.chunk.content
            ) {
              const chunkText = event.data.chunk.content;
              fullResponseText += chunkText;
              const payload =
                JSON.stringify({ type: "text", content: chunkText }) + "\n";
              controller.enqueue(encoder.encode(payload));
            }
          }

          if (fullResponseText) {
            await saveChatHistory(
              sessionId,
              message,
              fullResponseText,
              botId || "general",
            );

            const realTotalTokens =
              tokenTracker.totalTokens > 0
                ? tokenTracker.totalTokens
                : estimateTokens(message) + estimateTokens(fullResponseText);

            console.log(
              `📊 Token Usage: ${realTotalTokens} (In: ${tokenTracker.inputTokens}, Out: ${tokenTracker.outputTokens})`,
            );

            await incrementTokenUsage(userEmail, realTotalTokens);
          }

          controller.close();
        } catch (e: any) {
          console.error("Streaming Error:", e);
          controller.error(e);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong in Chat API" },
      { status: 500 },
    );
  }
}