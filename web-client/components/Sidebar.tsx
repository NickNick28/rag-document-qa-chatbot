import {
  LayoutDashboard,
  Plus,
  LogOut,
  Trash2,
  LayoutGrid,
  Compass,
  Bot as BotIcon,
  X,
  User,
} from "lucide-react";

export type Bot = {
  id: string;
  name: string;
  desc: string;
  is_public: boolean;
  is_external: boolean;
  created_at: string;
  updated_at: string;
  recommend_chat?: string | string[];
  system_instruction?: string;
  temperature?: number;
  has_pending_request?: boolean;
  pending_request_type?: string | null;
  share_token?: string | null;
};

interface SidebarProps {
  bots: Bot[];
  isLoading: boolean;
  activeBotId: string | null;
  onSelectBot: (id: string) => void;
  onDeleteBot: (id: string) => void;
  onOpenCreateModal: () => void;
  onSelectExplore: () => void;
  onLogout: () => void;
  userRole: string;
  // ✅ เพิ่ม user prop เพื่อรับข้อมูลมาแสดงใน Footer
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isOpen: boolean;
  onClose: () => void;
  currentView: "overview" | "explore" | "chat";
  onSelectOverview: () => void;
}

export default function Sidebar({
  bots,
  isLoading,
  activeBotId,
  onSelectBot,
  onDeleteBot,
  onOpenCreateModal,
  onSelectExplore,
  onLogout,
  userRole,
  user, // ✅ รับ prop user
  isOpen,
  onClose,
  currentView,
  onSelectOverview,
}: SidebarProps) {
  const isUser = userRole === "user";
  const limit = 2; // ควรรับเป็น props มา หรือ hardcode ให้ตรงกัน

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* --- HEADER (LOGO) --- */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 font-bold text-slate-800 text-lg">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
            <BotIcon size={20} />
          </div>
          <span>AI Chat</span>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-slate-400 hover:text-slate-600 p-1"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 custom-scrollbar">
        {/* --- ADMIN ZONE --- */}
        {userRole === "admin" && (
          <div>
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 px-2">
              Admin Zone
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-200 text-sm font-medium"
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>
            </div>
          </div>
        )}

        {/* --- MENU SECTION --- */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">
            Menu
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => {
                onSelectExplore();
                onClose();
              }}
              className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium
                ${
                  currentView === "explore"
                    ? "bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <Compass
                size={18}
                className={
                  currentView === "explore"
                    ? "text-orange-600"
                    : "text-slate-400 group-hover:text-slate-600"
                }
              />
              Explore
            </button>

            <button
              onClick={() => {
                onSelectOverview();
                onClose();
              }}
              className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium
                ${
                  currentView === "overview"
                    ? "bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <LayoutGrid
                size={18}
                className={
                  currentView === "overview"
                    ? "text-orange-600"
                    : "text-slate-400 group-hover:text-slate-600"
                }
              />
              Overview
            </button>
          </div>
        </div>

        {/* --- YOUR ASSISTANTS SECTION --- */}
        <div>
          <div className="flex items-center justify-between mb-3 px-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Your Assistants
              {/* แสดงโควต้าเฉพาะ User */}
              {isUser && (
                <span
                  className={`${bots.length >= limit ? "text-red-500 font-bold" : "text-slate-600"}`}
                >
                  {" "}
                  {bots.length} / {limit}
                </span>
              )}
            </h3>
            <button
              onClick={() => {
                onOpenCreateModal();
                onClose();
              }}
              className="cursor-pointer p-1 rounded-md hover:bg-orange-50 text-slate-400 hover:text-orange-600 transition-colors"
              title="Create New Bot"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 bg-slate-100 rounded-xl animate-pulse"
                />
              ))
            ) : bots.length === 0 ? (
              <div className="text-center py-4 px-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 mb-2">No assistants yet</p>
                <button
                  onClick={() => {
                    onOpenCreateModal();
                    onClose();
                  }}
                  className="cursor-pointer text-xs text-orange-600 font-medium hover:underline"
                >
                  Create one
                </button>
              </div>
            ) : (
              bots.map((bot) => {
                const isActive = activeBotId === bot.id;
                return (
                  <div
                    key={bot.id}
                    className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer border
                      ${
                        isActive
                          ? "bg-white border-orange-400 shadow-md shadow-orange-100/50 z-10"
                          : "bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600"
                      }`}
                    onClick={() => {
                      onSelectBot(bot.id);
                      onClose();
                    }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                          isActive
                            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                            : "bg-slate-300 group-hover:bg-slate-400"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium truncate ${
                          isActive ? "text-slate-800" : "text-slate-600"
                        }`}
                      >
                        {bot.name}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBot(bot.id);
                      }}
                      className={`cursor-pointer opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all ${
                        isActive ? "opacity-100" : ""
                      }`}
                      title="Delete Bot"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- ✅ FOOTER (เหมือน AdminSidebar) --- */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border border-white shadow-sm overflow-hidden">
            {/* ถ้ามีรูป Profile ให้แสดงรูป ถ้าไม่มีให้แสดงตัวอักษรแรก */}
            {user?.image ? (
              <img
                src={user.image}
                alt="User"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email || "No Email"}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="cursor-pointer w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-100 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm"
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 border-r border-slate-200 flex-col h-full shrink-0 z-20">
        <SidebarContent />
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden
        ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
