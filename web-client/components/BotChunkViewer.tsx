"use client";

import { useState, useEffect } from "react";
import { X, Search, Hash, Loader2, FileText } from "lucide-react";

interface ChunkData {
  id: string;
  content: string;
  chunk_index: number;
  token_count: number;
}

interface BotChunkViewerProps {
  docId: string;      // ✅ รับ docId แทน
  filename: string;   // ✅ รับชื่อไฟล์
  isOpen: boolean;
  onClose: () => void;
}

export default function BotChunkViewer({ docId, filename, isOpen, onClose }: BotChunkViewerProps) {
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen && docId) {
      fetchChunks();
    }
  }, [isOpen, docId]);

  const fetchChunks = async () => {
    setLoading(true);
    try {
      // ✅ เรียก API ใหม่ที่ดึงตาม docId
      const res = await fetch(`/api/admin/documents/${docId}/chunks`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setChunks(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChunks = chunks.filter((c) =>
    c.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText size={20} className="text-orange-600" />
              {filename}
            </h3>
            <p className="text-xs text-slate-500">Document ID: {docId} ({chunks.length} chunks)</p>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1 rounded-full hover:bg-slate-200 text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-orange-500" /></div>
          ) : filteredChunks.length === 0 ? (
             <div className="text-center text-slate-400 py-10">ไม่พบข้อมูล Chunks</div>
          ) : (
            filteredChunks.map((chunk) => (
              <div key={chunk.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm">
                <div className="flex justify-between text-xs text-slate-400 mb-2 border-b border-slate-50 pb-1">
                  <span className="flex items-center gap-1"><Hash size={12}/> Index: {chunk.chunk_index}</span>
                  <span>Tokens: {chunk.token_count}</span>
                </div>
                <div className="font-mono text-slate-700 whitespace-pre-wrap break-words">
                  {chunk.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}