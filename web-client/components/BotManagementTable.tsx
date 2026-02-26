"use client";

import { useState } from "react";
import {
  Search,
  X,
  Bot,
  Globe,
  Lock,
  Trash2,
  Calendar,
  ChevronRight,
  ChevronDown,
  User,
  FileText,
  Loader2,
  Database,
  Link as LinkIcon,
  Eye,
  Info, // ✅ เพิ่ม Icon
  Thermometer, // ✅ เพิ่ม Icon
  Brain, // ✅ เพิ่ม Icon
  List, // ✅ เพิ่ม Icon
} from "lucide-react";
import BotChunkViewer from "./BotChunkViewer";

// --- Interfaces ---
interface BotData {
  id: string;
  bot_id: string;
  name: string;
  description: string;
  owner_id: string;
  is_public: boolean;
  is_external: boolean;
  created_at: string;
  updated_at: string;
  temperature: number;
}

// ✅ เพิ่ม Interface สำหรับข้อมูล Detail (รวม System Prompt)
interface BotDetail extends BotData {
  system_instruction?: string;
  recommend_chat?: string[];
}

interface DocData {
  id: string;
  filename: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 5;

export default function BotManagementTable({ bots }: { bots: BotData[] }) {
  // --- States ---
  const [botList, setBotList] = useState(bots);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // State สำหรับ Expand Row
  const [expandedBotId, setExpandedBotId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocData[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // State สำหรับ Viewer
  const [viewerDoc, setViewerDoc] = useState<{
    id: string;
    filename: string;
  } | null>(null);

  // ✅ State สำหรับ Info Modal
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [selectedBotInfo, setSelectedBotInfo] = useState<BotDetail | null>(
    null,
  );

  // --- Handlers ---
  const handleDeleteBot = async (botId: string, botName: string) => {
    if (!confirm(`⚠️ คำเตือน: คุณกำลังจะลบบอท "${botName}"\nยืนยันหรือไม่?`))
      return;

    setLoadingId(botId);
    try {
      const res = await fetch("/api/admin/bots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId }),
      });

      if (!res.ok) throw new Error("Failed to delete");
      setBotList((prev) => prev.filter((b) => b.bot_id !== botId));
      if (expandedBotId === botId) setExpandedBotId(null);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการลบบอท");
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleExpand = async (botId: string) => {
    if (expandedBotId === botId) {
      setExpandedBotId(null);
      return;
    }
    setExpandedBotId(botId);
    setLoadingDocs(true);
    setDocuments([]);
    try {
      const res = await fetch(`/api/admin/bots/${botId}/documents`);
      if (res.ok) {
        const docs = await res.json();
        setDocuments(docs);
      }
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  // ✅ ฟังก์ชันดึงรายละเอียดบอท
  const handleViewInfo = async (botId: string) => {
    setShowInfoModal(true);
    setLoadingInfo(true);
    setSelectedBotInfo(null);

    try {
      const res = await fetch(`/api/admin/bots/${botId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBotInfo(data);
      } else {
        console.error("Failed to fetch bot details");
      }
    } catch (error) {
      console.error("Error fetching bot details:", error);
    } finally {
      setLoadingInfo(false);
    }
  };

  // --- Filter & Pagination ---
  const filteredBots = botList.filter((bot) => {
    const term = searchTerm.toLowerCase();
    return (
      bot.name.toLowerCase().includes(term) ||
      bot.owner_id.toLowerCase().includes(term) ||
      bot.bot_id.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredBots.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBots = filteredBots.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const goToPreviousPage = () =>
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
    setExpandedBotId(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* --- Header --- */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bot className="text-orange-600" size={20} />
          <h3 className="font-semibold text-slate-800 whitespace-nowrap">
            ระบบจัดการบอททั้งหมด ({botList.length})
          </h3>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="ค้นหาชื่อบอท, เจ้าของ, ID..."
            className="w-full pl-9 pr-8 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-200 transition-all placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* --- Table Content --- */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left table-fixed">
          {/* ล็อคความกว้าง Column */}
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>

          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-center">#</th>
              <th className="px-6 py-3">Bot Info</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>

          {paginatedBots.map((bot) => (
            <tbody
              key={bot.id}
              className="border-b border-slate-100 last:border-0 group"
            >
              <tr
                className={`hover:bg-slate-50 transition-colors ${expandedBotId === bot.bot_id ? "bg-slate-50" : ""}`}
              >
                {/* Expand Button */}
                <td className="px-4 py-4 text-center align-top pt-6">
                  <button
                    onClick={() => toggleExpand(bot.bot_id)}
                    className={`cursor-pointer p-1 rounded transition-colors inline-flex items-center justify-center ${
                      expandedBotId === bot.bot_id
                        ? "text-orange-600 bg-orange-100"
                        : "text-slate-400 hover:text-orange-600 hover:bg-slate-100"
                    }`}
                  >
                    {expandedBotId === bot.bot_id ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                  </button>
                </td>

                {/* Bot Info */}
                <td className="px-6 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                      <Bot size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-700 truncate pr-2">
                        {bot.name}
                      </div>
                      <div
                        className="text-xs text-slate-400 font-mono mt-0.5 truncate"
                        title={bot.bot_id}
                      >
                        {bot.bot_id}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Owner */}
                <td className="px-6 py-4 align-top">
                  <div className="flex items-center gap-2 text-slate-600 mt-2">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate" title={bot.owner_id}>
                      {bot.owner_id}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-4 align-top">
                  <div className="flex flex-col gap-1.5 items-start mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                        bot.is_public
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}
                    >
                      {bot.is_public ? <Globe size={10} /> : <Lock size={10} />}
                      {bot.is_public ? "Public" : "Private"}
                    </span>
                    {bot.is_external && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <LinkIcon size={10} /> Shared
                      </span>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className="px-6 py-4 align-top text-slate-500">
                  <div className="flex items-center gap-1.5 mt-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">
                      {new Date(bot.created_at).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </span>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 align-top text-right">
                  <div className="flex justify-end items-center gap-1 mt-1">
                    {/* ✅ ปุ่ม Info */}
                    <button
                      onClick={() => handleViewInfo(bot.bot_id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
                      title="ดูรายละเอียด"
                    >
                      <Info size={18} />
                    </button>

                    {/* ปุ่มลบ */}
                    <button
                      onClick={() => handleDeleteBot(bot.bot_id, bot.name)}
                      disabled={loadingId === bot.bot_id}
                      className={`p-2 rounded-lg transition-colors ${
                        loadingId === bot.bot_id
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      }`}
                      title="ลบบอท"
                    >
                      {loadingId === bot.bot_id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </td>
              </tr>

              {/* --- Expanded Row (New List Style) --- */}
              {expandedBotId === bot.bot_id && (
                <tr className="bg-slate-50/50 shadow-inner">
                  <td colSpan={6} className="px-0 py-0">
                    <div className="py-4 pl-16 pr-6">
                      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        {/* Header ของ List */}
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <Database size={14} className="text-orange-600" />
                            <span className="text-xs font-bold text-slate-700 uppercase">
                              Documents ({documents.length})
                            </span>
                          </div>
                        </div>

                        {/* Loading State */}
                        {loadingDocs ? (
                          <div className="flex items-center justify-center py-4 text-slate-400 gap-2">
                            <Loader2
                              size={16}
                              className="animate-spin text-orange-500"
                            />
                            <span className="text-xs">Loading files...</span>
                          </div>
                        ) : documents.length === 0 ? (
                          <div className="flex items-center gap-2 px-4 py-4 text-slate-400">
                            <FileText size={16} className="opacity-50" />
                            <span className="text-xs italic">
                              No documents found.
                            </span>
                          </div>
                        ) : (
                          // ส่วนที่เป็น List Item
                          <div className="divide-y divide-slate-100">
                            {documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between px-4 py-2.5 hover:bg-orange-50/20 transition-colors group"
                              >
                                {/* File Info */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileText
                                    size={16}
                                    className="text-slate-400 group-hover:text-orange-500 transition-colors"
                                  />
                                  <div className="min-w-0">
                                    <div
                                      className="text-sm text-slate-700 font-medium truncate"
                                      title={doc.filename}
                                    >
                                      {doc.filename}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                      {new Date(
                                        doc.created_at,
                                      ).toLocaleDateString("th-TH")}
                                    </div>
                                  </div>
                                </div>

                                {/* View Button */}
                                <button
                                  onClick={() =>
                                    setViewerDoc({
                                      id: doc.id,
                                      filename: doc.filename,
                                    })
                                  }
                                  className="cursor-pointer flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 transition-all ml-4 shrink-0"
                                >
                                  <Eye size={12} />
                                  <span className="hidden sm:inline">View</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          ))}

          {filteredBots.length === 0 && (
            <tbody>
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} className="opacity-20" />
                    <p>ไม่พบข้อมูลบอทที่ตรงกับ "{searchTerm}"</p>
                  </div>
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      {filteredBots.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredBots.length)} of{" "}
            {filteredBots.length} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="cursor-pointer p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="rotate-180" size={16} />
            </button>
            <span className="text-sm font-medium text-slate-600 px-2">
              {currentPage} / {totalPages === 0 ? 1 : totalPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className="cursor-pointer p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Viewer (Document) */}
      <BotChunkViewer
        isOpen={!!viewerDoc}
        docId={viewerDoc?.id || ""}
        filename={viewerDoc?.filename || ""}
        onClose={() => setViewerDoc(null)}
      />

      {/* ✅ Modal Info (Bot Details) */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Bot size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">
                    {loadingInfo ? "Loading..." : selectedBotInfo?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bot ID: {selectedBotInfo?.bot_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white custom-scrollbar">
              {loadingInfo ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                  <p>กำลังโหลดข้อมูลบอท...</p>
                </div>
              ) : selectedBotInfo ? (
                <>
                  {/* Section 1: General Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                        Description
                      </h4>
                      <p className="text-sm text-slate-700">
                        {selectedBotInfo.description || "-"}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                        <Thermometer size={14} /> Creativity (Temperature)
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">
                          {selectedBotInfo.temperature}
                        </span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 2: System Instruction */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Brain size={16} className="text-purple-500" />
                      System Instructions (Prompt)
                    </h4>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto custom-scrollbar border border-slate-700 shadow-inner">
                      {selectedBotInfo.system_instruction ||
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
                    {selectedBotInfo.recommend_chat &&
                    Array.isArray(selectedBotInfo.recommend_chat) &&
                    selectedBotInfo.recommend_chat.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {selectedBotInfo.recommend_chat.map((chat, idx) => (
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
                onClick={() => setShowInfoModal(false)}
                className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
