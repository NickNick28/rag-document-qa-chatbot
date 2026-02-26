"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  AlertTriangle,
  LogIn,
  Ghost,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";

// ✅ Import Component
import ThinkingProcess, { StepItem } from "@/components/ThinkingProcess";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- Types ---
type Message = { role: string; content: string; timestamp?: Date };

// --- Helper: Guest Session ---
const getGuestSessionId = (token: string) => {
  if (typeof window === "undefined") return "";
  const key = `guest_session_${token}`;
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = `guest_${Math.random().toString(36).substring(2)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
};

export default function ShareChatPage() {
  const { data: session } = useSession();
  const params = useParams();

  // ✅ 1. รับค่า Token จาก URL
  const shareToken = (params.token as string) || (params.botId as string);

  // --- States ---
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [botInfo, setBotInfo] = useState<any>(null); // เก็บข้อมูลบอท + Real Bot ID
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  // Loading States
  const [loading, setLoading] = useState(true); // โหลดข้อมูลบอท
  const [chatLoading, setChatLoading] = useState(false); // รอ AI ตอบ
  const [isStreaming, setIsStreaming] = useState(false); // กำลังพิมพ์

  // Thinking Process
  const [stepsLog, setStepsLog] = useState<StepItem[]>([]);
  const [isThinkingFinished, setIsThinkingFinished] = useState(true);

  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const guestId = useRef("");

  // --- 2. Fetch Bot Info ด้วย Token ---
  useEffect(() => {
    const fetchInfo = async () => {
      if (!shareToken) return;

      try {
        setLoading(true);
        // เรียก API ค้นหาบอทด้วย Token
        const res = await fetch(`/api/bots/public-info?token=${shareToken}`);

        if (!res.ok) {
          if (res.status === 404)
            throw new Error("ลิงก์นี้ไม่ถูกต้อง ถูกยกเลิก หรือหมดอายุแล้ว");
          throw new Error("ไม่สามารถเข้าถึงบอทได้");
        }

        const data = await res.json();
        setBotInfo(data); // data ต้องมี field { bot_id, name, ... }

        // Init Guest Session
        guestId.current = getGuestSessionId(shareToken);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [shareToken]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading, isStreaming, stepsLog, isThinkingFinished]);

  // ========================================================================
  // ⚡️ SEND MESSAGE FUNCTION
  // ========================================================================
  const sendMessage = async (msgText?: string) => {
    const textToSend = msgText || input;
    if (!textToSend.trim()) return;

    // 🛑 ต้องมี Bot ID จริงก่อนส่ง
    if (!botInfo?.bot_id && !botInfo?.id) {
      alert("ไม่พบข้อมูลบอท (Connection Error)");
      return;
    }

    const userMsg: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    setChatLoading(true);
    setIsThinkingFinished(false);

    setStepsLog([
      { id: "init", title: "รับข้อความ", status: "completed" },
      { id: "think", title: "กำลังประมวลผล...", status: "running" },
    ]);

    try {
      const realBotId = botInfo.bot_id || botInfo.id;

      const payload: any = {
        message: userMsg.content,
        botId: realBotId, // ✅ ส่ง ID จริงไปให้ Backend
        shareToken: shareToken, // ส่ง Token ไปด้วยเผื่อ validate
      };

      if (!session) {
        payload.guestSessionId = guestId.current;
      }

      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403) {
          throw new Error("โควต้า Guest หมดแล้ว กรุณาล็อกอินเพื่อใช้งานต่อ");
        }
        throw new Error(errData.error || `Server Error (${res.status})`);
      }

      if (!res.body) throw new Error("Response body is empty");

      setChatLoading(false);
      setIsStreaming(true);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", timestamp: new Date() },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasStartedText = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);

            if (data.type === "status") {
              setStepsLog((prev) => {
                const newLog = [...prev];
                if (newLog.length > 0)
                  newLog[newLog.length - 1].status = "completed";
                newLog.push({
                  id: `step-${Date.now()}`,
                  title: data.content,
                  status: "running",
                });
                return newLog;
              });
            } else if (data.type === "text") {
              if (!hasStartedText) {
                setIsThinkingFinished(true);
                setStepsLog((prev) =>
                  prev.map((s) => ({ ...s, status: "completed" }))
                );
                hasStartedText = true;
              }

              setMessages((prev) => {
                const newArr = [...prev];
                const lastIndex = newArr.length - 1;
                const lastMsg = newArr[lastIndex];

                if (lastMsg && lastMsg.role === "assistant") {
                  newArr[lastIndex] = {
                    ...lastMsg,
                    content: lastMsg.content + data.content,
                  };
                  return newArr;
                } else {
                  return [
                    ...prev,
                    {
                      role: "assistant",
                      content: data.content,
                      timestamp: new Date(),
                    },
                  ];
                }
              });
            }
          } catch (e) {
            console.error("Error parsing JSON chunk", e);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Error: ${err.message}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setChatLoading(false);
      setIsStreaming(false);
      setIsThinkingFinished(true);
    }
  };

  // --- Helper Format Time ---
  const formatTime = (date?: Date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==========================================
  // RENDER UI
  // ==========================================

  // 1. Loading
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
      </div>
    );
  }

  // 2. Error (Invalid Link)
  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 gap-4 p-4 text-center">
        <div className="bg-red-50 p-4 rounded-full">
          <AlertTriangle size={48} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-700">ไม่สามารถเข้าถึงได้</h1>
        <p className="text-sm max-w-md">{error}</p>
        <p className="text-xs text-slate-400 mt-2">
          ลิงก์อาจถูกรีเซ็ต ปิดใช้งาน หรือคุณไม่มีสิทธิ์เข้าถึง
        </p>
      </div>
    );
  }

  // 3. Landing Page (Guest Login)
  if (!session && !isGuestMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto text-orange-600 shadow-sm">
              <Bot size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {botInfo?.name || "AI Assistant"}
              </h1>
              <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                {botInfo?.description ||
                  "ยินดีต้อนรับสู่ AI Chatbot ประจำองค์กร"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() =>
                signIn("google", { callbackUrl: window.location.href })
              }
              className="cursor-pointer w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
            >
              <LogIn size={20} />
              Login with NU Account
            </button>
            <p className="text-xs text-slate-400">
              สำหรับบุคลากรและนิสิตของมหาวิทยาลัยนเรศวร
            </p>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">or</span>
              </div>
            </div>

            <button
              onClick={() => setIsGuestMode(true)}
              className="cursor-pointer w-full py-3.5 px-4 bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
            >
              <Ghost size={20} />
              Continue as Guest
            </button>
          </div>
        </div>
        <div className="mt-8 text-xs text-slate-400 flex items-center gap-1">
          <Sparkles size={12} /> Powered by NU AI Platform
        </div>
      </div>
    );
  }

  // 4. MAIN CHAT UI
  return (
    <div className="flex flex-col h-screen bg-slate-50 max-w-4xl mx-auto shadow-2xl overflow-hidden border-x border-slate-200 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 border border-orange-200 shadow-sm">
            <Bot size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-800 text-lg leading-tight truncate">
              {botInfo?.name || "AI Assistant"}
            </h1>
            <div className="flex items-center gap-2">
              {session ? (
                <p className="text-xs text-green-600 flex items-center gap-1 font-medium truncate">
                  <User size={10} /> {session.user?.email?.split("@")[0]} (Logged In)
                </p>
              ) : (
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Ghost size={10} /> Guest Mode
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Navigation Button */}
        {session ? (
          <button
            onClick={() => (window.location.href = "/main")}
            className="cursor-pointer text-xs text-slate-400 hover:text-orange-600 flex items-center gap-1 shrink-0"
          >
            Go to Website <ArrowRight size={12} />
          </button>
        ) : (
          <button
            onClick={() => setIsGuestMode(false)}
            className="cursor-pointer text-xs text-slate-400 hover:text-orange-600 shrink-0"
          >
            Back
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-50/50">
        {/* Empty State */}
        {messages.length === 0 && !chatLoading && stepsLog.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-90 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center gap-3 text-slate-400 mb-6">
              <Bot size={48} className="text-orange-300" />
              <p>สวัสดีครับ มีอะไรให้ช่วยไหมครับ?</p>
            </div>
            {/* Recommend Buttons */}
            {botInfo?.recommend_chat && botInfo.recommend_chat.length > 0 && (
              <div className="w-full max-w-sm space-y-2 px-4">
                <div className="grid grid-cols-1 gap-2">
                  {botInfo.recommend_chat.map(
                    (question: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(question)}
                        className="cursor-pointer w-full text-left px-4 py-3 bg-white border border-slate-200 hover:border-orange-300 text-slate-600 rounded-xl text-sm transition-all shadow-sm hover:shadow-md flex items-center gap-3"
                      >
                        <MessageSquare size={16} className="text-slate-300" />
                        {question}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Loop */}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 sm:gap-4 ${
              m.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border ${
                m.role === "user"
                  ? "bg-orange-500 border-orange-600 text-white"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>

            {/* Bubble */}
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] min-w-0 p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm flex flex-col ${
                m.role === "user"
                  ? "bg-orange-500 text-white rounded-tr-none"
                  : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
              }`}
            >
              {/* Thinking Process */}
              {m.role === "assistant" &&
                i === messages.length - 1 &&
                stepsLog.length > 0 && (
                  <ThinkingProcess
                    steps={stepsLog}
                    isFinished={isThinkingFinished}
                  />
                )}

              {/* ✅ Markdown Content (Updated for Tables) */}
              <div
                className={`prose prose-sm w-full max-w-none overflow-hidden ${
                  m.role === "user"
                    ? "prose-invert text-white"
                    : "text-slate-700 prose-table:border-collapse prose-th:bg-slate-50 prose-th:text-slate-700 prose-td:border-slate-200"
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Table wrapper for horizontal scroll
                    table: ({ node, ...props }) => (
                      <div className="block w-full overflow-x-auto my-2 rounded-lg border border-slate-200/50 bg-white/50">
                        <table
                          className="min-w-full divide-y divide-slate-200"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead
                        className={
                          m.role === "user" ? "bg-orange-600/20" : "bg-slate-50"
                        }
                        {...props}
                      />
                    ),
                    // แก้ไข TH ให้ตัดคำและชิดซ้าย
                    th: ({ node, ...props }) => (
                      <th
                        className={`px-3 py-2 !text-left text-xs font-bold uppercase tracking-wider align-top min-w-[120px] break-words ${
                          m.role === "user" ? "text-white" : "text-slate-600"
                        }`}
                        {...props}
                        style={{ textAlign: "left" }}
                      />
                    ),
                    // แก้ไข TD ให้ตัดคำและชิดซ้าย
                    td: ({ node, ...props }) => (
                      <td
                        className={`px-3 py-2 text-sm border-t align-top !text-left break-words ${
                          m.role === "user"
                            ? "border-orange-400/30"
                            : "border-slate-100"
                        }`}
                        {...props}
                        style={{ textAlign: "left" }}
                      />
                    ),
                    a: ({ node, ...props }) => (
                      <a
                        className="underline font-medium hover:opacity-80"
                        target="_blank"
                        rel="noopener noreferrer"
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="mb-2 last:mb-0" {...props} />
                    ),
                    pre: ({ node, ...props }) => (
                      <div className="not-prose relative my-2">
                        <pre
                          className="overflow-x-auto rounded-lg p-3 bg-slate-900 text-slate-100 text-xs custom-scrollbar"
                          {...props}
                        />
                      </div>
                    ),
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>

              {/* Cursor */}
              {isStreaming &&
                i === messages.length - 1 &&
                m.role === "assistant" && (
                  <span className="inline-block w-1.5 h-3 ml-1 bg-orange-400 animate-pulse align-middle"></span>
                )}

              {/* Timestamp */}
              <span
                className={`text-[10px] mt-1 self-end font-light select-none opacity-70 ${
                  m.role === "user" ? "text-white" : "text-slate-400"
                }`}
              >
                {formatTime(m.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {chatLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="max-w-[80%] w-full">
                <ThinkingProcess steps={stepsLog} isFinished={false} />
              </div>
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <div className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-orange-100/50 transition-all">
          <input
            className="flex-1 bg-transparent border-none p-2 focus:ring-0 text-slate-700 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
            disabled={chatLoading || isStreaming}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && sendMessage()
            }
          />
          <button
            onClick={() => sendMessage()}
            disabled={chatLoading || isStreaming || !input.trim()}
            className="cursor-pointer p-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-all disabled:opacity-50"
          >
            {chatLoading || isStreaming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}