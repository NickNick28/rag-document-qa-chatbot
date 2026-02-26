"use client";
import { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Plus,
  AlertTriangle,
  Eye,
  Database,
  FileCode,
} from "lucide-react";

import * as pdfjsLib from "pdfjs-dist";
import ReactMarkdown from "react-markdown";

// --- Config ---
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_PAGES = 10;

if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

// --- Interfaces ---
interface DocumentData {
  id: number;
  filename: string;
  created_at: string;
  url?: string; // (เผื่อในอนาคต API ส่ง URL กลับมาให้ดูย้อนหลังได้)
}

interface ChunkData {
  id: string;
  chunk_index: number;
  content: string;
  token_count: number;
}

interface FileQueueItem {
  id: string;
  file: File;
  status: "queued" | "uploading" | "processing" | "success" | "error";
  message: string;
}

export default function UploadPage({ botId }: { botId: string }) {
  // --- States ---
  const [queue, setQueue] = useState<FileQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // ✅ 2. State สำหรับ Preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // State สำหรับ Preview ดู Chunks
  const [activeChunks, setActiveChunks] = useState<ChunkData[] | null>(null);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunkFileName, setChunkFileName] = useState("");

  const isMounted = useRef(true);

  // --- Effects ---
  useEffect(() => {
    isMounted.current = true;
    if (botId) fetchDocuments();

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted.current = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [botId, isProcessing]);

  // --- Functions ---

  //ฟังก์ชั่นดึง Chunks มาแสดง
  const handleViewChunks = async (doc: DocumentData) => {
    setLoadingChunks(true);
    setChunkFileName(doc.filename);
    try {
      const res = await fetch(
        `/api/documents/chunks?documentId=${doc.id}&botId=${botId}`,
      );
      const data = await res.json();

      if (res.ok) {
        setActiveChunks(data.chunks);
      } else {
        alert("ไม่สามารถแสดงข้อมูล Chunks ได้:" + data.error);
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoadingChunks(false);
    }
  };

  const closeChunksModal = () => {
    setActiveChunks(null);
    setChunkFileName("");
  };

  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await fetch(`/api/documents?botId=${botId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDoc = async (doc: DocumentData) => {
    if (!confirm(`คุณต้องการลบไฟล์ "${doc.filename}" ใช่หรือไม่?`)) return;
    try {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, botId, filename: doc.filename }),
      });
    } catch (error) {
      alert("ลบไฟล์ไม่สำเร็จ");
      fetchDocuments();
    }
  };

  const getPDFPageCount = async (file: File): Promise<number> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      return pdf.numPages;
    } catch (error) {
      console.error("Error reading PDF:", error);
      return 0;
    }
  };

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      e.target.value = "";

      const validFiles: FileQueueItem[] = [];

      for (const file of filesArray) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          alert(`ไฟล์ "${file.name}" ใหญ่เกิน ${MAX_FILE_SIZE_MB}MB`);
          continue;
        }

        try {
          const numPages = await getPDFPageCount(file);

          if (numPages === 0) {
            alert(`ไฟล์ "${file.name}" ไม่สามารถอ่านได้ หรือไม่ใช่ PDF`);
            continue;
          }

          if (numPages > MAX_PAGES) {
            alert(
              `ไฟล์ "${file.name}" มี ${numPages} หน้า (เกินกำหนด ${MAX_PAGES} หน้า)`,
            );
            continue;
          }

          validFiles.push({
            id: Math.random().toString(36).substring(7),
            file,
            status: "queued",
            message: `รอเริ่ม (${numPages} หน้า)`,
          });
        } catch (err) {
          alert(`ตรวจสอบไฟล์ "${file.name}" ล้มเหลว`);
        }
      }

      if (validFiles.length > 0) {
        setQueue((prev) => [...prev, ...validFiles]);
      }
    }
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQueueStatus = (
    id: string,
    status: FileQueueItem["status"],
    message: string,
  ) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status, message } : item,
      ),
    );
  };

  const waitForProcessing = async (
    filename: string,
  ): Promise<"success" | "error"> => {
    return new Promise(async (resolve) => {
      const checkStatus = async () => {
        if (!isMounted.current) return;
        try {
          const res = await fetch(
            `/api/status?filename=${encodeURIComponent(
              filename,
            )}&botId=${botId}`,
          );
          const data = await res.json();
          const status = data.status;

          if (status.includes("Completed") || status === "COMPLETED") {
            resolve("success");
          } else if (status === "ERROR" || status.includes("Error")) {
            resolve("error");
          } else {
            setTimeout(checkStatus, 3000);
          }
        } catch (err) {
          setTimeout(checkStatus, 3000);
        }
      };
      checkStatus();
    });
  };

  const startQueueProcessing = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    let currentQueue = [...queue];
    let index = currentQueue.findIndex((item) => item.status === "queued");

    while (index !== -1 && isMounted.current) {
      const item = currentQueue[index];
      updateQueueStatus(item.id, "uploading", "กำลังอัปโหลด...");

      try {
        const formData = new FormData();
        formData.append("file", item.file);

        const uploadRes = await fetch(`/api/upload?botId=${botId}`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Upload failed");

        updateQueueStatus(item.id, "processing", "กำลังประมวลผล ...");
        const result = await waitForProcessing(item.file.name);

        if (result === "success") {
          updateQueueStatus(item.id, "success", "เสร็จสมบูรณ์");
          fetchDocuments();
        } else {
          updateQueueStatus(item.id, "error", "เกิดข้อผิดพลาด");
        }
      } catch (error) {
        updateQueueStatus(item.id, "error", "อัปโหลดล้มเหลว");
      }

      await new Promise<void>((resolve) => {
        setQueue((prev) => {
          currentQueue = prev;
          resolve();
          return prev;
        });
      });
      index = currentQueue.findIndex((item) => item.status === "queued");
    }

    setIsProcessing(false);
  };

  // ✅ 3. ฟังก์ชันเปิด Preview (ใช้ URL.createObjectURL)
  const handlePreview = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // ✅ 4. ฟังก์ชันปิด Preview (เคลียร์ Memory)
  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl); // คืน memory ให้ browser
      setPreviewUrl(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-6 p-6 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-800 relative">
      {/* --- ✅ 5. Preview Modal (Popup) --- */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Eye size={18} className="text-orange-600" /> ตัวอย่างเอกสาร
              </h3>
              <button
                onClick={closePreview}
                className="cursor-pointer p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-1">
              {/* ใช้ iframe แสดง PDF */}
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg border border-slate-200"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ 5. Chunks Viewer Modal (เพิ่มใหม่ตรงนี้) */}
      {(activeChunks || loadingChunks) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">
                    ข้อมูลที่ AI มองเห็น (Text Chunks)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ไฟล์: {chunkFileName}
                  </p>
                </div>
              </div>
              <button
                onClick={closeChunksModal}
                className="cursor-pointer p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 bg-slate-100 p-4 overflow-y-auto">
              {loadingChunks ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                  <Loader2 className="animate-spin" size={32} />
                  <p>กำลังโหลดข้อมูลจาก Database...</p>
                </div>
              ) : activeChunks && activeChunks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Database size={48} className="mb-4 opacity-20" />
                  <p>
                    ไม่พบข้อมูล Chunks (ไฟล์อาจจะยังประมวลผลไม่เสร็จ
                    หรือเป็นไฟล์เก่า)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeChunks?.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-50">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                          Chunk #{chunk.chunk_index + 1}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ~{chunk.token_count} Tokens
                        </span>
                      </div>
                      <div className="prose prose-sm prose-slate max-w-none font-mono leading-relaxed break-words">
                        <ReactMarkdown>{chunk.content}</ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Status */}
            {!loadingChunks && activeChunks && (
              <div className="p-3 bg-white border-t border-slate-200 text-xs text-slate-500 text-center">
                แสดงผลทั้งหมด {activeChunks.length} chunks
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Upload className="text-orange-600" /> Upload Knowledge Base
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          อัปโหลดไฟล์ PDF (สูงสุด {MAX_FILE_SIZE_MB}MB และ {MAX_PAGES}{" "}
          หน้าต่อไฟล์)
        </p>
      </div>

      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-orange-50/30 transition-colors">
        <input
          type="file"
          id="file-upload"
          accept=".pdf"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
          disabled={isProcessing}
        />
        <label
          htmlFor="file-upload"
          className={`cursor-pointer flex flex-col items-center gap-3 w-full ${
            isProcessing ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <div className="w-14 h-14 bg-white text-orange-600 rounded-full shadow-sm border border-slate-100 flex items-center justify-center">
            {isProcessing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Plus size={28} />
            )}
          </div>
          <div className="text-center">
            <span className="text-base font-semibold text-slate-700 hover:text-orange-600 transition-colors">
              {isProcessing ? "กำลังประมวลผล..." : "คลิกเพื่อเพิ่มไฟล์ PDF"}
            </span>
          </div>
        </label>
      </div>
      <p className="text-slate-500 text-sm mt-1">
        Tip: การตั้งชื่อไฟล์ให้สื่อความหมาย และระบุปีของเอกสารในชื่อไฟล์
        จะทำให้ AI จัดกลุ่มและค้นหาได้ง่ายขึ้น เช่น
        "รายงานประจำปี 2568, ค่าธรรมเนียมการศึกษาปีการศึกษา 2568" เป็นต้น
      </p>

      {isProcessing && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-900 shadow-sm">
          <AlertTriangle className="shrink-0 text-amber-600 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-sm">
              กำลังประมวลผล... ห้ามปิดหน้าต่างนี้
            </h4>
            <p className="text-xs mt-1 text-amber-800/80">
              ระบบกำลังทำงานเบื้องหลัง หากปิดหน้าต่าง
              คิวที่เหลือจะถูกยกเลิกทันที
            </p>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">
              รายการอัปโหลด ({queue.length})
            </h3>
            {!isProcessing && queue.some((q) => q.status === "queued") && (
              <button
                onClick={startQueueProcessing}
                className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shadow-sm transition-all"
              >
                <Play size={16} fill="currentColor" /> เริ่มอัปโหลด
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {queue.map((item) => (
              <div key={item.id} className="p-3 flex items-center gap-3">
                <div className="shrink-0">
                  {item.status === "queued" && (
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <FileText size={18} />
                    </div>
                  )}
                  {(item.status === "uploading" ||
                    item.status === "processing") && (
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                      <Loader2 className="animate-spin" size={18} />
                    </div>
                  )}
                  {item.status === "success" && (
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                      <CheckCircle size={18} />
                    </div>
                  )}
                  {item.status === "error" && (
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                      <AlertCircle size={18} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <p
                      className="text-sm font-medium text-slate-700 truncate pr-2"
                      title={item.file.name}
                    >
                      {item.file.name}
                    </p>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <p
                    className={`text-xs truncate ${
                      item.status === "error"
                        ? "text-red-500"
                        : item.status === "success"
                          ? "text-green-600"
                          : "text-slate-400"
                    }`}
                  >
                    {item.message}
                  </p>
                </div>

                {/* ✅ 6. ปุ่ม Preview (แสดงตลอด เพื่อให้ User เช็คไฟล์ได้ก่อน/หลังอัปโหลด) */}
                <button
                  onClick={() => handlePreview(item.file)}
                  className="cursor-pointer p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors shrink-0"
                  title="ดูตัวอย่างเอกสาร"
                >
                  <Eye size={18} />
                </button>

                {!isProcessing &&
                  (item.status === "queued" ||
                    item.status === "error" ||
                    item.status === "success") && (
                    <button
                      onClick={() => removeQueueItem(item.id)}
                      className="cursor-pointer p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <X size={18} />
                    </button>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className="my-8 border-slate-100" />

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="text-slate-500" size={20} /> เอกสารในระบบ (
          {documents.length})
        </h2>
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden min-h-[100px]">
          {loadingDocs ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex justify-center py-8 text-slate-400 text-sm">
              ยังไม่มีเอกสาร
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 flex justify-between hover:bg-white transition-colors group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-orange-600 shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {doc.filename}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(doc.created_at).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* ✅ 6. เพิ่มปุ่ม View Chunks (Database Icon) */}
                    <button
                      onClick={() => handleViewChunks(doc)}
                      className="cursor-pointer p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      title="ดูข้อมูลที่ AI อ่าน (Chunks)"
                    >
                      <Database size={18} />
                    </button>
                    {/* ถ้ามี URL ในอนาคต ให้ใส่ปุ่มดูตรงนี้เพิ่มได้ */}
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="cursor-pointer p-2 text-slate-400 hover:text-orange-600 rounded-lg transition-all"
                      >
                        <Eye size={18} />
                      </a>
                    )}

                    <button
                      onClick={() => handleDeleteDoc(doc)}
                      className="cursor-pointer p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
