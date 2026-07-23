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
  Eye,
  UserPlus,
  DollarSign,
  TrendingUp,
  Wallet,
  ScrollText,
  Gift,
  Coins,
  EyeOff,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: "bg-cedar-50 text-cedar-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  PENDING: "bg-yellow-50 text-yellow-700",
  CANCELLED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-600",
};
import { api } from "@/lib/api";

type Tab = "stats" | "sales" | "activity" | "bookings" | "reviews" | "users" | "businesses" | "experiences" | "categories" | "registrations";

const TAB_LABELS: Record<Tab, string> = {
  stats: "Overview",
  sales: "Sales",
  activity: "Activity",
  bookings: "Bookings",
  reviews: "Reviews",
  users: "Users",
  businesses: "Businesses",
  experiences: "Experiences",
  categories: "Categories",
  registrations: "Registrations",
};

/* credits are in cents where 100 credits = $1 */
const usd = (credits: number) => `$${(credits / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<any>(null);
  const [accounting, setAccounting] = useState<any>(null);

  // Sales state
  const [sales, setSales] = useState<any>(null);

  // Activity / audit state
  const [audit, setAudit] = useState<any[]>([]);
  const [auditCategory, setAuditCategory] = useState("");
  const [auditSearch, setAuditSearch] = useState("");

  // Bookings state
  const [adminBookings, setAdminBookings] = useState<any[]>([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");

  // Reviews state
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [reviewFilter, setReviewFilter] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");

  // Categories state (also used to populate the experience category dropdown)
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState<any>({});

  // Credit adjustment modal
  const [adjustUser, setAdjustUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "USER",
    creditBalance: 0,
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<any>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Businesses state
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [createBusinessForm, setCreateBusinessForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    website: "",
    address: "",
    city: "",
    region: "",
    ownerId: "",
  });
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerResults, setOwnerResults] = useState<any[]>([]);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [expandedBusinessId, setExpandedBusinessId] = useState<string | null>(null);
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [editBusinessForm, setEditBusinessForm] = useState<any>({});
  const [savingBusinessId, setSavingBusinessId] = useState<string | null>(null);
  const [editOwnerSearch, setEditOwnerSearch] = useState("");
  const [editOwnerResults, setEditOwnerResults] = useState<any[]>([]);
  const [showEditOwnerDropdown, setShowEditOwnerDropdown] = useState(false);

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
    api.get<any>("/api/admin/accounting").then(setAccounting).catch(() => {});
  }, [user]);

  // Sales tab
  useEffect(() => {
    if (tab === "sales") {
      api.get<any>("/api/admin/sales").then(setSales).catch(() => {});
    }
  }, [tab]);

  // Activity tab
  useEffect(() => {
    if (tab !== "activity") return;
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (auditCategory) params.set("category", auditCategory);
      if (auditSearch) params.set("search", auditSearch);
      const qs = params.toString();
      api.get<{ logs: any[] }>(`/api/admin/audit${qs ? `?${qs}` : ""}`).then((d) => setAudit(d.logs)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [tab, auditCategory, auditSearch]);

  // Bookings tab
  useEffect(() => {
    if (tab !== "bookings") return;
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (bookingStatusFilter) params.set("status", bookingStatusFilter);
      if (bookingSearch) params.set("search", bookingSearch);
      const qs = params.toString();
      api.get<{ bookings: any[] }>(`/api/admin/bookings${qs ? `?${qs}` : ""}`).then((d) => setAdminBookings(d.bookings)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [tab, bookingStatusFilter, bookingSearch]);

  // Reviews tab
  useEffect(() => {
    if (tab !== "reviews") return;
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (reviewFilter) params.set("published", reviewFilter);
      if (reviewSearch) params.set("search", reviewSearch);
      const qs = params.toString();
      api.get<{ reviews: any[] }>(`/api/admin/reviews${qs ? `?${qs}` : ""}`).then((d) => setAdminReviews(d.reviews)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [tab, reviewFilter, reviewSearch]);

  // Categories — loaded once (used by the Categories tab AND the experience editor dropdown)
  useEffect(() => {
    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return;
    api.get<any[]>("/api/experiences/meta/categories").then(setCategories).catch(() => {});
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

  // Owner search for create business modal
  useEffect(() => {
    if (ownerSearch.length < 2) {
      setOwnerResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .get<{ users: any[] }>(`/api/admin/users?search=${ownerSearch}`)
        .then((d) => setOwnerResults(d.users || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [ownerSearch]);

  // Owner search for edit business
  useEffect(() => {
    if (editOwnerSearch.length < 2) {
      setEditOwnerResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .get<{ users: any[] }>(`/api/admin/users?search=${editOwnerSearch}`)
        .then((d) => setEditOwnerResults(d.users || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [editOwnerSearch]);

  // ─── User Handlers ───

  const handleCreateUser = async () => {
    setCreatingUser(true);
    try {
      const payload = {
        ...createUserForm,
        creditBalance: createUserForm.creditBalance * 100,
      };
      const newUser = await api.post<any>("/api/admin/users", payload);
      setUsers((prev) => [newUser, ...prev]);
      setShowCreateUser(false);
      setCreateUserForm({ email: "", password: "", firstName: "", lastName: "", role: "USER", creditBalance: 0 });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleViewUser = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserDetails(null);
      return;
    }
    setExpandedUserId(userId);
    setLoadingUserDetails(true);
    try {
      const details = await api.get<any>(`/api/admin/users/${userId}`);
      setUserDetails(details);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingUserDetails(false);
    }
  };

  const handleEditUser = (u: any) => {
    setEditingUserId(u.id);
    setEditUserForm({
      firstName: u.firstName || "",
      lastName: u.lastName || "",
      email: u.email || "",
      phone: u.phone || "",
      creditBalance: (u.creditBalance / 100),
    });
  };

  const handleSaveUser = async (userId: string) => {
    setSavingUserId(userId);
    try {
      const payload = {
        ...editUserForm,
        creditBalance: editUserForm.creditBalance * 100,
      };
      await api.put(`/api/admin/users/${userId}`, payload);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, ...editUserForm, creditBalance: editUserForm.creditBalance * 100 }
            : u
        )
      );
      setEditingUserId(null);
      setEditUserForm({});
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleAdjustCredits = async () => {
    if (!adjustUser) return;
    const amount = Math.round(parseFloat(adjustAmount) * 100); // credits → cents
    if (!Number.isInteger(amount) || amount === 0) { alert("Enter a non-zero credit amount"); return; }
    setAdjusting(true);
    try {
      const res = await api.post<{ balance: number }>("/api/credits/adjust", {
        userId: adjustUser.id,
        amount,
        description: adjustReason || undefined,
      });
      setUsers((prev) => prev.map((u) => (u.id === adjustUser.id ? { ...u, creditBalance: res.balance } : u)));
      setAdjustUser(null);
      setAdjustAmount("");
      setAdjustReason("");
      api.get<any>("/api/admin/accounting").then(setAccounting).catch(() => {});
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdjusting(false);
    }
  };

  const handleToggleUserActive = async (u: any) => {
    try {
      await api.put(`/api/admin/users/${u.id}`, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: !u.isActive } : x)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (expandedUserId === userId) {
        setExpandedUserId(null);
        setUserDetails(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ─── Business Handlers ───

  const handleCreateBusiness = async () => {
    setCreatingBusiness(true);
    try {
      const newBiz = await api.post<any>("/api/admin/businesses", createBusinessForm);
      setBusinesses((prev) => [newBiz, ...prev]);
      setShowCreateBusiness(false);
      setCreateBusinessForm({ name: "", description: "", phone: "", email: "", website: "", address: "", city: "", region: "", ownerId: "" });
      setOwnerSearch("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingBusiness(false);
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

  const handleEditBusiness = (b: any) => {
    setEditingBusinessId(b.id);
    setEditBusinessForm({
      name: b.name || "",
      description: b.description || "",
      phone: b.phone || "",
      email: b.email || "",
      website: b.website || "",
      address: b.address || "",
      city: b.city || "",
      region: b.region || "",
      ownerId: b.ownerId || b.owner?.id || "",
    });
    setEditOwnerSearch(b.owner ? `${b.owner.firstName} ${b.owner.lastName}` : "");
  };

  const handleSaveBusiness = async (id: string) => {
    setSavingBusinessId(id);
    try {
      await api.put(`/api/admin/businesses/${id}`, editBusinessForm);
      // Refetch businesses to get updated owner info
      api.get<any[]>("/api/admin/businesses").then(setBusinesses).catch(() => {});
      setEditingBusinessId(null);
      setEditBusinessForm({});
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingBusinessId(null);
    }
  };

  const handleDeleteBusiness = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this business? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/businesses/${id}`);
      setBusinesses((prev) => prev.filter((b) => b.id !== id));
      if (expandedBusinessId === id) setExpandedBusinessId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ─── Experience Handlers ───

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
        "costCredits",
        "costCurrency",
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

  // ─── Registration Handlers ───

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

  // ─── Booking / Review / Category Handlers ───

  const handleCancelBooking = async (id: string) => {
    if (!window.confirm("Cancel this booking and refund the customer's credits?")) return;
    try {
      await api.post(`/api/admin/bookings/${id}/cancel`);
      setAdminBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "CANCELLED" } : b)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleReview = async (r: any) => {
    try {
      await api.put(`/api/admin/reviews/${r.id}/publish`, { isPublished: !r.isPublished });
      setAdminReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, isPublished: !r.isPublished } : x)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("Delete this review permanently?")) return;
    try {
      await api.delete(`/api/admin/reviews/${id}`);
      setAdminReviews((prev) => prev.filter((x) => x.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const refreshCategories = () => api.get<any[]>("/api/experiences/meta/categories").then(setCategories).catch(() => {});

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;
    try {
      await api.post("/api/admin/categories", newCategory);
      setNewCategory({ name: "", description: "" });
      refreshCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveCategory = async (id: string) => {
    try {
      await api.put(`/api/admin/categories/${id}`, editCategoryForm);
      setEditingCategoryId(null);
      setEditCategoryForm({});
      refreshCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/api/admin/categories/${id}`);
      refreshCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (authLoading || !user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return null;

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const allTabs: Tab[] = ["stats", "sales", "activity", "bookings", "reviews", "users", "businesses", "experiences", "categories"];
  if (isSuperAdmin) allTabs.push("registrations");

  const inputClass =
    "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500";
  const labelClass = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-cedar-700" />
          <h1 className="font-display text-3xl font-bold text-gray-900">Admin Panel</h1>
          <span className={`badge ${isSuperAdmin ? "bg-wine-50 text-wine-700" : "bg-blue-50 text-blue-700"}`}>
            {isSuperAdmin ? "Super Admin" : "Admin"}
          </span>
          {!isSuperAdmin && (
            <span className="text-xs text-gray-400 hidden sm:inline">— some actions (roles, deletions, refunds, registrations) are limited to Super Admins</span>
          )}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {allTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition ${
                tab === t
                  ? "bg-cedar-700 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* ══════════════════════ Stats Tab ══════════════════════ */}
        {tab === "stats" && (
          <div className="space-y-8">
            {/* Platform counts */}
            {stats && (
              <div>
                <h2 className="font-display text-lg font-semibold text-gray-900 mb-3">Platform</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { label: "Users", value: stats.users, icon: <Users className="w-5 h-5" /> },
                    { label: "Businesses", value: stats.businesses, icon: <Building2 className="w-5 h-5" /> },
                    { label: "Experiences", value: stats.experiences, icon: <Package className="w-5 h-5" /> },
                    { label: "Bookings", value: stats.bookings, icon: <Calendar className="w-5 h-5" /> },
                    { label: "Credits Issued", value: `${(stats.totalCreditsCirculating / 100).toFixed(0)}`, icon: <Coins className="w-5 h-5" /> },
                    ...(stats.pendingRegistrations !== undefined
                      ? [{ label: "Pending Regs", value: stats.pendingRegistrations, icon: <FileText className="w-5 h-5" /> }]
                      : []),
                  ].map((s) => (
                    <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">{s.icon}{s.label}</div>
                      <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accounting */}
            {accounting && (
              <div>
                <h2 className="font-display text-lg font-semibold text-gray-900 mb-3">Accounting</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <AcctCard tone="cedar" icon={<DollarSign className="w-5 h-5" />} label="Gross revenue" primary={usd(accounting.grossRevenue.credits)} secondary={`${accounting.grossRevenue.transactions} purchases`} />
                  <AcctCard tone="blue" icon={<TrendingUp className="w-5 h-5" />} label="Redeemed on bookings" primary={usd(accounting.redeemedOnBookings.credits)} secondary={`${(accounting.bookingRevenue.credits / 100).toFixed(0)} cr realized`} />
                  <AcctCard tone="sunset" icon={<Gift className="w-5 h-5" />} label="Gifted out" primary={usd(accounting.giftedOut.credits)} secondary={`${usd(accounting.giftsClaimed.credits)} claimed`} />
                  <AcctCard tone="wine" icon={<Wallet className="w-5 h-5" />} label="Outstanding liability" primary={usd(accounting.outstandingLiability.credits)} secondary="unspent credits" />
                </div>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Credit flow by type</div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left px-5 py-2.5 font-medium">Type</th>
                        <th className="text-right px-5 py-2.5 font-medium">Transactions</th>
                        <th className="text-right px-5 py-2.5 font-medium">Net credits</th>
                        <th className="text-right px-5 py-2.5 font-medium">Net USD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {accounting.transactionFlow.map((t: any) => (
                        <tr key={t.type}>
                          <td className="px-5 py-2.5 capitalize">{t.type.toLowerCase().replace(/_/g, " ")}</td>
                          <td className="px-5 py-2.5 text-right text-gray-600">{t.count}</td>
                          <td className={`px-5 py-2.5 text-right font-medium ${t.credits >= 0 ? "text-cedar-700" : "text-red-600"}`}>{t.credits >= 0 ? "+" : ""}{t.credits.toLocaleString()}</td>
                          <td className="px-5 py-2.5 text-right text-gray-500">{usd(t.credits)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════ Sales Tab ══════════════════════ */}
        {tab === "sales" && (
          <div className="space-y-6">
            {!sales ? (
              <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">Loading sales…</div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <AcctCard tone="cedar" icon={<DollarSign className="w-5 h-5" />} label="Total revenue" primary={usd(sales.totals.revenueCredits)} secondary={`${sales.totals.orders} orders`} />
                  <AcctCard tone="blue" icon={<Users className="w-5 h-5" />} label="Units sold" primary={String(sales.totals.units)} secondary="guest tickets" />
                  <AcctCard tone="sunset" icon={<Package className="w-5 h-5" />} label="Experiences sold" primary={String(sales.topExperiences.length)} secondary="with ≥1 booking" />
                  <AcctCard tone="wine" icon={<Building2 className="w-5 h-5" />} label="Active sellers" primary={String(sales.byBusiness.length)} secondary="businesses" />
                </div>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">Top experiences by revenue</div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        <th className="text-left px-5 py-2.5 font-medium">Experience</th>
                        <th className="text-left px-5 py-2.5 font-medium">Business</th>
                        <th className="text-right px-5 py-2.5 font-medium">Units</th>
                        <th className="text-right px-5 py-2.5 font-medium">Orders</th>
                        <th className="text-right px-5 py-2.5 font-medium">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {sales.topExperiences.map((e: any) => (
                        <tr key={e.id}>
                          <td className="px-5 py-2.5 font-medium text-gray-900">{e.title}</td>
                          <td className="px-5 py-2.5 text-gray-500">{e.business || "—"}</td>
                          <td className="px-5 py-2.5 text-right font-semibold">{e.unitsSold}</td>
                          <td className="px-5 py-2.5 text-right text-gray-600">{e.bookings}</td>
                          <td className="px-5 py-2.5 text-right text-gray-900">{usd(e.revenueCredits)}</td>
                        </tr>
                      ))}
                      {sales.topExperiences.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400">No sales yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">By category</div>
                    <div className="divide-y divide-gray-50">
                      {sales.byCategory.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                          <span className="text-gray-700">{c.name}</span>
                          <span className="text-gray-500">{c.unitsSold} units · <span className="font-semibold text-gray-900">{usd(c.revenueCredits)}</span></span>
                        </div>
                      ))}
                      {sales.byCategory.length === 0 && <div className="px-5 py-6 text-center text-gray-400 text-sm">No data</div>}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-3 border-b border-gray-100 text-sm font-semibold text-gray-700">By business</div>
                    <div className="divide-y divide-gray-50">
                      {sales.byBusiness.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                          <span className="text-gray-700">{b.name}</span>
                          <span className="text-gray-500">{b.unitsSold} units · <span className="font-semibold text-gray-900">{usd(b.revenueCredits)}</span></span>
                        </div>
                      ))}
                      {sales.byBusiness.length === 0 && <div className="px-5 py-6 text-center text-gray-400 text-sm">No data</div>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════ Activity Tab ══════════════════════ */}
        {tab === "activity" && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search activity…"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500"
                />
              </div>
              <select
                value={auditCategory}
                onChange={(e) => setAuditCategory(e.target.value)}
                className="border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-cedar-500 bg-white text-sm"
              >
                <option value="">All categories</option>
                {["AUTH", "CREDIT", "GIFT", "BOOKING", "EXPERIENCE", "BUSINESS", "USER", "REGISTRATION"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">When</th>
                    <th className="text-left px-5 py-3 font-medium">Category</th>
                    <th className="text-left px-5 py-3 font-medium">Actor</th>
                    <th className="text-left px-5 py-3 font-medium">Action</th>
                    <th className="text-right px-5 py-3 font-medium">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {audit.map((log) => (
                    <tr key={log.id}>
                      <td className="px-5 py-3 text-gray-400 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{log.category}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{log.actorEmail || "system"}</td>
                      <td className="px-5 py-3 text-gray-800">{log.summary}</td>
                      <td className={`px-5 py-3 text-right font-medium ${log.amount == null ? "text-gray-300" : log.amount >= 0 ? "text-cedar-700" : "text-red-600"}`}>
                        {log.amount == null ? "—" : `${log.amount >= 0 ? "+" : ""}${log.amount.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {audit.length === 0 && <div className="p-10 text-center text-gray-400">No activity recorded yet.</div>}
            </div>
          </div>
        )}

        {/* ══════════════════════ Bookings Tab ══════════════════════ */}
        {tab === "bookings" && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search by customer or experience…" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500" />
              </div>
              <select value={bookingStatusFilter} onChange={(e) => setBookingStatusFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-cedar-500 bg-white text-sm">
                <option value="">All statuses</option>
                {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Customer</th>
                      <th className="text-left px-5 py-3 font-medium">Experience</th>
                      <th className="text-left px-5 py-3 font-medium">Date</th>
                      <th className="text-right px-5 py-3 font-medium">Guests</th>
                      <th className="text-right px-5 py-3 font-medium">Credits</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                      <th className="text-right px-5 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {adminBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900">{b.user?.firstName} {b.user?.lastName}</div>
                          <div className="text-xs text-gray-400">{b.user?.email}</div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-gray-900">{b.experience?.title}</div>
                          <div className="text-xs text-gray-400">{b.experience?.business?.name}</div>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{b.session?.startTime ? new Date(b.session.startTime).toLocaleDateString() : "—"}</td>
                        <td className="px-5 py-3 text-right">{b.participants}</td>
                        <td className="px-5 py-3 text-right">{(b.totalCredits / 100).toFixed(0)}</td>
                        <td className="px-5 py-3"><span className={`badge ${STATUS_BADGE[b.status] || "bg-gray-100 text-gray-600"}`}>{b.status}</span></td>
                        <td className="px-5 py-3 text-right">
                          {isSuperAdmin && ["CONFIRMED", "PENDING"].includes(b.status) ? (
                            <button onClick={() => handleCancelBooking(b.id)} className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg">Cancel & refund</button>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {adminBookings.length === 0 && <div className="p-10 text-center text-gray-400">No bookings found.</div>}
            </div>
          </div>
        )}

        {/* ══════════════════════ Reviews Tab ══════════════════════ */}
        {tab === "reviews" && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={reviewSearch} onChange={(e) => setReviewSearch(e.target.value)} placeholder="Search reviews…" className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500" />
              </div>
              <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)} className="border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-cedar-500 bg-white text-sm">
                <option value="">All reviews</option>
                <option value="true">Published</option>
                <option value="false">Hidden</option>
              </select>
            </div>
            <div className="space-y-3">
              {adminReviews.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`w-4 h-4 ${n <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`} />)}</div>
                        {!r.isPublished && <span className="badge bg-gray-100 text-gray-500">Hidden</span>}
                      </div>
                      <p className="text-sm text-gray-700">{r.comment || <span className="text-gray-400 italic">No comment</span>}</p>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {r.user?.firstName} {r.user?.lastName} · {r.experience?.title} · {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleToggleReview(r)} className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200" title={r.isPublished ? "Hide" : "Publish"}>
                        {r.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeleteReview(r.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {adminReviews.length === 0 && <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">No reviews found.</div>}
            </div>
          </div>
        )}

        {/* ══════════════════════ Categories Tab ══════════════════════ */}
        {tab === "categories" && (
          <div className="max-w-3xl">
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">Add category</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" value={newCategory.name} onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })} placeholder="Name" className={inputClass} />
                <input type="text" value={newCategory.description} onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })} placeholder="Description (optional)" className={inputClass} />
                <button onClick={handleCreateCategory} disabled={!newCategory.name.trim()} className="btn-primary text-sm !py-2.5 !px-4 whitespace-nowrap disabled:opacity-50"><Plus className="w-4 h-4 mr-1" /> Add</button>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {categories.map((c) => (
                <div key={c.id} className="p-4 flex items-center gap-4">
                  {editingCategoryId === c.id ? (
                    <>
                      <input value={editCategoryForm.name} onChange={(e) => setEditCategoryForm({ ...editCategoryForm, name: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1" />
                      <button onClick={() => handleSaveCategory(c.id)} className="p-1.5 rounded-lg bg-cedar-50 text-cedar-700"><Check className="w-4 h-4" /></button>
                      <button onClick={() => { setEditingCategoryId(null); setEditCategoryForm({}); }} className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.slug} · {c._count?.experiences ?? 0} experiences</p>
                      </div>
                      <button onClick={() => { setEditingCategoryId(c.id); setEditCategoryForm({ name: c.name, description: c.description || "" }); }} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"><Edit className="w-4 h-4" /></button>
                      {isSuperAdmin && (
                        <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title={c._count?.experiences ? "In use — cannot delete" : "Delete"}><Trash2 className="w-4 h-4" /></button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {categories.length === 0 && <div className="p-10 text-center text-gray-400">No categories yet.</div>}
            </div>
          </div>
        )}

        {/* ══════════════════════ Users Tab ══════════════════════ */}
        {tab === "users" && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500"
                />
              </div>
              {isSuperAdmin && (
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="btn-primary text-sm !py-3 !px-4 flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Create User
                </button>
              )}
            </div>

            {/* Create User Modal */}
            {showCreateUser && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-lg shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-bold text-gray-900">Create User</h2>
                    <button onClick={() => setShowCreateUser(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>First Name</label>
                      <input
                        type="text"
                        value={createUserForm.firstName}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, firstName: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Last Name</label>
                      <input
                        type="text"
                        value={createUserForm.lastName}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, lastName: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={createUserForm.email}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, email: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Password</label>
                      <input
                        type="password"
                        value={createUserForm.password}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, password: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Role</label>
                      <div className="relative">
                        <select
                          value={createUserForm.role}
                          onChange={(e) => setCreateUserForm((p) => ({ ...p, role: e.target.value }))}
                          className={`${inputClass} appearance-none pr-8`}
                        >
                          {["USER", "BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Credit Balance</label>
                      <input
                        type="number"
                        value={createUserForm.creditBalance}
                        onChange={(e) => setCreateUserForm((p) => ({ ...p, creditBalance: parseFloat(e.target.value) || 0 }))}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowCreateUser(false)}
                      className="btn-secondary text-sm !py-2 !px-4"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateUser}
                      disabled={creatingUser || !createUserForm.email || !createUserForm.password}
                      className="btn-primary text-sm !py-2 !px-4 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {creatingUser ? "Creating..." : "Create User"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium">Name</th>
                    <th className="text-left px-5 py-3 font-medium">Email</th>
                    <th className="text-left px-5 py-3 font-medium">Role</th>
                    <th className="text-left px-5 py-3 font-medium">Credits</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((u) => (
                    <tr key={u.id} className="group">
                      {/* Inline editing row */}
                      {editingUserId === u.id ? (
                        <>
                          <td className="px-5 py-3">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={editUserForm.firstName}
                                onChange={(e) => setEditUserForm((p: any) => ({ ...p, firstName: e.target.value }))}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-20 outline-none focus:ring-2 focus:ring-cedar-500"
                                placeholder="First"
                              />
                              <input
                                type="text"
                                value={editUserForm.lastName}
                                onChange={(e) => setEditUserForm((p: any) => ({ ...p, lastName: e.target.value }))}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-20 outline-none focus:ring-2 focus:ring-cedar-500"
                                placeholder="Last"
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <input
                              type="email"
                              value={editUserForm.email}
                              onChange={(e) => setEditUserForm((p: any) => ({ ...p, email: e.target.value }))}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-full outline-none focus:ring-2 focus:ring-cedar-500"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-lg">{u.role}</span>
                          </td>
                          <td className="px-5 py-3">
                            <input
                              type="number"
                              value={editUserForm.creditBalance}
                              onChange={(e) => setEditUserForm((p: any) => ({ ...p, creditBalance: parseFloat(e.target.value) || 0 }))}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-20 outline-none focus:ring-2 focus:ring-cedar-500"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                u.isActive ? "bg-cedar-50 text-cedar-700" : "bg-red-50 text-red-700"
                              }`}
                            >
                              {u.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSaveUser(u.id)}
                                disabled={savingUserId === u.id}
                                className="p-1.5 rounded-lg bg-cedar-50 text-cedar-700 hover:bg-cedar-100 transition disabled:opacity-50"
                                title="Save"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setEditingUserId(null); setEditUserForm({}); }}
                                className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-3 font-medium">
                            {u.firstName} {u.lastName}
                          </td>
                          <td className="px-5 py-3 text-gray-500">{u.email}</td>
                          <td className="px-5 py-3">
                            {isSuperAdmin ? (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium outline-none"
                              >
                                {["USER", "BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded-lg">{u.role}</span>
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
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleViewUser(u.id)}
                                className={`p-1.5 rounded-lg transition ${
                                  expandedUserId === u.id
                                    ? "bg-cedar-100 text-cedar-700"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {isSuperAdmin && (
                                <>
                                  <button
                                    onClick={() => handleEditUser(u)}
                                    className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => { setAdjustUser(u); setAdjustAmount(""); setAdjustReason(""); }}
                                    className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-cedar-100 hover:text-cedar-700 transition"
                                    title="Adjust credits"
                                  >
                                    <Coins className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserActive(u)}
                                    className={`p-1.5 rounded-lg transition text-xs font-medium ${
                                      u.isActive
                                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                                        : "bg-cedar-50 text-cedar-700 hover:bg-cedar-100"
                                    }`}
                                    title={u.isActive ? "Deactivate" : "Activate"}
                                  >
                                    {u.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="p-10 text-center text-gray-400">No users found.</div>
              )}
            </div>

            {/* Expanded User Details */}
            {expandedUserId && (
              <div className="mt-3 bg-white rounded-xl border border-gray-100 p-5">
                {loadingUserDetails ? (
                  <p className="text-sm text-gray-400">Loading user details...</p>
                ) : userDetails ? (
                  <div className="space-y-3">
                    <h3 className="font-display font-semibold text-gray-900">
                      {userDetails.firstName} {userDetails.lastName}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs font-medium mb-1">Businesses Owned</p>
                        {userDetails.businesses && userDetails.businesses.length > 0 ? (
                          <ul className="space-y-1">
                            {userDetails.businesses.map((b: any) => (
                              <li key={b.id} className="text-gray-700">{b.name}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-400">None</p>
                        )}
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium mb-1">Bookings</p>
                        <p className="text-gray-700">{userDetails._count?.bookings ?? userDetails.bookingCount ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-medium mb-1">Reviews</p>
                        <p className="text-gray-700">{userDetails._count?.reviews ?? userDetails.reviewCount ?? 0}</p>
                      </div>
                    </div>
                    {userDetails.phone && (
                      <p className="text-sm text-gray-500">Phone: {userDetails.phone}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Joined {new Date(userDetails.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No details available.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════ Businesses Tab ══════════════════════ */}
        {tab === "businesses" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-gray-900">All Businesses</h2>
              <button
                onClick={() => setShowCreateBusiness(true)}
                className="btn-primary text-sm !py-2.5 !px-4 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Business
              </button>
            </div>

            {/* Create Business Modal */}
            {showCreateBusiness && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-bold text-gray-900">Create Business</h2>
                    <button onClick={() => setShowCreateBusiness(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className={labelClass}>Name</label>
                      <input
                        type="text"
                        value={createBusinessForm.name}
                        onChange={(e) => setCreateBusinessForm((p) => ({ ...p, name: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Description</label>
                      <textarea
                        rows={3}
                        value={createBusinessForm.description}
                        onChange={(e) => setCreateBusinessForm((p) => ({ ...p, description: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input
                        type="text"
                        value={createBusinessForm.phone}
                        onChange={(e) => setCreateBusinessForm((p) => ({ ...p, phone: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={createBusinessForm.email}
                        onChange={(e) => setCreateBusinessForm((p) => ({ ...p, email: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Website</label>
                      <input
                        type="text"
                        value={createBusinessForm.website}
                        onChange={(e) => setCreateBusinessForm((p) => ({ ...p, website: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>Address</label>
                      <input
                        type="text"
                        value={createBusinessForm.address}
                        onChange={(e) => setCreateBusinessForm((p) => ({ ...p, address: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>City</label>
                      <input
                        type="text"
                        value={createBusinessForm.city}
                        onChange={(e) => setCreateBusinessForm((p) => ({ ...p, city: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Region</label>
                      <input
                        type="text"
                        value={createBusinessForm.region}
                        onChange={(e) => setCreateBusinessForm((p) => ({ ...p, region: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2 relative">
                      <label className={labelClass}>Owner (search by name or email)</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={ownerSearch}
                          onChange={(e) => {
                            setOwnerSearch(e.target.value);
                            setShowOwnerDropdown(true);
                          }}
                          onFocus={() => setShowOwnerDropdown(true)}
                          placeholder="Search users..."
                          className={`${inputClass} pl-9`}
                        />
                      </div>
                      {showOwnerDropdown && ownerResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                          {ownerResults.map((ou) => (
                            <button
                              key={ou.id}
                              onClick={() => {
                                setCreateBusinessForm((p) => ({ ...p, ownerId: ou.id }));
                                setOwnerSearch(`${ou.firstName} ${ou.lastName} (${ou.email})`);
                                setShowOwnerDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-cedar-50 transition"
                            >
                              {ou.firstName} {ou.lastName} · {ou.email}
                            </button>
                          ))}
                        </div>
                      )}
                      {createBusinessForm.ownerId && (
                        <p className="text-xs text-cedar-600 mt-1">Owner selected</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowCreateBusiness(false)}
                      className="btn-secondary text-sm !py-2 !px-4"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateBusiness}
                      disabled={creatingBusiness || !createBusinessForm.name || !createBusinessForm.ownerId}
                      className="btn-primary text-sm !py-2 !px-4 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {creatingBusiness ? "Creating..." : "Create Business"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Businesses List */}
            <div className="space-y-4">
              {businesses.map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* Business Row */}
                  <div className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cedar-50 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-cedar-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{b.name}</h3>
                        {b.isVerified && (
                          <span className="text-xs bg-cedar-50 text-cedar-700 px-2 py-0.5 rounded-full font-medium">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Owner: {b.owner?.firstName} {b.owner?.lastName} · {b.city || "No city"} · {b._count?.experiences ?? 0} experiences
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          setExpandedBusinessId(expandedBusinessId === b.id ? null : b.id)
                        }
                        className={`p-2 rounded-lg transition ${
                          expandedBusinessId === b.id
                            ? "bg-cedar-100 text-cedar-700"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title="Expand"
                      >
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${
                            expandedBusinessId === b.id ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {!b.isVerified && (
                        <button
                          onClick={() => handleVerifyBusiness(b.id)}
                          className="btn-primary text-xs !py-2 !px-3"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => handleEditBusiness(b)}
                        className="p-2 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {isSuperAdmin && (
                        <button
                          onClick={() => handleDeleteBusiness(b.id)}
                          className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details / Edit */}
                  {expandedBusinessId === b.id && editingBusinessId !== b.id && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs font-medium mb-1">Owner</p>
                          <p className="text-gray-700">{b.owner?.firstName} {b.owner?.lastName} ({b.owner?.email})</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-medium mb-1">Phone</p>
                          <p className="text-gray-700">{b.phone || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-medium mb-1">Email</p>
                          <p className="text-gray-700">{b.email || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-medium mb-1">Website</p>
                          <p className="text-gray-700">{b.website || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-medium mb-1">Address</p>
                          <p className="text-gray-700">{b.address || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs font-medium mb-1">City / Region</p>
                          <p className="text-gray-700">{b.city || "N/A"} · {b.region || "N/A"}</p>
                        </div>
                        {b.description && (
                          <div className="md:col-span-2">
                            <p className="text-gray-500 text-xs font-medium mb-1">Description</p>
                            <p className="text-gray-700">{b.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Edit Business Form */}
                  {editingBusinessId === b.id && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>Name</label>
                          <input
                            type="text"
                            value={editBusinessForm.name}
                            onChange={(e) => setEditBusinessForm((p: any) => ({ ...p, name: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Phone</label>
                          <input
                            type="text"
                            value={editBusinessForm.phone}
                            onChange={(e) => setEditBusinessForm((p: any) => ({ ...p, phone: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Email</label>
                          <input
                            type="email"
                            value={editBusinessForm.email}
                            onChange={(e) => setEditBusinessForm((p: any) => ({ ...p, email: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Website</label>
                          <input
                            type="text"
                            value={editBusinessForm.website}
                            onChange={(e) => setEditBusinessForm((p: any) => ({ ...p, website: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Description</label>
                          <textarea
                            rows={2}
                            value={editBusinessForm.description}
                            onChange={(e) => setEditBusinessForm((p: any) => ({ ...p, description: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Address</label>
                          <input
                            type="text"
                            value={editBusinessForm.address}
                            onChange={(e) => setEditBusinessForm((p: any) => ({ ...p, address: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>City</label>
                          <input
                            type="text"
                            value={editBusinessForm.city}
                            onChange={(e) => setEditBusinessForm((p: any) => ({ ...p, city: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Region</label>
                          <input
                            type="text"
                            value={editBusinessForm.region}
                            onChange={(e) => setEditBusinessForm((p: any) => ({ ...p, region: e.target.value }))}
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2 relative">
                          <label className={labelClass}>Owner (search to change)</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              value={editOwnerSearch}
                              onChange={(e) => {
                                setEditOwnerSearch(e.target.value);
                                setShowEditOwnerDropdown(true);
                              }}
                              onFocus={() => setShowEditOwnerDropdown(true)}
                              placeholder="Search users..."
                              className={`${inputClass} pl-9`}
                            />
                          </div>
                          {showEditOwnerDropdown && editOwnerResults.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                              {editOwnerResults.map((ou) => (
                                <button
                                  key={ou.id}
                                  onClick={() => {
                                    setEditBusinessForm((p: any) => ({ ...p, ownerId: ou.id }));
                                    setEditOwnerSearch(`${ou.firstName} ${ou.lastName} (${ou.email})`);
                                    setShowEditOwnerDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-cedar-50 transition"
                                >
                                  {ou.firstName} {ou.lastName} · {ou.email}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setEditingBusinessId(null);
                            setEditBusinessForm({});
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition flex items-center gap-1"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveBusiness(b.id)}
                          disabled={savingBusinessId === b.id}
                          className="btn-primary text-sm !py-2 !px-4 flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          {savingBusinessId === b.id ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {businesses.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
                  No businesses found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════ Experiences Tab ══════════════════════ */}
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
                          <label className={labelClass}>Title</label>
                          <input
                            type="text"
                            value={editingExp.title || ""}
                            onChange={(e) => handleExpFieldChange("title", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Short Description</label>
                          <input
                            type="text"
                            value={editingExp.shortDescription || ""}
                            onChange={(e) => handleExpFieldChange("shortDescription", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className={labelClass}>Description</label>
                          <textarea
                            rows={3}
                            value={editingExp.description || ""}
                            onChange={(e) => handleExpFieldChange("description", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Highlights (JSON array)</label>
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
                          <label className={labelClass}>Includes (JSON array)</label>
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
                          <label className={labelClass}>What To Bring (JSON array)</label>
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
                          <label className={labelClass}>Price (Credits)</label>
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
                          <label className={labelClass}>Price (Currency)</label>
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
                          <label className={labelClass}>Cost (Credits)</label>
                          <input
                            type="number"
                            value={editingExp.costCredits ?? ""}
                            onChange={(e) =>
                              handleExpFieldChange("costCredits", parseInt(e.target.value) || 0)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Cost (Currency)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingExp.costCurrency ?? ""}
                            onChange={(e) =>
                              handleExpFieldChange("costCurrency", parseFloat(e.target.value) || 0)
                            }
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Duration (minutes)</label>
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
                          <label className={labelClass}>Max Participants</label>
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
                          <label className={labelClass}>Min Participants</label>
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
                          <label className={labelClass}>Difficulty</label>
                          <input
                            type="text"
                            value={editingExp.difficulty || ""}
                            onChange={(e) => handleExpFieldChange("difficulty", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Min Age</label>
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
                          <label className={labelClass}>Address</label>
                          <input
                            type="text"
                            value={editingExp.address || ""}
                            onChange={(e) => handleExpFieldChange("address", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>City</label>
                          <input
                            type="text"
                            value={editingExp.city || ""}
                            onChange={(e) => handleExpFieldChange("city", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Region</label>
                          <input
                            type="text"
                            value={editingExp.region || ""}
                            onChange={(e) => handleExpFieldChange("region", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Cover Image URL</label>
                          <input
                            type="text"
                            value={editingExp.coverImage || ""}
                            onChange={(e) => handleExpFieldChange("coverImage", e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Category</label>
                          <div className="relative">
                            <select
                              value={editingExp.categoryId || ""}
                              onChange={(e) => handleExpFieldChange("categoryId", e.target.value)}
                              className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-cedar-500 bg-white"
                            >
                              <option value="">Select category…</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Status</label>
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
                          <label className={labelClass}>Featured</label>
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

        {/* ══════════════════════ Registrations Tab (SUPER_ADMIN only) ══════════════════════ */}
        {tab === "registrations" && isSuperAdmin && (
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

        {/* ══════════════════════ Credit Adjustment Modal ══════════════════════ */}
        {adjustUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-gray-900">Adjust credits</h2>
                <button onClick={() => setAdjustUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                {adjustUser.firstName} {adjustUser.lastName} · current balance{" "}
                <span className="font-semibold text-gray-800">{(adjustUser.creditBalance / 100).toFixed(0)} credits</span>
              </p>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amount (credits — use a minus sign to deduct)</label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="e.g. 50 or -20"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500 mb-3"
              />
              <label className="block text-xs font-medium text-gray-500 mb-1">Reason (optional)</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. goodwill credit"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cedar-500"
              />
              <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-200">
                <button onClick={() => setAdjustUser(null)} className="btn-secondary text-sm !py-2 !px-4">Cancel</button>
                <button onClick={handleAdjustCredits} disabled={adjusting || !adjustAmount} className="btn-primary text-sm !py-2 !px-4 flex items-center gap-1 disabled:opacity-50">
                  <Check className="w-4 h-4" /> {adjusting ? "Applying…" : "Apply"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AcctCard({ icon, tone, label, primary, secondary }: { icon: React.ReactNode; tone: "cedar" | "sunset" | "blue" | "wine"; label: string; primary: string; secondary: string }) {
  const tones: Record<string, string> = {
    cedar: "bg-cedar-50 text-cedar-700",
    sunset: "bg-sunset-50 text-sunset-600",
    blue: "bg-blue-50 text-blue-600",
    wine: "bg-wine-50 text-wine-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tones[tone]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{primary}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label} · {secondary}</p>
    </div>
  );
}
