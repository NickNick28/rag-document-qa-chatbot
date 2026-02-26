"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Bot,
  Globe,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  FileText,
  Eye,
  ChevronLeft,
  Calendar,
  File,
  Search,
  ArrowUpDown,
  Filter,
  X,
  Info, // ✅ เพิ่ม Icon Info
  Thermometer, // ✅ เพิ่ม Icon Thermometer
  List, // ✅ เพิ่ม Icon List
  Brain, // ✅ เพิ่ม Icon Brain
} from "lucide-react";

// --- Interfaces ---

interface RequestData {
  id: string;
  bot_id: string;
  requester_email: string;
  request_type: "publish" | "share" | "both";
  status: string;
  created_at: string;
  bots: {
    name: string;
    description: string;
    owner_id: string;
  };
}

interface DocumentMeta {
  id: string;
  filename: string;
  created_at: string;
  bot_id: string;
}

interface DocumentChunk {
  id: string;
  content: string;
  chunk_index: number;
}

// ✅ Interface สำหรับรายละเอียดบอท (Full Detail)
interface BotDetail {
  bot_id: string;
  name: string;
  description: string;
  system_instruction: string;
  temperature: number;
  recommend_chat: string[];
  is_public: boolean;
  is_external: boolean;
  owner_id: string;
  created_at: string;
}

