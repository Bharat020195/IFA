"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";
import { Plus, Edit, Info, Trash2, Search, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaginationBar from "../_components/Pagination";
import { showToast } from "@/hooks/useToast";

export default function AdminManagementPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUserId, setEditUserId] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [detailAdmin, setDetailAdmin] = useState(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteAdminData, setDeleteAdminData] = useState(null);
  const [page, setPage] = useState(1);
  const limit = 9;
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const [rowData, setRowData] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser.auth.getUser();
      if (error || !data?.user) {
        router.replace("/");
        return;
      }
      const uid = data.user.id;
      const { data: row } = await supabaseBrowser
        .from("users")
        .select("role")
        .eq("id", uid)
        .maybeSingle();
      if ((row?.role || "").toLowerCase() !== "superadmin") {
        router.replace("/");
        return;
      }
      setIsSuperadmin(true);
      setCheckingAuth(false);
    })();
  }, [router]);

  const fetchAdmins = useCallback(
    async (p = page, q = query) => {
      setLoading(true);
      try {
        const from = (p - 1) * limit;
        const to = from + limit - 1;
        let base = supabaseBrowser
          .from("users")
          .select("*", { count: "exact" })
          .in("role", ["admin", "superadmin"])
          .order("created_at", { ascending: false });

        if (q && q.trim() !== "") {
          const term = q.trim();
          base = base.or(
            `full_name.ilike.%${term}%,userId.ilike.%${term}%,email.ilike.%${term}%`
          );
        }

        const { data, error, count } = await base.range(from, to);
        if (error) {
          setAdmins([]);
          setTotal(0);
        } else {
          setAdmins(data || []);
          setTotal(count || 0);
        }
      } catch (e) {
        setAdmins([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [page, query]
  );

  useEffect(() => {
    if (!isSuperadmin) return;
    fetchAdmins(page, query);
  }, [isSuperadmin, page, query, fetchAdmins]);

  const filtered = useMemo(() => {
    return admins;
  }, [admins]);

  async function handleCreate() {
    if (!newFullName || !newUserId || !newEmail || !newPassword) {
      alert("All fields are required");
      return;
    }
    setCreating(true);
    try {
      const { data: authData, error: authError } =
        await supabaseBrowser.auth.signUp({
          email: newEmail,
          password: newPassword,
        });
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) throw new Error("Signup failed");
      const payload = {
        id: userId,
        full_name: newFullName,
        userId: newUserId,
        email: newEmail,
        role: newRole,
      };
      const { error: insertError } = await supabaseBrowser
        .from("users")
        .insert([payload]);
      if (insertError) throw insertError;
      setShowCreate(false);
      setNewFullName("");
      setNewUserId("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
      setPage(1);
      fetchAdmins(1, "");
    } catch (e) {
      alert(e?.message || "Failed to create admin");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(a) {
    setEditingAdmin(a);
    setEditFullName(a.full_name || "");
    setEditUserId(a.userId || "");
    setEditEmail(a.email || "");
    setEditRole(a.role || "admin");
    setShowEdit(true);
  }

  async function saveEditData() {
    if (!editingAdmin) return;
    setSavingEdit(true);
    try {
      const updates = {
        full_name: editFullName,
        userId: editUserId,
        email: editEmail,
        role: editRole,
      };
      const { error } = await supabaseBrowser
        .from("users")
        .update(updates)
        .eq("id", editingAdmin.id);
      if (error) alert("Update failed");
      setShowEdit(false);
      fetchAdmins(page, query);
    } catch (e) {
      alert("Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  const handleDeleteUser = async () => {
    const target = rowData || deleteAdminData;
    if (!target?.id) {
      showToast({
        type: "error",
        title: "Error",
        description: "No user selected for deletion",
      });
      return;
    }

    // optimistic remove
    const userToRemove = target;
    setAdmins((prev) => prev.filter((s) => s.id !== userToRemove.id));

    setIsDeleting(true);
    setLoading(true);

    try {
      // get session and access token (if present)
      const { data: { session } = {} } =
        await supabaseBrowser.auth.getSession();
      const accessToken = session?.access_token ?? null;

      // call your server route (which internally calls edge function / uses service role)
      const res = await fetch("/api/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ user_id: userToRemove.id }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error("Failed to delete user via API:", result);
        showToast({
          type: "error",
          title: "Error",
          description:
            result?.message ||
            result?.error ||
            "Something went wrong during deletion!",
        });
        // restore optimistic removal
        setAdmins((prev) => [...prev, userToRemove]);
      } else {
        showToast({
          type: "success",
          title: "Success",
          description: "User deleted successfully!",
        });
        try {
          await fetchAdmins(page, query);
        } catch (e) {
          console.warn("fetchAdmins failed after delete", e);
        }
      }
    } catch (error) {
      console.error("Deletion error:", error);
      showToast({
        type: "error",
        title: "Error",
        description: error?.message || "Something went wrong during deletion!",
      });
      // restore optimistic removal
      setAdmins((prev) => [...prev, userToRemove]);
    } finally {
      setIsDeleting(false);
      setLoading(false);
      setShowDelete(false);
      setDeleteAdminData(null);
      setRowData(null);
    }
  };

  return (
    <div className="min-h-full p-6 text-black">
      <div className="">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, userId or email"
              className="pl-10 pr-4 py-2 rounded-md border border-gray-300 w-full"
            />
            <Search
              className="absolute left-3 top-2.5 text-gray-500"
              size={18}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border border-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full text-black">
              <thead>
                <tr className="border-b text-gray-600 border-gray-300">
                  <th className="py-3 px-2 text-left">Name</th>
                  <th className="py-3 px-2 text-left">UserId</th>
                  <th className="py-3 px-2 text-left">Email</th>
                  <th className="py-3 px-2 text-left">Role</th>
                  <th className="py-3 px-2 text-left">Created</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading && admins.length === 0 ? (
                  Array.from({ length: limit }).map((_, idx) => (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="py-3 px-2">
                        <div className="h-4 bg-gray-200 rounded w-40 animate-pulse" />
                      </td>
                      <td className="py-3 px-2">
                        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                      </td>
                      <td className="py-3 px-2">
                        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
                      </td>
                      <td className="py-3 px-2">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                      </td>
                      <td className="py-3 px-2">
                        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-5">
                          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-300 hover:bg-gray-50"
                    >
                      <td className="py-3 px-2">{a.full_name}</td>
                      <td className="py-3 px-2">{a.userId}</td>
                      <td className="py-3 px-2">{a.email}</td>
                      <td className="py-3 px-2">{a.role}</td>
                      <td className="py-3 px-2">
                        {a.created_at
                          ? new Date(a.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-5">
                          <button onClick={() => openEdit(a)} className="">
                            <Edit
                              size={16}
                              className="text-blue-600 cursor-pointer"
                            />
                          </button>
                          <button
                            onClick={() => {
                              setDetailAdmin(a);
                              setShowDetail(true);
                            }}
                            className=""
                          >
                            <Info
                              size={16}
                              className="text-gray-600 cursor-pointer"
                            />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteAdminData(a);
                              setRowData(a);
                              setShowDelete(true);
                            }}
                            className=""
                          >
                            <Trash2
                              size={16}
                              className="text-red-600 cursor-pointer"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="mt-4">
              <PaginationBar
                page={page}
                setPage={(p) => {
                  if (p < 1) p = 1;
                  if (p > totalPages) p = totalPages;
                  setPage(p);
                }}
                totalPage={totalPages}
                totalRecord={total}
                limit={limit}
                setLimit={() => {}}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowCreate(true)}
        className="fixed right-6 bottom-6 bg-[#003366] text-white px-5 py-3 rounded-full flex items-center gap-2 shadow-lg"
      >
        <Plus size={16} /> Create Admin
      </button>

      {showCreate && (
        <div className="fixed inset-0 bg-black/20 z-[9999] flex items-center justify-center">
          <div className="bg-white w-full max-w-md p-6 rounded-lg">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#003366]">
                Create Admin
              </h2>
              <button onClick={() => setShowCreate(false)}>
                <X />
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Full Name"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
              <input
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="UserId"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
              <input
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full border border-gray-300 rounded-md p-2 pr-10"
                  placeholder="Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <span
                  className="absolute right-3 top-2.5 cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </span>
              </div>
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-4 py-2 rounded-md bg-[#003366] text-white"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 bg-black/20 z-[9999] flex items-center justify-center">
          <div className="bg-white w-full max-w-md p-6 rounded-lg">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#003366]">
                Edit Admin
              </h2>
              <button onClick={() => setShowEdit(false)}>
                <X />
              </button>
            </div>

            <div className="space-y-3">
              <input
                className="w-full border rounded-md p-2"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />
              <input
                className="w-full border rounded-md p-2"
                value={editUserId}
                onChange={(e) => setEditUserId(e.target.value)}
              />
              <input
                className="w-full border rounded-md p-2"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
              <select
                className="w-full border rounded-md p-2"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 border rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditData}
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-md bg-[#003366] text-white"
                >
                  {savingEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 bg-black/20 z-[9999] flex items-center justify-center">
          <div className="bg-white w-full max-w-md p-6 rounded-lg">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#003366]">
                Admin Details
              </h2>
              <button onClick={() => setShowDetail(false)}>
                <X />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Name</div>
              <div>{detailAdmin?.full_name}</div>
              <div>UserId</div>
              <div>{detailAdmin?.userId}</div>
              <div>Email</div>
              <div>{detailAdmin?.email}</div>
              <div>Role</div>
              <div>{detailAdmin?.role}</div>
              <div>Created</div>
              <div>
                {detailAdmin?.created_at
                  ? new Date(detailAdmin.created_at).toLocaleString()
                  : "-"}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetail(false)}
                className="px-4 py-2 border rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 bg-black/20 z-[9999] flex items-center justify-center">
          <div className="bg-white w-full max-w-sm p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-[#003366]">
              Delete Admin?
            </h3>
            <p className="text-sm mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isDeleting || loading}
                className={`px-4 py-2 rounded-md text-white ${
                  isDeleting || loading
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600"
                }`}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
