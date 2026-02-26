"use client";

import { useState } from "react";
import {
  Shield,
  Loader2,
  User,
  Search,
  X,
  Ban,
  ChevronLeft,
  ChevronRight,
  Briefcase, // ✅ เพิ่มไอคอนสำหรับ Staff
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 5;

// ✅ กำหนดตัวเลือก Role
const ROLES = [
  { value: "user", label: "User" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

export default function UserManagementTable({
  users,
  currentUserEmail,
}: {
  users: UserData[];
  currentUserEmail?: string | null;
}) {
  const [userList, setUserList] = useState(users);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ ปรับแก้ Logic ให้รับ role ใหม่จาก Dropdown
  const handleRoleChange = async (email: string, newRole: string) => {
    // หา role ปัจจุบันเพื่อเช็คว่ามีการเปลี่ยนแปลงจริงไหม
    const currentUser = userList.find((u) => u.email === email);
    if (currentUser?.role === newRole) return;

    if (
      !confirm(
        `คุณต้องการเปลี่ยนสิทธิ์ของ ${email} เป็น "${newRole.toUpperCase()}" ใช่หรือไม่?`
      )
    ) {
      // ถ้ากด Cancel ให้ reset ui (React state จะ render ค่าเดิมเองเพราะเรายังไม่ได้ setUsers)
      return;
    }

    setLoadingEmail(email);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: newRole }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setUserList((prev) =>
        prev.map((u) => (u.email === email ? { ...u, role: newRole } : u))
      );
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์");
      console.error(error);
    } finally {
      setLoadingEmail(null);
    }
  };

  // Logic สำหรับกรองข้อมูล
  const filteredUsers = userList.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Logic สำหรับ Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Helper สำหรับแสดงไอคอนตาม Role
  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield size={16} />;
      case "staff":
        return <Briefcase size={16} />;
      default:
        return <User size={16} />;
    }
  };

  // Helper สำหรับสี Background ของ Role
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-orange-100 text-orange-600 border-orange-200";
      case "staff":
        return "bg-blue-100 text-blue-600 border-blue-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="font-semibold text-slate-800 whitespace-nowrap">
          รายชื่อผู้ใช้งานระบบ
        </h3>

        {/* Search Bar */}
        <div className="relative w-full sm:max-w-xs">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="ค้นหา Email หรือ Role..."
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

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Current Role</th>
              <th className="px-6 py-3">Registered Date</th>
              <th className="px-6 py-3 text-right">Change Role</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => {
              const isCurrentUser = user.email === currentUserEmail;
              const isLoading = loadingEmail === user.email;

              return (
                <tr
                  key={user.id}
                  className={`transition-colors border-b border-slate-100 last:border-0 ${
                    isCurrentUser ? "bg-orange-50/30" : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-slate-700">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          user.role === "admin"
                            ? "bg-orange-100 text-orange-600"
                            : user.role === "staff"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex flex-col">
                        <span>{user.email}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] text-orange-600 font-bold">
                            It's You
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(user.created_at).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* ✅ ส่วน Dropdown Action */}
                    {isCurrentUser ? (
                      <div className="flex items-center justify-end gap-1 text-slate-400 cursor-not-allowed select-none opacity-60">
                        <Ban size={14} />
                        <span className="text-xs font-medium">Locked</span>
                      </div>
                    ) : (
                      <div className="relative inline-block w-32">
                        {isLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                            <Loader2 size={16} className="animate-spin text-orange-500" />
                          </div>
                        )}
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.email, e.target.value)
                          }
                          disabled={isLoading}
                          className={`
                            cursor-pointer w-full appearance-none bg-white border border-slate-200 
                            text-slate-700 text-xs font-medium py-1.5 pl-3 pr-8 rounded-lg 
                            focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400
                            transition-all hover:border-slate-300
                            ${isLoading ? "opacity-50" : ""}
                          `}
                        >
                          {ROLES.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        {/* Custom Arrow Icon for Select */}
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                          <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Search size={32} className="opacity-20" />
                    <p>ไม่พบข้อมูลที่ตรงกับ "{searchTerm}"</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredUsers.length > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {startIndex + 1} to{" "}
            {Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of{" "}
            {filteredUsers.length} entries
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="cursor-pointer p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-sm font-medium text-slate-600 px-2">
              Page {currentPage} of {totalPages === 0 ? 1 : totalPages}
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
    </div>
  );
}