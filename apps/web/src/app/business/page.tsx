"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  MapPin,
  Package,
  Edit,
  Trash2,
  Upload,
  Image,
  ArrowLeft,
  Star,
  Check,
  X,
} from "lucide-react";
import { api } from "@/lib/api";

/* ---------- file upload helper ---------- */
const uploadFile = async (file: File, folder: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  const token = localStorage.getItem("accessToken");
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:10000"}/api/uploads`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  );
  if (!res.ok) throw new Error("Upload failed");
  return res.json() as Promise<{ url: string; key: string }>;
};

/* ---------- types ---------- */
interface Business {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  isVerified: boolean;
  _count?: { experiences: number };
}

interface ExperienceImage {
  id: string;
  url: string;
  alt?: string;
  sortOrder?: number;
}

interface Experience {
  id: string;
  title: string;
  shortDescription?: string;
  description?: string;
  highlights?: string[];
  includes?: string[];
  whatToBring?: string[];
  priceCredits?: number;
  priceCurrency?: number;
  duration?: number;
  maxParticipants?: number;
  minParticipants?: number;
  difficulty?: string;
  minAge?: number;
  address?: string;
  city?: string;
  region?: string;
  categoryId?: string;
  coverImage?: string;
  status: string;
  images?: ExperienceImage[];
}

interface Category {
  id: string;
  name: string;
}

const EMPTY_EXP_FORM = {
  title: "",
  shortDescription: "",
  description: "",
  highlights: "",
  includes: "",
  whatToBring: "",
  priceCredits: "",
  priceCurrency: "",
  duration: "",
  maxParticipants: "",
  minParticipants: "",
  difficulty: "EASY",
  minAge: "",
  address: "",
  city: "",
  region: "",
  categoryId: "",
  coverImage: "",
  status: "DRAFT",
};

type ExpForm = typeof EMPTY_EXP_FORM;

const inputCls =
  "w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500 text-sm";