export default function ApprovalPage() {
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filterType, setFilterType] = useState<
    "all" | "publish" | "share" | "both"
  >("all");

  // Modal State (Reject)
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [rejectNote, setRejectNote] = useState("");

  // Modal State (Documents Viewer)
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Modal State (Bot Details) ✅ เพิ่มใหม่
  const [botDetailModalOpen, setBotDetailModalOpen] = useState(false);
  const [loadingBotDetails, setLoadingBotDetails] = useState(false);
  const [selectedBotDetail, setSelectedBotDetail] = useState<BotDetail | null>(
    null
  );

  // Data State
  const [docsList, setDocsList] = useState<DocumentMeta[]>([]);
  const [currentChunks, setCurrentChunks] = useState<DocumentChunk[]>([]);

  // Header Info State
  const [selectedBotName, setSelectedBotName] = useState("");
  const [selectedDocName, setSelectedDocName] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (
    id: string,
    action: "approved" | "rejected",
    note?: string
  ) => {
    if (
      !confirm(action === "approved" ? "ยืนยันการอนุมัติ?" : "ยืนยันการปฏิเสธ?")
    )
      return;

    setProcessingId(id);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          status: action,
          adminNote: note,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setRequests((prev) => prev.filter((r) => r.id !== id));
      if (action === "rejected") {
        setRejectModalOpen(false);
        setRejectNote("");
      }
    } catch (error) {
      alert("เกิดข้อผิดพลาด");
    } finally {
      setProcessingId(null);
    }
  };

  // --- Handlers ---

  // 1. View Docs
  const handleOpenDocs = async (botId: string, botName: string) => {
    setSelectedBotName(botName);
    setDocModalOpen(true);
    setViewMode("list");
    setLoadingDocs(true);
    setDocsList([]);

    try {
      const res = await fetch(`/api/admin/bots/${botId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocsList(data || []);
      } else {
        console.error("Failed to fetch docs list");
      }
    } catch (error) {
      console.error("Error fetching docs", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleViewChunkContent = async (docId: string, filename: string) => {
    setSelectedDocName(filename);
    setViewMode("detail");
    setLoadingDocs(true);
    setCurrentChunks([]);

    try {
      const res = await fetch(`/api/admin/documents/${docId}/chunks`);
      if (res.ok) {
        const data = await res.json();
        setCurrentChunks(data || []);
      } else {
        console.error("Failed to fetch chunks");
      }
    } catch (error) {
      console.error("Error fetching chunks", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setCurrentChunks([]);
    setSelectedDocName("");
  };

  // 2. View Bot Details ✅ (ฟังก์ชันใหม่)
  const handleViewBotDetails = async (botId: string) => {
    setBotDetailModalOpen(true);
    setLoadingBotDetails(true);
    setSelectedBotDetail(null);

    try {
      // เรียก API ที่เราเพิ่งสร้าง
      const res = await fetch(`/api/admin/bots/${botId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBotDetail(data);
      } else {
        console.error("Failed to fetch bot details");
      }
    } catch (error) {
      console.error("Error fetching bot details", error);
    } finally {
      setLoadingBotDetails(false);
    }
  };

  const renderMinimalBadge = (type: string) => {
    switch (type) {
      case "publish":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <Globe size={12} /> Public
          </span>
        );
      case "share":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100">
            <LinkIcon size={12} /> Share Link
          </span>
        );
      case "both":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
            <Globe size={12} /> + <LinkIcon size={12} /> Both
          </span>
        );
      default:
        return <span className="text-slate-400">-</span>;
    }
  };

  const filteredRequests = requests
    .filter((req) => {
      const query = searchQuery.toLowerCase();
      const botName = (req.bots?.name || "").toLowerCase();
      const userEmail = (req.requester_email || "").toLowerCase();
      const matchesSearch =
        botName.includes(query) || userEmail.includes(query);

      const matchesType =
        filterType === "all" || req.request_type === filterType;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="p-6 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="text-orange-600" /> Requests
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            รายการคำร้องขอที่รอการอนุมัติ ({requests.length})
          </p>
        </div>

        {/* UI Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Search Bar + Clear Button */}
          <div className="relative flex-1 sm:w-56">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่อบอท หรือ User..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Type Dropdown */}
          <div className="relative">
            <Filter
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full sm:w-auto pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none cursor-pointer text-slate-600"
            >
              <option value="all">ทุกประเภท</option>
              <option value="publish">Public (Explore)</option>
              <option value="share">Share Link</option>
              <option value="both">Both</option>
            </select>
          </div>

          {/* Sort Select */}
          <div className="relative">
            <ArrowUpDown
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
              className="w-full sm:w-auto pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 appearance-none cursor-pointer text-slate-600"
            >
              <option value="desc">ล่าสุดไปเก่าสุด</option>
              <option value="asc">เก่าสุดไปล่าสุด</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
        {loading ? (
          <div className="p-12 flex justify-center text-slate-400 gap-2">
            <Loader2 className="animate-spin" /> Loading...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
              {requests.length === 0 ? (
                <CheckCircle size={24} className="opacity-20" />
              ) : (
                <Search size={24} className="opacity-20" />
              )}
            </div>
            <p className="text-sm">
              {requests.length === 0
                ? "ไม่มีคำร้องขอที่รอตรวจสอบ"
                : "ไม่พบข้อมูลที่ค้นหา"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                  <th className="px-6 py-4 w-40 whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 min-w-[300px]">Bot Details</th>
                  <th className="px-6 py-4 w-40 whitespace-nowrap">
                    Request Type
                  </th>
                  <th className="px-6 py-4 w-48 text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Date */}
                    <td className="px-6 py-4 align-top whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Clock size={12} />
                        {new Date(req.created_at).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[10px] text-slate-400 pl-5 mt-0.5">
                        {new Date(req.created_at).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Bot Info */}
                    <td className="px-6 py-4 align-top">
                      <div className="flex gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0 border border-orange-100">
                          <Bot size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 text-sm group-hover:text-orange-700 transition-colors truncate">
                            {req.bots?.name || "Unknown"}
                          </div>
                          <div className="text-xs text-slate-500 line-clamp-1 mt-0.5 max-w-2xl">
                            {req.bots?.description || "No description"}
                          </div>
                          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                            <User size={10} />
                            {req.requester_email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 align-top pt-5 whitespace-nowrap">
                      {renderMinimalBadge(req.request_type)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 pt-1">
                        {/* ✅ ปุ่ม View Details (Info) */}
                        <button
                          onClick={() => handleViewBotDetails(req.bot_id)}
                          disabled={!!processingId}
                          title="View Bot Details"
                          className="cursor-pointer p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 border border-slate-200 transition-all disabled:opacity-50"
                        >
                          <Info size={16} />
                        </button>

                        {/* View Docs */}
                        <button
                          onClick={() =>
                            handleOpenDocs(req.bot_id, req.bots?.name)
                          }
                          disabled={!!processingId}
                          title="View Documents"
                          className="cursor-pointer p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 hover:border-blue-600 transition-all disabled:opacity-50"
                        >
                          <FileText size={16} />
                        </button>

                        {/* Approve */}
                        <button
                          onClick={() => handleProcess(req.id, "approved")}
                          disabled={!!processingId}
                          title="Approve"
                          className="cursor-pointer p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-600 hover:text-white border border-green-200 hover:border-green-600 transition-all disabled:opacity-50"
                        >
                          {processingId === req.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <CheckCircle size={16} />
                          )}
                        </button>

                        {/* Reject */}
                        <button
                          onClick={() => {
                            setSelectedRequestId(req.id);
                            setRejectModalOpen(true);
                          }}
                          disabled={!!processingId}
                          title="Reject"
                          className="cursor-pointer p-2 rounded-lg bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200 transition-all disabled:opacity-50"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================== */}
      {/* ✅ BOT DETAIL MODAL (แสดงรายละเอียดบอท) */}
      {/* =========================================== */}
      {botDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {loadingBotDetails ? "Loading..." : selectedBotDetail?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bot ID: {selectedBotDetail?.bot_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBotDetailModalOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
              {loadingBotDetails ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <Loader2 size={32} className="animate-spin text-orange-500" />
                  <p>กำลังโหลดข้อมูลบอท...</p>
                </div>
              ) : selectedBotDetail ? (
                <>
                  {/* Section 1: General Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                        Description
                      </h4>
                      <p className="text-sm text-slate-700">
                        {selectedBotDetail.description || "-"}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <Thermometer size={14} /> Creativity (Temperature)
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{
                              width: `${
                                (selectedBotDetail.temperature || 0.5) * 100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700">
                          {selectedBotDetail.temperature}
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 2: System Instruction */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Brain size={16} className="text-blue-500" />
                      System Instructions (Prompt)
                    </h4>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar border border-slate-700 shadow-inner">
                      {selectedBotDetail.system_instruction ||
                        "No system instructions defined."}
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 3: Recommended Chats */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <List size={16} className="text-green-500" />
                      Recommended Questions
                    </h4>
                    {selectedBotDetail.recommend_chat &&
                    Array.isArray(selectedBotDetail.recommend_chat) &&
                    selectedBotDetail.recommend_chat.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {selectedBotDetail.recommend_chat.map((chat, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600"
                          >
                            {chat}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        No recommended questions.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center text-red-400">
                  ไม่สามารถโหลดข้อมูลได้
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <button
                onClick={() => setBotDetailModalOpen(false)}
                className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Modal (Code เดิม) */}
      {docModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                {viewMode === "detail" && (
                  <button
                    onClick={handleBackToList}
                    className="cursor-pointer p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}

                <div>
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    {viewMode === "list" ? (
                      <>
                        <FileText size={20} className="text-blue-600" />
                        Knowledge Base
                      </>
                    ) : (
                      <>
                        <File size={20} className="text-orange-600" />
                        {selectedDocName}
                      </>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {viewMode === "list" ? (
                      <span>
                        เอกสารของบอท:{" "}
                        <span className="font-semibold">{selectedBotName}</span>
                      </span>
                    ) : (
                      <span>กำลังดูเนื้อหาจากเอกสาร</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDocModalOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 custom-scrollbar relative">
              {loadingDocs && (
                <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                  <p>
                    {viewMode === "list"
                      ? "กำลังโหลดรายชื่อไฟล์..."
                      : "กำลังโหลดเนื้อหา..."}
                  </p>
                </div>
              )}

              {/* VIEW 1: FILE LIST */}
              {viewMode === "list" && (
                <div className="p-6 space-y-3">
                  {!loadingDocs && docsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <FileText size={32} className="opacity-20" />
                      </div>
                      <p>บอทตัวนี้ยังไม่มีเอกสาร</p>
                    </div>
                  ) : (
                    docsList.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() =>
                          handleViewChunkContent(doc.id, doc.filename)
                        }
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <FileText size={20} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                                {doc.filename}
                              </h4>
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar size={10} />
                                {new Date(doc.created_at).toLocaleDateString(
                                  "th-TH",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                            <Eye size={20} />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VIEW 2: CHUNK DETAIL */}
              {viewMode === "detail" && (
                <div className="p-6">
                  {!loadingDocs && currentChunks.length === 0 ? (
                    <div className="text-center text-slate-400 py-20">
                      ไม่พบเนื้อหาในเอกสารนี้
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {currentChunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] font-bold rounded uppercase border border-orange-100">
                              Chunk #{chunk.chunk_index + 1}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-wrap">
                            {chunk.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <button
                onClick={() => setDocModalOpen(false)}
                className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MessageSquare size={18} className="text-red-500" /> Reject
                Reason
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <XCircle size={18} />
              </button>
            </div>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Why is this rejected?"
              className="text-slate-600 w-full h-24 p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-400 resize-none placeholder:text-slate-300"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="cursor-pointer px-3 py-1.5 text-slate-500 hover:bg-slate-50 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedRequestId &&
                  handleProcess(selectedRequestId, "rejected", rejectNote)
                }
                disabled={!rejectNote.trim() || !!processingId}
                className="cursor-pointer px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium disabled:opacity-50"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}