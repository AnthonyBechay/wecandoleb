"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  Users,
  Building2,
  Package,
  Calendar,
  Shield,
  Search,
  ChevronDown,
  Star,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";

type Tab = "stats" | "users" | "businesses" | "experiences" | "registrations";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Experiences state
  const [experiences, setExperiences] = useState<any[]>([]);
  const [expSearch, setExpSearch] = useState("");
  const [expStatusFilter, setExpStatusFilter] = useState("");
  const [expCategoryFilter, setExpCategoryFilter] = useState("");
  const [expandedExpId, setExpandedExpId] = useState<string | null>(null);
  const [editingExp, setEditingExp] = useState<any>(null);
  const [savingExpId, setSavingExpId] = useState<string | null>(null);

  // Registrations state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [rejectNoteId, setRejectNoteId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [processingRegId, setProcessingRegId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role))) router.push("/");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return;
    api.get<any>("/api/admin/stats").then(setStats).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (tab === "users") {
      const params = searchQuery ? `?search=${searchQuery}` : "";
      api.get<{ users: any[] }>(`/api/admin/users${params}`).then((d) => setUsers(d.users)).catch(() => {});
    }
    if (tab === "businesses") {
      api.get<any[]>("/api/admin/businesses").then(setBusinesses).catch(() => {});
    }
  }, [tab, searchQuery]);

  // Fetch experiences
  useEffect(() => {
    if (tab === "experiences") {
      const params = new URLSearchParams();
      if (expSearch) params.set("search", expSearch);
      if (expStatusFilter) params.set("status", expStatusFilter);
      if (expCategoryFilter) params.set("category", expCategoryFilter);
      const qs = params.toString();
      api
        .get<any>(`/api/admin/experiences${qs ? `?${qs}` : ""}`)
        .then((d) => setExperiences(Array.isArray(d) ? d : d.experiences || []))
        .catch(() => {});
    }
  }, [tab, expSearch, expStatusFilter, expCategoryFilter]);

  // Fetch registrations
  useEffect(() => {
    if (tab === "registrations" && user?.role === "SUPER_ADMIN") {
      api
        .get<any>("/api/admin/registrations")
        .then((d) => setRegistrations(Array.isArray(d) ? d : d.registrations || []))
        .catch(() => {});
    }
  }, [tab, user]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleVerifyBusiness = async (id: string) => {
    try {
      await api.put(`/api/admin/businesses/${id}/verify`);
      setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, isVerified: true } : b)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Experience handlers
  const handleExpandExperience = (exp: any) => {
    if (expandedExpId === exp.id) {
      setExpandedExpId(null);
      setEditingExp(null);
    } else {
      setExpandedExpId(exp.id);
      setEditingExp({ ...exp });
    }
  };

  const handleExpFieldChange = (field: string, value: any) => {
    setEditingExp((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleJsonFieldChange = (field: string, value: string) => {
    try {
      const parsed = JSON.parse(value);
      setEditingExp((prev: any) => ({ ...prev, [field]: parsed }));
    } catch {
      setEditingExp((prev: any) => ({ ...prev, [`_raw_${field}`]: value }));
    }
  };

  const handleSaveExperience = async (id: string) => {
    if (!editingExp) return;
    setSavingExpId(id);
    try {
      const payload: any = {};
      const fields = [
        "title",
        "shortDescription",
        "description",
        "highlights",
        "includes",
        "whatToBring",
        "priceCredits",
        "priceCurrency",
        "duration",
        "maxParticipants",
        "minParticipants",
        "difficulty",
        "minAge",
        "address",
        "city",
        "region",
        "coverImage",
        "categoryId",
        "status",
        "featured",
      ];
      const original = experiences.find((e) => e.id === id);
      for (const f of fields) {
        if (JSON.stringify(editingExp[f]) !== JSON.stringify(original?.[f])) {
          payload[f] = editingExp[f];
        }
      }
      if (Object.keys(payload).length > 0) {
        await api.put(`/api/admin/experiences/${id}`, payload);
        setExperiences((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...payload } : e))
        );
      }
      setExpandedExpId(null);
      setEditingExp(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingExpId(null);
    }
  };

  const handleToggleFeatured = async (exp: any) => {
    const newFeatured = !exp.featured;
    try {
      await api.put(`/api/admin/experiences/${exp.id}/featured`, { featured: newFeatured });
      setExperiences((prev) =>
        prev.map((e) => (e.id === exp.id ? { ...e, featured: newFeatured } : e))
      );
      if (editingExp?.id === exp.id) {
        setEditingExp((prev: any) => ({ ...prev, featured: newFeatured }));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Registration handlers
  const handleApproveRegistration = async (id: string) => {
    setProcessingRegId(id);
    try {
      await api.put(`/api/admin/registrations/${id}/approve`);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "APPROVED" } : r))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingRegId(null);
    }
  };

  const handleRejectRegistration = async (id: string) => {
    setProcessingRegId(id);
    try {
      await api.put(`/api/admin/registrations/${id}/reject`, { reviewNote: rejectNote || undefined });
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "REJECTED" } : r))
      );
      setRejectNoteId(null);
      setRejectNote("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingRegId(null);
    }
  };

  if (authLoading || !user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return null;

  const allTabs: Tab[] = ["stats", "users", "businesses", "experiences"];
  if (user.role === "SUPER_ADMIN") allTabs.push("registrations");

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-cedar-700" />
          <h1 className="font-display text-3xl font-bold text-gray-900">Admin Panel</h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {allTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition capitalize ${
                tab === t
                  ? "bg-cedar-700 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {tab === "stats" && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Users", value: stats.users, icon: <Users className="w-5 h-5" /> },
              { label: "Businesses", value: stats.businesses, icon: <Building2 className="w-5 h-5" /> },
              { label: "Experiences", value: stats.experiences, icon: <Package className="w-5 h-5" /> },
              { label: "Bookings", value: stats.bookings, icon: <Calendar className="w-5 h-5" /> },
              {
                label: "Credits Issued",
                value: `${(stats.totalCreditsCirculating / 100).toFixed(0)}`,
                icon: <Shield className="w-5 h-5" />,
              },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  {s.icon}
                  {s.label}
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
            {stats.pendingRegistrations !== undefined && (
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <FileText className="w-5 h-5" />
                  Pending Registrations
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingRegistrations}</p>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div>
            <div className="relative mb-4 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500"
              />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">User</th>
                    <th className="text-left px-5 py-3 font-medium">Email</th>
                    <th className="text-left px-5 py-3 font-medium">Role</th>
                    <th className="text-left px-5 py-3 font-medium">Credits</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{u.email}</td>
                      <td className="px-5 py-3">
                        {user.role === "SUPER_ADMIN" ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium outline-none"
                          >
                            {["USER", "BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-lg">
                            {u.role}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">{(u.creditBalance / 100).toFixed(0)}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            u.isActive ? "bg-cedar-50 text-cedar-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Businesses Tab */}
        {tab === "businesses" && (
          <div className="space-y-4">
            {businesses.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-cedar-50 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-cedar-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{b.name}</h3>
                  <p className="text-sm text-gray-500">
                    Owner: {b.owner.firstName} {b.owner.lastName} · {b._count.experiences}{" "}
                    experiences
                  </p>
                </div>
                {!b.isVerified ? (
                  <button onClick={() => handleVerifyBusiness(b.id)} className="btn-primary text-xs !py-2 !px-3">
                    Verify
                  </button>
                ) : (
                  <span className="text-xs bg-cedar-50 text-cedar-700 px-3 py-1 rounded-full font-medium">
                    Verified
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Experiences Tab */}
        {tab === "experiences" && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={expSearch}
                  onChange={(e) => setExpSearch(e.target.value)}
                  placeholder="Search experiences..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500"
                />
              </div>
              <div className="relative">
                <select
                  value={expStatusFilter}
                  onChange={(e) => setExpStatusFilter(e.target.value)}
                  className="appearance-none border border-gray-200 rounded-xl px-4 py-3 pr-10 outline-none focus:ring-2 focus:ring-cedar-500 bg-white text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="DRAFT">Draft</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              {experiences.map((exp) => (
                <div key={exp.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* Experience Row */}
                  <div
                    className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => handleExpandExperience(exp)}
                  >
                    <div className="w-12 h-12 rounded-xl bg-cedar-50 flex items-center justify-center">
                      <Package className="w-6 h-6 text-cedar-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{exp.title}</h3>
                        {exp.featured && (
                          <Star className="w-4 h-4 text-sunset-500 fill-sunset-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {exp.city} · {exp.priceCredits} credits
                        {exp.category?.name ? ` · ${exp.category.name}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFeatured(exp);
                      }}
                      className={`p-2 rounded-lg transition ${
                        exp.featured
                          ? "bg-sunset-500/10 text-sunset-500"
                          : "bg-gray-100 text-gray-400 hover:text-sunset-500"
                      }`}
                      title={exp.featured ? "Remove featured" : "Mark as featured"}
                    >
                      <Star className={`w-5 h-5 ${exp.featured ? "fill-current" : ""}`} />
                    </button>
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ${
                        exp.status === "ACTIVE"
                          ? "bg-cedar-50 text-cedar-700"
                          : exp.status === "DRAFT"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {exp.status}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                        expandedExpId === exp.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>

                  {/* Expanded Edit Form */}
                  {expandedExpId === exp.id && editingExp && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                          <input
                            type="text"
                            value={editingExp.title || ""}
                            onChange={(e) => handleExpFieldChange("title", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Short Description
                          </label>
                          <input
                            type="text"
                            value={editingExp.shortDescription || ""}
                            onChange={(e) => handleExpFieldChange("shortDescription", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                          <textarea
                            rows={3}
                            value={editingExp.description || ""}
                            onChange={(e) => handleExpFieldChange("description", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Highlights (JSON array)
                          </label>
                          <textarea
                            rows={2}
                            value={
                              editingExp[`_raw_highlights`] ??
                              JSON.stringify(editingExp.highlights || [], null, 2)
                            }
                            onChange={(e) => handleJsonFieldChange("highlights", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Includes (JSON array)
                          </label>
                          <textarea
                            rows={2}
                            value={
                              editingExp[`_raw_includes`] ??
                              JSON.stringify(editingExp.includes || [], null, 2)
                            }
                            onChange={(e) => handleJsonFieldChange("includes", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            What To Bring (JSON array)
                          </label>
                          <textarea
                            rows={2}
                            value={
                              editingExp[`_raw_whatToBring`] ??
                              JSON.stringify(editingExp.whatToBring || [], null, 2)
                            }
                            onChange={(e) => handleJsonFieldChange("whatToBring", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Price (Credits)
                          </label>
                          <input
                            type="number"
                            value={editingExp.priceCredits ?? ""}
                            onChange={(e) =>
                              handleExpFieldChange("priceCredits", parseInt(e.target.value) || 0)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Price (Currency)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingExp.priceCurrency ?? ""}
                            onChange={(e) =>
                              handleExpFieldChange("priceCurrency", parseFloat(e.target.value) || 0)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Duration (minutes)
                          </label>
                          <input
                            type="number"
                            value={editingExp.duration ?? ""}
                            onChange={(e) =>
                              handleExpFieldChange("duration", parseInt(e.target.value) || 0)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Max Participants
                          </label>
                          <input
                            type="number"
                            value={editingExp.maxParticipants ?? ""}
                            onChange={(e) =>
                              handleExpFieldChange("maxParticipants", parseInt(e.target.value) || 0)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Min Participants
                          </label>
                          <input
                            type="number"
                            value={editingExp.minParticipants ?? ""}
                            onChange={(e) =>
                              handleExpFieldChange("minParticipants", parseInt(e.target.value) || 0)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty</label>
                          <input
                            type="text"
                            value={editingExp.difficulty || ""}
                            onChange={(e) => handleExpFieldChange("difficulty", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Min Age</label>
                          <input
                            type="number"
                            value={editingExp.minAge ?? ""}
                            onChange={(e) =>
                              handleExpFieldChange("minAge", parseInt(e.target.value) || 0)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                          <input
                            type="text"
                            value={editingExp.address || ""}
                            onChange={(e) => handleExpFieldChange("address", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                          <input
                            type="text"
                            value={editingExp.city || ""}
                            onChange={(e) => handleExpFieldChange("city", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Region</label>
                          <input
                            type="text"
                            value={editingExp.region || ""}
                            onChange={(e) => handleExpFieldChange("region", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Cover Image URL
                          </label>
                          <input
                            type="text"
                            value={editingExp.coverImage || ""}
                            onChange={(e) => handleExpFieldChange("coverImage", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Category ID
                          </label>
                          <input
                            type="text"
                            value={editingExp.categoryId || ""}
                            onChange={(e) => handleExpFieldChange("categoryId", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                          <div className="relative">
                            <select
                              value={editingExp.status || "DRAFT"}
                              onChange={(e) => handleExpFieldChange("status", e.target.value)}
                              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="INACTIVE">INACTIVE</option>
                              <option value="DRAFT">DRAFT</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="block text-xs font-medium text-gray-500">Featured</label>
                          <button
                            onClick={() => handleExpFieldChange("featured", !editingExp.featured)}
                            className={`p-2 rounded-lg transition ${
                              editingExp.featured
                                ? "bg-sunset-500/10 text-sunset-500"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            <Star
                              className={`w-5 h-5 ${editingExp.featured ? "fill-current" : ""}`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setExpandedExpId(null);
                            setEditingExp(null);
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveExperience(exp.id)}
                          disabled={savingExpId === exp.id}
                          className="btn-primary text-sm !py-2 !px-4 flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          {savingExpId === exp.id ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {experiences.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                  No experiences found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Registrations Tab (SUPER_ADMIN only) */}
        {tab === "registrations" && user.role === "SUPER_ADMIN" && (
          <div className="space-y-4">
            {registrations.map((reg) => (
              <div
                key={reg.id}
                className="bg-white rounded-xl border border-gray-100 p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cedar-50 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-cedar-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{reg.businessName}</h3>
                    <p className="text-sm text-gray-500">
                      {reg.ownerName} · {reg.ownerEmail}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Submitted {new Date(reg.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full flex-shrink-0 ${
                      reg.status === "APPROVED"
                        ? "bg-cedar-50 text-cedar-700"
                        : reg.status === "REJECTED"
                        ? "bg-red-50 text-red-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {reg.status}
                  </span>
                  {reg.status !== "APPROVED" && reg.status !== "REJECTED" && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveRegistration(reg.id)}
                        disabled={processingRegId === reg.id}
                        className="btn-primary text-xs !py-2 !px-3 flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          if (rejectNoteId === reg.id) {
                            handleRejectRegistration(reg.id);
                          } else {
                            setRejectNoteId(reg.id);
                            setRejectNote("");
                          }
                        }}
                        disabled={processingRegId === reg.id}
                        className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition flex items-center gap-1 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                {rejectNoteId === reg.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <input
                      type="text"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Optional rejection note..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                    />
                    <button
                      onClick={() => handleRejectRegistration(reg.id)}
                      disabled={processingRegId === reg.id}
                      className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                    >
                      Confirm Reject
                    </button>
                    <button
                      onClick={() => {
                        setRejectNoteId(null);
                        setRejectNote("");
                      }}
                      className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
            {registrations.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                No registrations found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