/* ======================================================================== */
export default function BusinessPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  /* --- top-level state --- */
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [bizForm, setBizForm] = useState({
    name: "",
    description: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    region: "",
  });
  const [creating, setCreating] = useState(false);

  /* --- experience state --- */
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showExpForm, setShowExpForm] = useState(false);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [expForm, setExpForm] = useState<ExpForm>({ ...EMPTY_EXP_FORM });
  const [savingExp, setSavingExp] = useState(false);

  /* --- image state (inline in edit form) --- */
  const [uploadingImage, setUploadingImage] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  /* ---- auth guard ---- */
  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  /* ---- fetch businesses ---- */
  useEffect(() => {
    if (!user) return;
    api.get<Business[]>("/api/businesses/mine").then(setBusinesses).catch(() => {});
  }, [user]);

  /* ---- fetch experiences when business selected ---- */
  useEffect(() => {
    if (!selectedBiz) {
      setExperiences([]);
      return;
    }
    api
      .get<Experience[]>(`/api/businesses/${selectedBiz.id}/experiences`)
      .then(setExperiences)
      .catch(() => {});
  }, [selectedBiz]);

  /* ---- fetch categories once ---- */
  useEffect(() => {
    api.get<Category[]>("/api/experiences/meta/categories").then(setCategories).catch(() => {});
  }, []);

  /* ================================================================ */
  /* Business CRUD                                                     */
  /* ================================================================ */
  const handleCreateBiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const biz = await api.post<Business>("/api/businesses", bizForm);
      setBusinesses((prev) => [...prev, biz]);
      setShowCreate(false);
      setBizForm({ name: "", description: "", phone: "", email: "", address: "", city: "", region: "" });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  /* ================================================================ */
  /* Experience helpers                                                */
  /* ================================================================ */
  const openAddExp = () => {
    setEditingExp(null);
    setExpForm({ ...EMPTY_EXP_FORM });
    setShowExpForm(true);
  };

  const openEditExp = (exp: Experience) => {
    setEditingExp(exp);
    setExpForm({
      title: exp.title || "",
      shortDescription: exp.shortDescription || "",
      description: exp.description || "",
      highlights: (exp.highlights || []).join(", "),
      includes: (exp.includes || []).join(", "),
      whatToBring: (exp.whatToBring || []).join(", "),
      priceCredits: exp.priceCredits != null ? String(exp.priceCredits) : "",
      priceCurrency: exp.priceCurrency != null ? String(exp.priceCurrency) : "",
      duration: exp.duration != null ? String(exp.duration) : "",
      maxParticipants: exp.maxParticipants != null ? String(exp.maxParticipants) : "",
      minParticipants: exp.minParticipants != null ? String(exp.minParticipants) : "",
      difficulty: exp.difficulty || "EASY",
      minAge: exp.minAge != null ? String(exp.minAge) : "",
      address: exp.address || "",
      city: exp.city || "",
      region: exp.region || "",
      categoryId: exp.categoryId || "",
      coverImage: exp.coverImage || "",
      status: exp.status || "DRAFT",
    });
    setShowExpForm(true);
  };

  const buildExpPayload = () => {
    const split = (s: string) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    return {
      title: expForm.title,
      shortDescription: expForm.shortDescription || undefined,
      description: expForm.description || undefined,
      highlights: split(expForm.highlights),
      includes: split(expForm.includes),
      whatToBring: split(expForm.whatToBring),
      priceCredits: expForm.priceCredits ? Number(expForm.priceCredits) : undefined,
      priceCurrency: expForm.priceCurrency ? Number(expForm.priceCurrency) : undefined,
      duration: expForm.duration ? Number(expForm.duration) : undefined,
      maxParticipants: expForm.maxParticipants ? Number(expForm.maxParticipants) : undefined,
      minParticipants: expForm.minParticipants ? Number(expForm.minParticipants) : undefined,
      difficulty: expForm.difficulty || undefined,
      minAge: expForm.minAge ? Number(expForm.minAge) : undefined,
      address: expForm.address || undefined,
      city: expForm.city || undefined,
      region: expForm.region || undefined,
      categoryId: expForm.categoryId || undefined,
      coverImage: expForm.coverImage || undefined,
      status: expForm.status || undefined,
    };
  };

  const handleSaveExp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz) return;
    const payload = buildExpPayload();
    if (!editingExp) {
      // Validate required fields for create
      if (!payload.duration) { alert("Duration is required"); return; }
      if (!payload.maxParticipants) { alert("Max participants is required"); return; }
      if (!payload.address) { alert("Address is required"); return; }
      if (!payload.city) { alert("City is required"); return; }
      if (!payload.region) { alert("Region is required"); return; }
      if (!payload.categoryId) { alert("Category is required"); return; }
      if (!payload.priceCredits) { alert("Price (credits) is required"); return; }
      if (!payload.priceCurrency) { alert("Price (currency) is required"); return; }
    }
    setSavingExp(true);
    try {
      if (editingExp) {
        const updated = await api.put<Experience>(
          `/api/businesses/${selectedBiz.id}/experiences/${editingExp.id}`,
          payload
        );
        setExperiences((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } else {
        const created = await api.post<Experience>(
          `/api/businesses/${selectedBiz.id}/experiences`,
          payload
        );
        setExperiences((prev) => [...prev, created]);
      }
      setShowExpForm(false);
      setEditingExp(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingExp(false);
    }
  };

  const handleDeleteExp = async (exp: Experience) => {
    if (!selectedBiz) return;
    if (!confirm(`Delete "${exp.title}"?`)) return;
    try {
      await api.delete(`/api/businesses/${selectedBiz.id}/experiences/${exp.id}`);
      setExperiences((prev) => prev.filter((x) => x.id !== exp.id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  /* ================================================================ */
  /* Image helpers (work with editingExp inline in the form)           */
  /* ================================================================ */
  const handleSetCover = async (url: string) => {
    if (!selectedBiz || !editingExp) return;
    try {
      await api.put(`/api/businesses/${selectedBiz.id}/experiences/${editingExp.id}`, { coverImage: url });
      setExpForm((prev) => ({ ...prev, coverImage: url }));
      setEditingExp((prev) => (prev ? { ...prev, coverImage: url } : prev));
      setExperiences((prev) => prev.map((x) => (x.id === editingExp.id ? { ...x, coverImage: url } : x)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadGalleryImage = async (file: File) => {
    if (!selectedBiz || !editingExp) return;
    setUploadingImage(true);
    try {
      const { url } = await uploadFile(file, "experiences");
      const img = await api.post<ExperienceImage>(
        `/api/businesses/${selectedBiz.id}/experiences/${editingExp.id}/images`,
        { url, alt: file.name, sortOrder: (editingExp.images?.length || 0) }
      );
      // Auto-set as cover if none exists
      const shouldSetCover = !editingExp.coverImage && !expForm.coverImage;
      if (shouldSetCover) {
        await api.put(`/api/businesses/${selectedBiz.id}/experiences/${editingExp.id}`, { coverImage: url });
        setExpForm((prev) => ({ ...prev, coverImage: url }));
      }
      const updatedExp = {
        ...editingExp,
        images: [...(editingExp.images || []), img],
        ...(shouldSetCover ? { coverImage: url } : {}),
      };
      setEditingExp(updatedExp);
      setExperiences((prev) => prev.map((x) => (x.id === editingExp.id ? updatedExp : x)));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imgId: string, imgUrl: string) => {
    if (!selectedBiz || !editingExp) return;
    try {
      await api.delete(`/api/businesses/${selectedBiz.id}/experiences/${editingExp.id}/images/${imgId}`);
      const updatedImages = (editingExp.images || []).filter((i) => i.id !== imgId);
      // If deleted image was the cover, clear it
      const wasCover = expForm.coverImage === imgUrl;
      if (wasCover) {
        await api.put(`/api/businesses/${selectedBiz.id}/experiences/${editingExp.id}`, { coverImage: null });
        setExpForm((prev) => ({ ...prev, coverImage: "" }));
      }
      const updatedExp = { ...editingExp, images: updatedImages, ...(wasCover ? { coverImage: undefined } : {}) };
      setEditingExp(updatedExp);
      setExperiences((prev) => prev.map((x) => (x.id === editingExp.id ? { ...x, images: updatedImages, ...(wasCover ? { coverImage: undefined } : {}) } : x)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const { url } = await uploadFile(file, "experiences");
      setExpForm((prev) => ({ ...prev, coverImage: url }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingCover(false);
    }
  };

  /* ================================================================ */
  /* Render guards                                                     */
  /* ================================================================ */
  if (authLoading || !user) return null;

  const statusColor = (s: string) => {
    switch (s) {
      case "ACTIVE":
        return "bg-green-50 text-green-700";
      case "PAUSED":
        return "bg-yellow-50 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  /* ================================================================ */
  /* RENDER: Experience form modal                                     */
  /* ================================================================ */
  const renderExpForm = () => {
    if (!showExpForm) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900 font-display">
              {editingExp ? "Edit Experience" : "Add Experience"}
            </h2>
            <button
              onClick={() => {
                setShowExpForm(false);
                setEditingExp(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSaveExp} className="space-y-4">
            <input
              type="text"
              value={expForm.title}
              onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
              className={inputCls}
              placeholder="Title"
              required
            />
            <input
              type="text"
              value={expForm.shortDescription}
              onChange={(e) => setExpForm({ ...expForm, shortDescription: e.target.value })}
              className={inputCls}
              placeholder="Short description"
            />
            <textarea
              value={expForm.description}
              onChange={(e) => setExpForm({ ...expForm, description: e.target.value })}
              className={`${inputCls} h-24 resize-none`}
              placeholder="Full description"
            />
            <input
              type="text"
              value={expForm.highlights}
              onChange={(e) => setExpForm({ ...expForm, highlights: e.target.value })}
              className={inputCls}
              placeholder="Highlights (comma-separated)"
            />
            <input
              type="text"
              value={expForm.includes}
              onChange={(e) => setExpForm({ ...expForm, includes: e.target.value })}
              className={inputCls}
              placeholder="Includes (comma-separated)"
            />
            <input
              type="text"
              value={expForm.whatToBring}
              onChange={(e) => setExpForm({ ...expForm, whatToBring: e.target.value })}
              className={inputCls}
              placeholder="What to bring (comma-separated)"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={expForm.priceCredits}
                onChange={(e) => setExpForm({ ...expForm, priceCredits: e.target.value })}
                className={inputCls}
                placeholder="Price (credits)"
              />
              <input
                type="number"
                value={expForm.priceCurrency}
                onChange={(e) => setExpForm({ ...expForm, priceCurrency: e.target.value })}
                className={inputCls}
                placeholder="Price (currency)"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <input
                type="number"
                value={expForm.duration}
                onChange={(e) => setExpForm({ ...expForm, duration: e.target.value })}
                className={inputCls}
                placeholder="Duration (min)"
              />
              <input
                type="number"
                value={expForm.minParticipants}
                onChange={(e) => setExpForm({ ...expForm, minParticipants: e.target.value })}
                className={inputCls}
                placeholder="Min participants"
              />
              <input
                type="number"
                value={expForm.maxParticipants}
                onChange={(e) => setExpForm({ ...expForm, maxParticipants: e.target.value })}
                className={inputCls}
                placeholder="Max participants"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <select
                value={expForm.difficulty}
                onChange={(e) => setExpForm({ ...expForm, difficulty: e.target.value })}
                className={inputCls}
              >
                <option value="EASY">Easy</option>
                <option value="MODERATE">Moderate</option>
                <option value="CHALLENGING">Challenging</option>
              </select>
              <input
                type="number"
                value={expForm.minAge}
                onChange={(e) => setExpForm({ ...expForm, minAge: e.target.value })}
                className={inputCls}
                placeholder="Min age"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                value={expForm.address}
                onChange={(e) => setExpForm({ ...expForm, address: e.target.value })}
                className={inputCls}
                placeholder="Address"
              />
              <input
                type="text"
                value={expForm.city}
                onChange={(e) => setExpForm({ ...expForm, city: e.target.value })}
                className={inputCls}
                placeholder="City"
              />
              <input
                type="text"
                value={expForm.region}
                onChange={(e) => setExpForm({ ...expForm, region: e.target.value })}
                className={inputCls}
                placeholder="Region"
              />
            </div>

            <select
              value={expForm.categoryId}
              onChange={(e) => setExpForm({ ...expForm, categoryId: e.target.value })}
              className={inputCls}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* status */}
            {editingExp && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <div className="flex gap-2">
                  {["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setExpForm({ ...expForm, status: s })}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        expForm.status === s
                          ? s === "ACTIVE" ? "bg-green-600 text-white" :
                            s === "DRAFT" ? "bg-gray-600 text-white" :
                            s === "PAUSED" ? "bg-yellow-500 text-white" :
                            "bg-red-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* images section */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Images</label>
                {editingExp && (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="text-sm text-cedar-600 hover:text-cedar-700 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingImage ? "Uploading..." : "Add image"}
                  </button>
                )}
              </div>

              {/* gallery grid (only when editing existing experience) */}
              {editingExp && (editingExp.images?.length || 0) > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {editingExp.images!.map((img) => {
                    const isCover = expForm.coverImage === img.url;
                    return (
                      <div key={img.id} className={`relative group rounded-lg overflow-hidden border-2 ${isCover ? "border-cedar-500" : "border-gray-200"}`}>
                        <img src={img.url} alt={img.alt || ""} className="w-full h-20 object-cover" />
                        {isCover && (
                          <span className="absolute top-0.5 left-0.5 bg-cedar-600 text-white text-[9px] font-bold px-1 py-0.5 rounded">
                            COVER
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          {!isCover && (
                            <button type="button" onClick={() => handleSetCover(img.url)}
                              className="bg-white text-gray-700 rounded p-1" title="Set as cover">
                              <Star className="w-3 h-3" />
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteImage(img.id, img.url)}
                            className="bg-red-500 text-white rounded p-1" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {editingExp && (!editingExp.images || editingExp.images.length === 0) && (
                <p className="text-xs text-gray-400 mb-3">No images yet. Upload to add to gallery.</p>
              )}

              {/* cover image preview / upload (for new experience or standalone cover) */}
              {!editingExp && (
                <>
                  {expForm.coverImage ? (
                    <div className="relative group rounded-xl overflow-hidden border border-gray-200">
                      <img src={expForm.coverImage} alt="Cover preview" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button type="button" onClick={() => coverInputRef.current?.click()}
                          className="bg-white text-gray-700 rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5">
                          <Upload className="w-4 h-4" /> Replace
                        </button>
                        <button type="button" onClick={() => setExpForm({ ...expForm, coverImage: "" })}
                          className="bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm font-medium flex items-center gap-1.5">
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
                      className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-cedar-400 hover:text-cedar-600 transition-colors disabled:opacity-50">
                      <Upload className="w-6 h-6" />
                      <span className="text-sm font-medium">{uploadingCover ? "Uploading..." : "Upload cover image"}</span>
                    </button>
                  )}
                </>
              )}

              {/* hidden file inputs */}
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }} />
              <input ref={galleryInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadGalleryImage(f); e.target.value = ""; }} />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExpForm(false);
                  setEditingExp(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingExp}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {savingExp ? "Saving..." : editingExp ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  /* ================================================================ */
  /* RENDER: Business management view                                  */
  /* ================================================================ */
  if (selectedBiz) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* back button */}
          <button
            onClick={() => {
              setSelectedBiz(null);
              setShowExpForm(false);
              setEditingExp(null);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to businesses
          </button>

          {/* business header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-cedar-50 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-cedar-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl font-bold text-gray-900 truncate">
                    {selectedBiz.name}
                  </h1>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 ${
                      selectedBiz.isVerified
                        ? "bg-cedar-50 text-cedar-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {selectedBiz.isVerified ? "Verified" : "Pending"}
                  </span>
                </div>
                {selectedBiz.city && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {selectedBiz.city}
                    {selectedBiz.region ? `, ${selectedBiz.region}` : ""}
                  </p>
                )}
                {selectedBiz.description && (
                  <p className="text-sm text-gray-600 mt-2">{selectedBiz.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* experiences section */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-gray-900">Experiences</h2>
            <button onClick={openAddExp} className="btn-primary text-sm !py-2.5">
              <Plus className="w-4 h-4 mr-1" /> Add Experience
            </button>
          </div>

          {experiences.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">No experiences yet. Add one to get started.</p>
            </div>
          )}

          <div className="space-y-3">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="bg-white rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-start gap-4">
                  {/* cover thumbnail */}
                  {exp.coverImage ? (
                    <img
                      src={exp.coverImage}
                      alt={exp.title}
                      className="w-20 h-20 rounded-xl object-cover shrink-0 border border-gray-100"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <Image className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{exp.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColor(exp.status)}`}
                      >
                        {exp.status}
                      </span>
                    </div>
                    {exp.shortDescription && (
                      <p className="text-sm text-gray-500 line-clamp-1">{exp.shortDescription}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      {exp.priceCredits != null && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5" /> {exp.priceCredits} credits
                        </span>
                      )}
                      {exp.priceCurrency != null && <span>${exp.priceCurrency}</span>}
                      {exp.duration != null && <span>{exp.duration} min</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditExp(exp)}
                      className="p-2 text-gray-400 hover:text-cedar-600 hover:bg-cedar-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExp(exp)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* inline image thumbnails */}
                {exp.images && exp.images.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {exp.images.map((img) => (
                      <div key={img.id} className="relative shrink-0">
                        <img
                          src={img.url}
                          alt={img.alt || ""}
                          className={`w-16 h-16 rounded-lg object-cover border-2 ${exp.coverImage === img.url ? "border-cedar-500" : "border-gray-100"}`}
                        />
                        {exp.coverImage === img.url && (
                          <span className="absolute -top-1 -right-1 bg-cedar-600 text-white rounded-full p-0.5">
                            <Star className="w-2.5 h-2.5 fill-current" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {renderExpForm()}
      </div>
    );
  }

  /* ================================================================ */
  /* RENDER: Business list view                                        */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-bold text-gray-900">My Businesses</h1>
          {(user.role === "BUSINESS_OWNER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm !py-2.5">
              <Plus className="w-4 h-4 mr-1" /> Add Business
            </button>
          )}
        </div>

        {user.role === "USER" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Want to list your business?
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Contact us to become a business owner and list your experiences.
            </p>
          </div>
        )}

        {businesses.length > 0 && (
          <div className="space-y-4">
            {businesses.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBiz(b)}
                className="w-full text-left bg-white rounded-xl border border-gray-200 p-6 hover:border-cedar-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-cedar-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-cedar-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900">{b.name}</h3>
                    {b.city && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" /> {b.city}
                        {b.region ? `, ${b.region}` : ""}
                      </p>
                    )}
                    {b.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{b.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" /> {b._count?.experiences || 0} experiences
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          b.isVerified ? "bg-cedar-50 text-cedar-700" : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {b.isVerified ? "Verified" : "Pending verification"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {businesses.length === 0 &&
          user.role !== "USER" && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-500">
                You have no businesses yet. Click "Add Business" to get started.
              </p>
            </div>
          )}

        {/* Create business modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900 font-display">Add New Business</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateBiz} className="space-y-4">
                <input
                  type="text"
                  value={bizForm.name}
                  onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                  className={inputCls}
                  placeholder="Business Name"
                  required
                />
                <textarea
                  value={bizForm.description}
                  onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })}
                  className={`${inputCls} h-20 resize-none`}
                  placeholder="Description"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={bizForm.city}
                    onChange={(e) => setBizForm({ ...bizForm, city: e.target.value })}
                    className={inputCls}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={bizForm.region}
                    onChange={(e) => setBizForm({ ...bizForm, region: e.target.value })}
                    className={inputCls}
                    placeholder="Region"
                  />
                </div>
                <input
                  type="text"
                  value={bizForm.address}
                  onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })}
                  className={inputCls}
                  placeholder="Address"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="tel"
                    value={bizForm.phone}
                    onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })}
                    className={inputCls}
                    placeholder="Phone"
                  />
                  <input
                    type="email"
                    value={bizForm.email}
                    onChange={(e) => setBizForm({ ...bizForm, email: e.target.value })}
                    className={inputCls}
                    placeholder="Email"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={creating} className="btn-primary flex-1 disabled:opacity-50">
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
