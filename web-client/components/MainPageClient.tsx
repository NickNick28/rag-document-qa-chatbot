"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

// --- Icons ---
import {
  Loader2,
  X,
  Menu,
  Settings,
  Save,
  Globe,
  Share2,
  Link as LinkIcon,
  MessageSquarePlus,
  Brain,
  Layout,
  Thermometer,
  FileText,
  LockKeyhole,
  RefreshCw,
  CheckCircle,
  Clock,
} from "lucide-react";

// --- Material UI ---
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";

// --- Components ---
import Sidebar, { Bot } from "@/components/Sidebar";
import ExploreView, { BotData } from "@/components/ExploreView";
import ChatPage from "@/components/ChatPage";
import OverviewPage from "@/components/OverviewPage";

const UploadPage = dynamic(() => import("@/components/Upload"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-slate-400">
      <Loader2 className="animate-spin mr-2" /> Loading Upload Module...
    </div>
  ),
});

interface MainPageClientProps {
  userRole: string;
}

export default function MainPageClient({ userRole }: MainPageClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State สำหรับ Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newlyCreatedBot, setNewlyCreatedBot] = useState<Bot | null>(null);
  const [isCreating, setIsCreating] = useState(false); // สำหรับทำ Loading ตอนกดสร้างบอท

  // --- Stats State ---
  const [userStats, setUserStats] = useState({
    totalMessages: 0,
    totalBots: 0,
    tokensUsed: 0,
    maxTokens: 50000,
  });

  // --- Data State ---
  const [myBots, setMyBots] = useState<Bot[]>([]);
  const [exploreBots, setExploreBots] = useState<BotData[]>([]);

  // --- UI/UX State ---
  const [activeBotId, setActiveBotId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExploreLoading, setIsExploreLoading] = useState(false);
  const [currentView, setCurrentView] = useState<
    "overview" | "explore" | "chat"
  >("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Create Modal State ---
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBotName, setNewBotName] = useState("");
  const [newBotDesc, setNewBotDesc] = useState("");

  // --- Edit Bot State ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBot, setEditingBot] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ เพิ่ม state สำหรับ Loading ตอนกด Regenerate Link
  const [isRegenerating, setIsRegenerating] = useState(false);

  // --- Lock state ----
  const isPending = editingBot?.has_pending_request;
  const isLive = editingBot?.is_public || editingBot?.is_external;
  const isAdmin = userRole === "admin";

  const isContentLocked = !isAdmin && (isPending || isLive);
  const isInteractionLocked = !isAdmin && isPending;

  // --- Edit Form Fields ---
  const [activeTab, setActiveTab] = useState<
    "general" | "behavior" | "knowledge"
  >("general");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editIsExternal, setEditIsExternal] = useState(false);
  const [editRecommendChat, setEditRecommendChat] = useState("");
  const [editSystemInstruction, setEditSystemInstruction] = useState("");
  const [editTemperature, setEditTemperature] = useState(0.5);

  // --- Snackbar State ---
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "warning"
  >("success");

  // Config Limit
  const BOT_LIMIT = 2;

  const canCreateBot = useMemo(() => {
    if (userRole === "admin" || userRole === "staff") return true;
    if (userRole === "user") {
      return myBots.length < BOT_LIMIT;
    }
    return false;
  }, [userRole, myBots.length]);

  const handleOpenCreateModal = () => {
    if (!canCreateBot) {
      setSnackbarMessage(`คุณใช้โควต้าครบ ${BOT_LIMIT}/${BOT_LIMIT} บอทแล้ว`);
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }
    setShowCreateModal(true);
  };

  const generateBotId = () => {
    const randomPart = Math.random().toString(36).substring(2, 11);
    const timestampPart = Date.now().toString(36).substring(4);
    return `bot_${randomPart}${timestampPart}`;
  };

  const handleCloseSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const updateUrl = useCallback(
    (view: string, botId?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", view);
      if (botId) {
        params.set("botId", botId);
      } else {
        params.delete("botId");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    const viewParam = searchParams.get("view") as
      | "overview"
      | "explore"
      | "chat"
      | null;
    const botIdParam = searchParams.get("botId");

    if (viewParam) setCurrentView(viewParam);
    if (botIdParam) setActiveBotId(botIdParam);
  }, [searchParams]);

  useEffect(() => {
    if (currentView === "overview") fetchAllData();
  }, [currentView]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    if (myBots.length === 0) setIsLoading(true);
    try {
      const resMyBots = await fetch(`/api/bots?t=${new Date().getTime()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      if (resMyBots.ok) {
        const data = await resMyBots.json();
        const mappedMyBots: Bot[] = data.map((b: any) => ({
          id: b.bot_id,
          name: b.name,
          desc: b.description,
          is_public: b.is_public,
          is_external: b.is_external,
          recommend_chat: b.recommend_chat || [],
          system_instruction: b.system_instruction || "",
          temperature: b.temperature !== undefined ? b.temperature : 0.5, // ใช้ !== undefined เพื่อกันค่า 0 หาย
          created_at: b.created_at,
          updated_at: b.updated_at,
          has_pending_request: b.has_pending_request,
          pending_request_type: b.pending_request_type,
          share_token: b.share_token,
        }));
        setMyBots(mappedMyBots);
      }

      const resExplore = await fetch(
        `/api/bots/explore?t=${new Date().getTime()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      );
      if (resExplore.ok) {
        const data = await resExplore.json();
        const publicBots = data.bots || data || [];
        setExploreBots(publicBots);
      }

      const resStats = await fetch(
        `/api/user/stats?t=${new Date().getTime()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        },
      );
      if (resStats.ok) {
        const stats = await resStats.json();
        setUserStats(stats);
      }
    } catch (error) {
      console.log("Error fetching data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---
  const handleCreateBot = async () => {
    if (!newBotName.trim()) {
      setSnackbarMessage("กรุณากรอกชื่อบอท");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setIsCreating(true); // 🌟 เริ่มหมุน Loading

    const autoId = generateBotId();
    const newBot: Bot = {
      id: autoId,
      name: newBotName,
      desc: newBotDesc,
      is_public: false,
      is_external: false,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    try {
      // ยิง API ไปสร้างใน Database ก่อน
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_id: newBot.id,
          name: newBot.name,
          description: newBot.desc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create bot");

      // สร้างสำเร็จ ค่อยอัปเดต State หน้าจอ
      setMyBots([newBot, ...myBots]);
      setShowCreateModal(false); // ปิดหน้าต่างสร้าง
      setNewBotName("");
      setNewBotDesc("");

      // เปิดหน้าต่างแจ้งเตือนว่าสำเร็จ
      setNewlyCreatedBot(newBot);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error("Error creating bot:", error);
      setSnackbarMessage("เกิดข้อผิดพลาดในการบันทึกบอท");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsCreating(false); // หยุดหมุน Loading
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบ?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/bots", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: botId }),
      });

      if (!res.ok) throw new Error("Delete failed");

      const updatedBots = myBots.filter((b) => b.id !== botId);
      setMyBots(updatedBots);
      if (activeBotId === botId) handleSelectOverview();

      setSnackbarMessage("ลบบอทเรียบร้อยแล้ว");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error deleting bot:", error);
      setSnackbarMessage("เกิดข้อผิดพลาดในการลบ");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePermission = async (type: "public" | "external") => {
    // ==================================================================================
    // 1. Logic สำหรับ User ทั่วไป (🚫 ห้ามแก้ไข / Access Denied)
    // ==================================================================================
    if (userRole === "user") {
      setSnackbarMessage(
        "คุณไม่มีสิทธิ์แก้ไขการตั้งค่าส่วนนี้ (เฉพาะ Admin/Staff)",
      );
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);

      // Revert UI Checkbox กลับ (กัน User ติ๊กเล่น)
      if (type === "public") setEditIsPublic(editingBot.is_public);
      if (type === "external") setEditIsExternal(editingBot.is_external);
      return;
    }

    // ==================================================================================
    // 2. Logic สำหรับ Admin (✅ Auto-save: บันทึกทันที)
    // ==================================================================================
    if (userRole === "admin") {
      // 2.1 คำนวณค่าสถานะใหม่
      const nextIsPublic = type === "public" ? !editIsPublic : editIsPublic;
      const nextIsExternal =
        type === "external" ? !editIsExternal : editIsExternal;

      // 2.2 เตรียม Token (ถ้าเปิด Share แล้วยังไม่มี -> สร้างใหม่)
      let tokenToSend = editingBot.share_token;
      if (type === "external" && !editIsExternal && !tokenToSend) {
        tokenToSend = crypto.randomUUID();
      }

      setIsSaving(true);

      try {
        // 2.3 เรียก API บันทึกทันที
        const res = await fetch("/api/bots", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botId: editingBot.id,
            is_public: nextIsPublic,
            is_external: nextIsExternal,
            share_token: tokenToSend,
          }),
        });

        if (!res.ok) throw new Error("Auto-save failed");

        const updatedBotData = await res.json();

        // 2.4 อัปเดต UI State
        if (type === "public") setEditIsPublic(nextIsPublic);
        if (type === "external") setEditIsExternal(nextIsExternal);

        setEditingBot((prev: any) => ({
          ...prev,
          is_public: nextIsPublic,
          is_external: nextIsExternal,
          share_token: updatedBotData.share_token || tokenToSend,
        }));

        setMyBots((prev) =>
          prev.map((b) =>
            b.id === editingBot.id
              ? ({
                  ...b,
                  is_public: nextIsPublic,
                  is_external: nextIsExternal,
                  share_token: updatedBotData.share_token || tokenToSend,
                  updated_at: new Date().toISOString(),
                } as any)
              : b,
          ),
        );

        setSnackbarMessage("อัปเดตสถานะเรียบร้อยแล้ว");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } catch (error: any) {
        console.error("Auto-save error:", error);
        // Revert Checkbox on error
        if (type === "public") setEditIsPublic(!nextIsPublic);
        if (type === "external") setEditIsExternal(!nextIsExternal);

        setSnackbarMessage("เกิดข้อผิดพลาดในการบันทึกสถานะ");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // ==================================================================================
    // 3. Logic สำหรับ Staff (📝 Request Flow: ต้องขออนุมัติ)
    // ==================================================================================

    // เช็คสถานะปัจจุบัน
    const isCurrentlyOn = type === "public" ? editIsPublic : editIsExternal;

    // กรณี 3.1: ถ้ากำลังจะ "ปิด" (Uncheck) -> ปิดได้เลย ไม่ต้องขออนุมัติ
    if (isCurrentlyOn) {
      if (type === "public") setEditIsPublic(false);
      if (type === "external") setEditIsExternal(false);
      return;
    }

    // กรณี 3.2: ถ้ากำลังจะ "เปิด" (Check) -> ต้องขออนุมัติ
    if (
      !confirm(
        `⚠️ การเปิดใช้งานนี้ต้องได้รับการอนุมัติจาก Admin ก่อน\n\nยืนยันการส่งคำร้อง?`,
      )
    ) {
      return;
    }

    try {
      setIsSaving(true);

      let newRequestType = type === "public" ? "publish" : "share";
      const currentPending = editingBot.pending_request_type;

      if (currentPending) {
        if (currentPending === "publish" && type === "external")
          newRequestType = "both";
        else if (currentPending === "share" && type === "public")
          newRequestType = "both";
        else if (currentPending === "both") newRequestType = "both";
      }

      const requestRes = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: editingBot.id,
          isPublic: type === "public",
          isExternal: type === "external",
          requestType: newRequestType,
          // Staff ไม่ต้องส่ง token เพราะ Admin จะเป็นคน Generate ให้ตอนอนุมัติ
        }),
      });

      if (!requestRes.ok) {
        const errData = await requestRes.json();
        throw new Error(errData.error || "Failed to submit request");
      }

      setMyBots((prev) =>
        prev.map((b) =>
          b.id === editingBot.id
            ? ({
                ...b,
                has_pending_request: true,
                pending_request_type: newRequestType,
              } as any)
            : b,
        ),
      );

      setEditingBot((prev: any) => ({
        ...prev,
        has_pending_request: true,
        pending_request_type: newRequestType,
      }));

      setSnackbarMessage("ส่งคำร้องขออนุมัติเรียบร้อยแล้ว");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error: any) {
      console.error("Request error:", error);
      setSnackbarMessage("เกิดข้อผิดพลาดในการส่งคำร้อง");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Regenerate Link
  const handleRegenerateLink = async () => {
    if (
      !confirm(
        "⚠️ คำเตือน: ลิงก์เก่าจะใช้งานไม่ได้อีกต่อไป\nคุณต้องการสร้างลิงก์ใหม่ใช่หรือไม่?",
      )
    )
      return;

    setIsRegenerating(true);
    try {
      const res = await fetch("/api/bots/regenerate-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: editingBot.id }),
      });

      if (!res.ok) throw new Error("Failed to regenerate");

      const data = await res.json();
      const newToken = data.share_token;

      // Update Local State
      setEditingBot((prev: any) => ({ ...prev, share_token: newToken }));
      setMyBots((prev) =>
        prev.map((b) =>
          b.id === editingBot.id ? { ...b, share_token: newToken } : b,
        ),
      );

      setSnackbarMessage("สร้างลิงก์ใหม่เรียบร้อยแล้ว");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error(error);
      setSnackbarMessage("เกิดข้อผิดพลาดในการสร้างลิงก์ใหม่");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleUpdateBot = async () => {
    if (!editName.trim()) {
      setSnackbarMessage("กรุณากรอกชื่อบอท");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setIsSaving(true);

    const recommendChatPayload =
      typeof editRecommendChat === "string"
        ? editRecommendChat
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s !== "")
        : editRecommendChat;

    try {
      const res = await fetch("/api/bots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: editingBot.id,
          name: editName,
          description: editDesc,
          is_public: editIsPublic,
          is_external: editIsExternal,
          recommend_chat: recommendChatPayload,
          system_instruction: editSystemInstruction,
          temperature: editTemperature,
        }),
      });

      if (!res.ok) throw new Error("Update failed");
      // รับค่าที่ Server ตอบกลับมา (ซึ่งจะมี share_token ใหม่ ถ้าเพิ่งสร้าง)
      const updatedBotData = await res.json();

      setMyBots((prev) =>
        prev.map((b) =>
          b.id === editingBot.id
            ? ({
                ...b,
                name: editName,
                desc: editDesc,
                is_public: editIsPublic,
                is_external: editIsExternal,
                recommend_chat: recommendChatPayload,
                system_instruction: editSystemInstruction,
                temperature: editTemperature,
                updated_at: new Date().toISOString(),
                share_token: updatedBotData.share_token || b.share_token,
                has_pending_request:
                  userRole === "admin" ? false : b.has_pending_request,
                pending_request_type:
                  userRole === "admin" ? null : b.pending_request_type,
              } as any)
            : b,
        ),
      );

      // ✅ 3. อัปเดต EditingBot ด้วย (เพื่อให้หน้า Modal เปลี่ยนลิงก์ทันที)
      setEditingBot((prev: any) => ({
        ...prev,
        share_token: updatedBotData.share_token || prev.share_token,
      }));

      setSnackbarMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setShowEditModal(false);
    } catch (error: any) {
      console.error("Update error:", error);
      setSnackbarMessage(error.message || "เกิดข้อผิดพลาดในการบันทึก");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!confirm("ยืนยันที่จะยกเลิกคำร้องขออนุมัติ?")) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/requests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId: editingBot.id }),
      });

      if (!res.ok) throw new Error("Failed to cancel");

      setMyBots((prev) =>
        prev.map((b) =>
          b.id === editingBot.id
            ? ({
                ...b,
                has_pending_request: false,
                pending_request_type: null,
              } as any)
            : b,
        ),
      );

      setEditingBot((prev: any) => ({
        ...prev,
        has_pending_request: false,
        pending_request_type: null,
      }));

      setSnackbarMessage("ยกเลิกคำร้องเรียบร้อยแล้ว");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Cancel error:", error);
      setSnackbarMessage("เกิดข้อผิดพลาดในการยกเลิก");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm("คุณแน่ใจหรือไม่ที่จะออกจากระบบ?")) {
      await signOut({ callbackUrl: "/login" });
    }
  };

  const handleSelectOverview = () => {
    setCurrentView("overview");
    setActiveBotId("");
    updateUrl("overview");
  };

  const handleSelectExplore = async () => {
    setCurrentView("explore");
    setActiveBotId("");
    updateUrl("explore");
    setIsExploreLoading(true);
    try {
      const res = await fetch("/api/bots/explore");
      if (res.ok) {
        const data = await res.json();
        const publicBots = data.bots || data || [];
        setExploreBots(publicBots);
      }
    } catch (error) {
      console.error("Failed to refresh explore:", error);
    } finally {
      setIsExploreLoading(false);
    }
  };

  const handleSelectBot = (botId: string) => {
    setActiveBotId(botId);
    setCurrentView("chat");
    updateUrl("chat", botId);
  };

  const handleUpdateBotInfo = (id: string, updates: any) => {
    setMyBots((prev) =>
      prev.map((bot) =>
        bot.id === id
          ? ({
              ...bot,
              name: updates.name ?? bot.name,
              desc: updates.description ?? bot.desc,
              is_public: updates.is_public ?? bot.is_public,
              is_external: updates.is_external ?? bot.is_external,
            } as any)
          : bot,
      ),
    );
  };

  const activeBot =
    myBots.find((b) => b.id === activeBotId) ||
    exploreBots.find(
      (b) =>
        b.bot_id === activeBotId && {
          id: b.bot_id,
          name: b.name,
          desc: b.description,
        },
    );

  const displayActiveBot = activeBot
    ? {
        id: (activeBot as any).bot_id || (activeBot as any).id,
        name: activeBot.name,
        desc: (activeBot as any).description || (activeBot as any).desc,
        recommend_chat: (activeBot as any).recommend_chat || [],
      }
    : null;

  const openEditModal = (botFromClick: any) => {
    // ค้นหาข้อมูลล่าสุดจาก State myBots โดยใช้ ID
    // (เพราะ botFromClick ที่ส่งมาจากปุ่มกด อาจจะเป็นข้อมูลเก่าก่อนการ fetch ล่าสุด)
    const latestBotData =
      myBots.find((b) => b.id === botFromClick.id) || botFromClick;

    setEditingBot(latestBotData);

    // Set State ต่างๆ โดยใช้ข้อมูลล่าสุด
    setEditName(latestBotData.name || "");
    setEditDesc(latestBotData.desc || "");
    setEditIsPublic(latestBotData.is_public || false);
    setEditIsExternal(latestBotData.is_external || false);

    const initialRecommend = Array.isArray(latestBotData.recommend_chat)
      ? latestBotData.recommend_chat.join("\n")
      : latestBotData.recommend_chat || "";
    setEditRecommendChat(initialRecommend);

    setEditSystemInstruction(latestBotData.system_instruction || "");

    // เช็ค !== undefined เพราะค่า 0 คือค่าที่มีความหมาย (Precise)
    setEditTemperature(
      latestBotData.temperature !== undefined ? latestBotData.temperature : 0.5,
    );

    setActiveTab("general");
    setShowEditModal(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      <Sidebar
        bots={myBots}
        isLoading={isLoading}
        currentView={currentView}
        activeBotId={activeBotId}
        onSelectOverview={handleSelectOverview}
        onSelectExplore={handleSelectExplore}
        onSelectBot={handleSelectBot}
        onDeleteBot={handleDeleteBot}
        onOpenCreateModal={handleOpenCreateModal}
        onLogout={handleLogout}
        userRole={userRole}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={session?.user}
      />

      <main className="flex-1 flex flex-col h-full bg-slate-50 relative transition-all duration-300">
        <div className="md:hidden absolute top-3 left-3 z-30">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600 hover:text-orange-600"
          >
            <Menu size={20} />
          </button>
        </div>

        {currentView === "overview" && (
          <div className="flex-1 overflow-hidden h-full">
            <OverviewPage
              tokensUsed={userStats.tokensUsed}
              maxTokens={userStats.maxTokens}
              bots={myBots}
              onSelectBot={handleSelectBot}
              onCreateNew={handleOpenCreateModal}
              userEmail={session?.user?.email}
              totalConversations={userStats.totalMessages}
              onEditBot={openEditModal}
              onDeleteBot={handleDeleteBot}
              isLoading={isLoading}
            />
          </div>
        )}

        {currentView === "explore" && (
          <div className="flex-1 overflow-hidden h-full">
            <ExploreView
              bots={exploreBots}
              onSelectBot={handleSelectBot}
              isLoading={isExploreLoading}
            />
          </div>
        )}

        {currentView === "chat" &&
          (isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Loader2
                className="animate-spin mb-4 text-orange-500"
                size={40}
              />
              <p className="text-sm">Loading chat...</p>
            </div>
          ) : (
            displayActiveBot && (
              <>
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                  {/* --- ซ้าย: ข้อมูลบอท (โค้ดเดิมของคุณ) --- */}
                  <div className="hidden md:block">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        {displayActiveBot.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-medium text-slate-500 uppercase">
                        {displayActiveBot.id}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-0.5 ml-6 line-clamp-1">
                      {displayActiveBot.desc || "AI Assistant ready to help."}
                    </p>
                  </div>

                  {/* Badge แจ้งเตือนการรีเซ็ตแชท */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-xs text-slate-500 shadow-sm animate-in fade-in duration-300">
                    <Clock size={14} className="text-slate-400" />
                    <span>
                      ประวัติการสนทนาจะรีเซ็ตทุกวันเวลา{" "}
                      <strong>07:00 น.</strong>
                    </span>
                  </div>
                </header>

                <div className="flex-1 overflow-hidden relative">
                  <ChatPage
                    key={displayActiveBot.id}
                    botId={displayActiveBot.id}
                    initialQuestions={displayActiveBot.recommend_chat}
                    onUpdateBot={handleUpdateBotInfo}
                  />
                </div>
              </>
            )
          ))}
      </main>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isDeleting}
      >
        <div className="flex flex-col items-center gap-3">
          <CircularProgress color="inherit" />
          <span className="text-white font-medium text-lg">
            กำลังลบข้อมูล...
          </span>
        </div>
      </Backdrop>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-xl font-bold text-slate-800">
                  Create New Assistant
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none placeholder:text-slate-300 transition-all"
                    placeholder="e.g. HR Assistant"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newBotDesc}
                    onChange={(e) => setNewBotDesc(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none placeholder:text-slate-300 transition-all"
                    placeholder="Briefly describe what this assistant does..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="cursor-pointer px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBot}
                  disabled={isCreating}
                  className="cursor-pointer px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium shadow-md shadow-orange-200 transition-all flex items-center gap-2"
                >
                  {isCreating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  Create Assistant
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Success Modal (หลังจากสร้างบอทเสร็จ) */}
      {/* ============================================================== */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden text-center p-8 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
              <CheckCircle size={40} className="drop-shadow-sm" />
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">
              สร้างแชทบอทสำเร็จ!
            </h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed px-2">
              แชทบอท <strong>"{newlyCreatedBot?.name}"</strong>{" "}
              ของคุณพร้อมใช้งานแล้ว
              คุณต้องการตั้งค่าหรืออัปโหลดเอกสารความรู้เลยหรือไม่?
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="cursor-pointer flex-1 px-4 py-3 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-semibold transition-colors"
              >
                เอาไว้ก่อน
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  if (newlyCreatedBot) {
                    openEditModal(newlyCreatedBot);
                  }
                }}
                className="cursor-pointer flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 text-sm font-semibold shadow-lg shadow-orange-200 transition-all"
              >
                ตั้งค่าแชทบอท
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingBot && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 h-auto max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Settings size={18} className="text-slate-500" /> ตั้งค่าแชทบอท
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isSaving}
              >
                <X size={20} />
              </button>
            </div>

            {isContentLocked && (
              <div
                className={`mx-6 mt-4 p-3 rounded-lg flex items-center justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-2 border ${
                  isPending
                    ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isPending ? (
                    <Loader2 size={18} className="animate-spin shrink-0" />
                  ) : (
                    <Globe size={18} className="shrink-0" />
                  )}
                  <div>
                    <strong className="font-semibold">
                      {isPending
                        ? "กำลังรอการอนุมัติ"
                        : "บอทกำลังใช้งานอยู่ (Live)"}
                    </strong>
                    <p className="text-xs opacity-90">
                      {isPending
                        ? "ไม่สามารถแก้ไขข้อมูลได้ในขณะที่คำร้องกำลังถูกตรวจสอบ"
                        : "หากต้องการแก้ไขข้อมูล กรุณาปิดสถานะ Public/Share ก่อน"}
                    </p>
                  </div>
                </div>
                {isPending && (
                  <button
                    onClick={handleCancelRequest}
                    disabled={isSaving}
                    className="cursor-pointer px-3 py-1.5 bg-white border border-yellow-300 rounded-md text-xs font-bold text-yellow-700 hover:bg-yellow-100 transition-all shadow-sm whitespace-nowrap"
                  >
                    ยกเลิกคำร้อง
                  </button>
                )}
              </div>
            )}

            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                onClick={() => setActiveTab("general")}
                className={`cursor-pointer flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "general"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Layout size={16} /> General
              </button>
              <button
                onClick={() => setActiveTab("behavior")}
                className={`cursor-pointer flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "behavior"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Brain size={16} /> System
              </button>
              <button
                onClick={() => !isContentLocked && setActiveTab("knowledge")}
                disabled={isContentLocked}
                className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === "knowledge"
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                } ${isContentLocked ? "opacity-40 cursor-not-allowed bg-slate-50" : "cursor-pointer"}`}
                title={
                  isContentLocked
                    ? "ไม่สามารถแก้ไขเอกสารได้ระหว่างรอการอนุมัติ"
                    : ""
                }
              >
                <FileText size={16} /> Documents
                {isContentLocked && <LockKeyhole size={15} />}
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {activeTab === "general" && (
                <div className="space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400"
                        disabled={isSaving || isContentLocked}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Description
                      </label>
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 min-h-[80px] resize-none"
                        disabled={isSaving || isContentLocked}
                      />
                    </div>
                  </div>

                  {userRole !== "user" && (
                    <>
                      <hr className="border-slate-100" />
                      {(() => {
                        const isPendingExplore =
                          editingBot.has_pending_request &&
                          (editingBot.pending_request_type === "publish" ||
                            editingBot.pending_request_type === "both");
                        return (
                          <div
                            className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isPendingExplore ? "bg-yellow-50 border-yellow-200" : "bg-slate-50 border-slate-100"}`}
                          >
                            <div className="space-y-0.5">
                              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Globe
                                  size={16}
                                  className={
                                    isPendingExplore
                                      ? "text-yellow-600"
                                      : "text-slate-500"
                                  }
                                />
                                แสดงบนหน้า Explore
                              </label>
                              <p
                                className={`text-xs ${isPendingExplore ? "text-yellow-700" : "text-slate-500"}`}
                              >
                                {isPendingExplore
                                  ? "คำร้องขอเปิดใช้งานกำลังรอการอนุมัติจาก Admin"
                                  : "อนุญาตให้ผู้อื่นค้นหาและใช้งานบอทนี้ได้"}
                              </p>
                            </div>
                            {isPendingExplore ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-yellow-200 rounded-lg shadow-sm">
                                <Loader2
                                  size={14}
                                  className="animate-spin text-yellow-600"
                                />
                                <span className="text-xs font-bold text-yellow-700">
                                  รออนุมัติ
                                </span>
                              </div>
                            ) : (
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={editIsPublic}
                                  onChange={() =>
                                    handleTogglePermission("public")
                                  }
                                  disabled={isSaving}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                              </label>
                            )}
                          </div>
                        );
                      })()}

                      {(() => {
                        const isPendingShare =
                          editingBot.has_pending_request &&
                          (editingBot.pending_request_type === "share" ||
                            editingBot.pending_request_type === "both");
                        return (
                          <div
                            className={`p-4 rounded-xl border space-y-3 transition-colors ${isPendingShare ? "bg-yellow-50 border-yellow-200" : "bg-orange-50 border-orange-100"}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                  <Share2
                                    size={16}
                                    className={
                                      isPendingShare
                                        ? "text-yellow-600"
                                        : "text-orange-600"
                                    }
                                  />
                                  อนุญาตให้คนภายนอกใช้งาน
                                </label>
                                <p
                                  className={`text-xs ${isPendingShare ? "text-yellow-700" : "text-slate-500"}`}
                                >
                                  {isPendingShare
                                    ? "คำร้องขอเปิดลิงก์กำลังรอการอนุมัติ"
                                    : "สร้างลิงก์สำหรับผู้ใช้ที่ไม่มี Login (Guest)"}
                                </p>
                              </div>
                              {isPendingShare ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-yellow-200 rounded-lg shadow-sm">
                                  <Loader2
                                    size={14}
                                    className="animate-spin text-yellow-600"
                                  />
                                  <span className="text-xs font-bold text-yellow-700">
                                    รออนุมัติ
                                  </span>
                                </div>
                              ) : (
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={editIsExternal}
                                    onChange={() =>
                                      handleTogglePermission("external")
                                    }
                                    disabled={isSaving}
                                  />
                                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                                </label>
                              )}
                            </div>

                            {/* ✅ ส่วน Copy Link & Regenerate (ใช้ Share Token) */}
                            {(editIsExternal || editingBot.is_external) &&
                              !isPendingShare && (
                                <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                  <div className="flex-1 flex items-center bg-white border border-orange-200 rounded-lg px-3 py-2">
                                    <LinkIcon
                                      size={14}
                                      className="text-slate-400 mr-2 shrink-0"
                                    />
                                    <input
                                      readOnly
                                      // ใช้ share_token แทน botId
                                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${editingBot.share_token || editingBot.id}`}
                                      className="flex-1 text-xs text-slate-600 select-all focus:outline-none bg-transparent truncate"
                                    />
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(
                                        `${window.location.origin}/share/${editingBot.share_token || editingBot.id}`,
                                      );
                                      setSnackbarMessage("คัดลอกลิงก์แล้ว!");
                                      setSnackbarSeverity("success");
                                      setSnackbarOpen(true);
                                    }}
                                    className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-2 rounded-lg transition-colors font-medium whitespace-nowrap shadow-sm"
                                  >
                                    Copy
                                  </button>
                                  {/* ✅ ปุ่ม Regenerate Link */}
                                  <button
                                    onClick={handleRegenerateLink}
                                    disabled={isRegenerating}
                                    title="สร้างลิงก์ใหม่ (ลิงก์เก่าจะใช้ไม่ได้)"
                                    className="cursor-pointer bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-600 text-xs p-2 rounded-lg transition-colors shadow-sm"
                                  >
                                    {isRegenerating ? (
                                      <Loader2
                                        size={16}
                                        className="animate-spin text-orange-500"
                                      />
                                    ) : (
                                      <RefreshCw size={16} />
                                    )}
                                  </button>
                                </div>
                              )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              {activeTab === "behavior" && (
                <div className="space-y-5 max-w-1xl mx-auto">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Settings size={16} className="text-slate-400" /> System
                      Instructions (Prompt)
                    </label>
                    <p className="text-xs text-slate-500">
                      กำหนดบุคลิก ลักษณะการพูด หรือกฎเพิ่มเติมให้บอท
                    </p>
                    <textarea
                      value={editSystemInstruction}
                      onChange={(e) => setEditSystemInstruction(e.target.value)}
                      placeholder="เช่น: คุณคือ AI ผู้ช่วยฝ่ายขาย ให้ตอบคำถามลูกค้าด้วยความสุภาพ และเป็นมืออาชีพ"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 min-h-[150px] resize-none font-mono text-xs leading-relaxed"
                      disabled={isSaving || isContentLocked}
                    />
                  </div>
                  <hr className="border-slate-100" />
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Thermometer size={16} className="text-slate-400" />{" "}
                        Creativity Level (Temperature)
                      </label>
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600 min-w-[3rem] text-center">
                        {editTemperature}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">
                        Precise (0.0)
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={editTemperature}
                        onChange={(e) =>
                          setEditTemperature(parseFloat(e.target.value))
                        }
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        disabled={isSaving || isContentLocked}
                      />
                      <span className="text-xs text-slate-400">
                        Creative (1.0)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      ปรับความหลากหลายของคำตอบ: ค่าต่ำบอทจะตอบเป๊ะตามข้อมูล,
                      ค่าสูงบอทจะมีความคิดสร้างสรรค์มากขึ้น
                    </p>
                  </div>
                  <hr className="border-slate-100" />
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <MessageSquarePlus size={16} className="text-slate-400" />{" "}
                      Recommended Questions
                    </label>
                    <p className="text-xs text-slate-500">
                      ตัวอย่างคำถามเพื่อให้ผู้ใช้กดถามได้ง่าย (บรรทัดละ 1 คำถาม)
                    </p>
                    <textarea
                      value={editRecommendChat}
                      onChange={(e) => setEditRecommendChat(e.target.value)}
                      placeholder="ตัวอย่าง:&#10;สวัสดีครับ&#10;ช่วยสรุปเอกสารให้หน่อย&#10;ขอข้อมูลเพิ่มเติม"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 min-h-[120px] resize-none"
                      disabled={isSaving || isContentLocked}
                    />
                  </div>
                </div>
              )}

              {activeTab === "knowledge" && (
                <div className="h-full w-full">
                  <UploadPage botId={editingBot.id} />
                </div>
              )}
            </div>

            {activeTab !== "knowledge" ? (
              <div className="flex justify-end items-center p-4 border-t border-slate-100 shrink-0 bg-slate-50">
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEditModal(false)}
                    disabled={isSaving}
                    className="cursor-pointer px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleUpdateBot}
                    disabled={isSaving || isInteractionLocked}
                    className={`cursor-pointer px-4 py-2 text-sm bg-orange-600 text-white hover:bg-orange-700 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 ${
                      isSaving || isInteractionLocked
                        ? "opacity-70 cursor-not-allowed bg-slate-400"
                        : "bg-orange-600"
                    }`}
                  >
                    {isInteractionLocked ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> รออนุมัติ
                      </>
                    ) : (
                      <>
                        <Save size={16} /> บันทึก
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end items-center p-4 border-t border-slate-100 shrink-0 bg-slate-50">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="cursor-pointer px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
