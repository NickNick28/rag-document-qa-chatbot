"use client";
import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { useSession } from "next-auth/react";

// ✅ Import ThinkingProcess Component
import ThinkingProcess, { StepItem } from "@/components/ThinkingProcess";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- Types ---
type Message = {
  role: string;
  content: string;
  timestamp: Date;
};

type BotSettings = {
  name: string;
  description: string;
  is_public: boolean;
  owner_id: string;
  is_external?: boolean;
  recommend_chat?: string[];
};

type ChatPageProps = {
  botId?: string;
  onUpdateBot?: (id: string, updates: Partial<BotSettings>) => void;
  initialQuestions?: string[] | string;
};

export default function ChatPage({
  botId = "default-bot",
  initialQuestions = [],
}: ChatPageProps) {
  // --- Chat State ---
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  // Loading States
  const [loading, setLoading] = useState(false); // รอ connection
  const [isStreaming, setIsStreaming] = useState(false); // ข้อความกำลังไหล

  // ✅ Thinking Process States (เปลี่ยนจาก processingStatus เดิม)
  const [stepsLog, setStepsLog] = useState<StepItem[]>([]);
  const [isThinkingFinished, setIsThinkingFinished] = useState(true);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Settings Modal State ---
  const [settings, setSettings] = useState<BotSettings>({
    name: "",
    description: "",
    is_public: false,
    owner_id: "",
    is_external: false,
    recommend_chat: [],
  });

  // --- Auto Scroll ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, isStreaming, stepsLog, isThinkingFinished]);

  // --- Fetch History ---
  useEffect(() => {
    const fetchHistory = async () => {
      if (!botId) return;
      setIsLoadingHistory(true);
      setMessages([]);
      try {
        const res = await fetch(`/api/chat/history?botId=${botId}`);
        if (res.ok) {
          const data = await res.json();
          const sortedData = (data.messages || []).sort((a: any, b: any) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            if (timeA === timeB) {
              return a.role === "user" ? -1 : 1;
            }
            return timeA - timeB;
          });

          const formattedMessages = sortedData.map((m: any) => ({
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt || m.created_at),
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [botId]);

  // 2. แปลงข้อมูลให้เป็น Array (เผื่อส่งมาเป็น string หรือ null)
  const recommendedList: string[] = Array.isArray(initialQuestions)
    ? initialQuestions
    : typeof initialQuestions === "string"
      ? (initialQuestions as string).split("\n").filter((q) => q.trim() !== "")
      : [];

  // --- Fetch Bot Settings ---
  const fetchBotSettings = async () => {
    try {
      const res = await fetch(`/api/bots/details?botId=${botId}`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          name: data.name || "My Bot",
          description: data.description || "",
          is_public: data.is_public || false,
          owner_id: data.owner_id || "",
          is_external: data.is_external || false,
          recommend_chat: data.recommend_chat || [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch bot settings", error);
    }
  };

  useEffect(() => {
    if (botId) fetchBotSettings();
  }, [botId]);

  // --- Format Time ---
  const formatTime = (date: Date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ========================================================================
  // ⚡️ MAIN SEND MESSAGE FUNCTION (UPDATED)
  // ========================================================================
  const sendMessage = async (msgText?: string) => {
    const textToSend = msgText || input;
    if (!textToSend.trim()) return;

    // 1. Add User Message
    const userMsg: Message = {
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // 2. Set Loading & Init Thinking
    setLoading(true);
    setIsThinkingFinished(false);

    setStepsLog([
      { id: "init", title: "รับข้อความ", status: "completed" },
      { id: "think", title: "กำลังประมวลผล...", status: "running" },
    ]);

    try {
      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, botId: botId }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        console.error("Error:", errData);
        throw new Error(errData.error || `Server Error (${res.status})`);
      }

      setLoading(false);
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

            // 🟢 Case 1: Status Update
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
            }
            // 🔵 Case 2: Text Content
            else if (data.type === "text") {
              if (!hasStartedText) {
                setIsThinkingFinished(true);
                setStepsLog((prev) =>
                  prev.map((s) => ({ ...s, status: "completed" })),
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
      setLoading(false);
      setIsStreaming(false);
      setIsThinkingFinished(true);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 relative overflow-hidden">
      {/* ================= MESSAGES AREA ================= */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar relative">
        {isLoadingHistory ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-xs">Loading conversation history...</p>
          </div>
        ) : (
          messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 opacity-80">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-4 rounded-full shadow-sm mb-2">
                  <Sparkles className="w-8 h-8 text-orange-400" />
                </div>
                <p className="text-sm font-medium">
                  เริ่มการสนทนา
                </p>
              </div>
              {recommendedList && recommendedList.length > 0 && (
                <div className="w-full max-w-md space-y-2 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <p className="text-xs text-center text-slate-400 mb-3">
                    หรือลองถามคำถามเหล่านี้
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {recommendedList.map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(question)}
                        className="cursor-pointer w-full text-left px-4 py-3 bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-600 hover:text-orange-700 rounded-xl text-sm transition-all shadow-sm hover:shadow-md flex items-center gap-3 group"
                      >
                        <MessageSquare
                          size={16}
                          className="text-slate-300 group-hover:text-orange-400 transition-colors"
                        />
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Message Loop */}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 sm:gap-4 ${
              m.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm border ${
                m.role === "user"
                  ? "bg-orange-500 border-orange-600 text-white"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] min-w-0 p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm flex flex-col ${
                m.role === "user"
                  ? "bg-orange-500 text-white rounded-tr-none"
                  : "bg-white border border-slate-200 text-slate-700 rounded-tl-none"
              }`}
            >
              {/* ✅ Thinking Process: อยู่ด้านบนข้อความ Assistant ล่าสุด */}
              {m.role === "assistant" &&
                i === messages.length - 1 &&
                stepsLog.length > 0 && (
                  <ThinkingProcess
                    steps={stepsLog}
                    isFinished={isThinkingFinished}
                  />
                )}

              <div
                className={`prose prose-sm w-full max-w-none overflow-hidden ${
                  m.role === "user"
                    ? "prose-invert text-white"
                    : "text-slate-700 prose-table:border-collapse prose-th:bg-slate-50 prose-th:text-slate-700 prose-td:border-slate-200"
                }`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]} // ✅ เปิดใช้ Table Support
                  components={{
                    // Custom Table Styling (Horizontal Scroll)
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
                    th: ({ node, ...props }) => (
                      <th
                        className={`px-3 py-2 text-left text-xs font-bold uppercase tracking-wider align-top min-w-[120px] ${
                          m.role === "user" ? "text-white" : "text-slate-600"
                        }`}
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className={`px-3 py-2 text-left text-sm border-t align-top ${m.role === "user" ? "border-orange-400/30" : "border-slate-100"}`}
                        {...props}
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
                    // ลบ margin ของ p ตัวสุดท้ายออกเพื่อไม่ให้กล่องข้อความยาวเกินจำเป็น
                    p: ({ node, ...props }) => (
                      <p className="mb-2 last:mb-0" {...props} />
                    ),
                    pre: ({ node, ...props }) => (
                      <div className="not-prose relative">
                        <pre
                          className="overflow-x-auto rounded-lg p-3 bg-slate-900 text-slate-100 text-xs"
                          {...props}
                        />
                      </div>
                    ),
                  }}
                >
                  {m.content}
                </ReactMarkdown>
              </div>

              {isStreaming &&
                i === messages.length - 1 &&
                m.role === "assistant" && (
                  <span className="inline-block w-1.5 h-3 ml-1 bg-orange-400 animate-pulse align-middle"></span>
                )}

              <span
                className={`text-[10px] mt-1 self-end font-light select-none ${
                  m.role === "user" ? "text-orange-100/80" : "text-slate-400"
                }`}
              >
                {formatTime(m.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Case: First Loading (แสดง Thinking Process เดี่ยวๆ ก่อนกล่องข้อความจะมา) */}
        {loading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center mt-1">
                <Bot size={16} />
              </div>
              <div className="max-w-[80%] w-full">
                <ThinkingProcess steps={stepsLog} isFinished={false} />
              </div>
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* ================= INPUT AREA ================= */}
      <div className="p-4 bg-white border-t border-slate-200 z-10">
        <div className="max-w-4xl mx-auto w-full">
          <div className="flex gap-2 items-end bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100/50 transition-all shadow-sm">
            <input
              className="flex-1 bg-transparent border-none p-2 focus:ring-0 text-slate-700 placeholder:text-slate-400 min-h-[44px] max-h-32 resize-none text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`พิมพ์คำถามหรือพูดคุยที่นี่...`}
              disabled={loading || isStreaming}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && sendMessage()
              }
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || isStreaming || !input.trim()}
              className="cursor-pointer p-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:hover:bg-orange-600 transition-all shadow-sm transform active:scale-95"
            >
              {loading || isStreaming ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
