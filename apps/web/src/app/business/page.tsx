"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Building2, Plus, MapPin, Package } from "lucide-react";
import { api } from "@/lib/api";

export default function BusinessPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", phone: "", email: "", address: "", city: "", region: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<any[]>("/api/businesses/mine").then(setBusinesses).catch(() => {});
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const biz = await api.post<any>("/api/businesses", form);
      setBusinesses((prev) => [...prev, biz]);
      setShowCreate(false);
      setForm({ name: "", description: "", phone: "", email: "", address: "", city: "", region: "" });
    } catch (err: any) {
      alert(err.message);
    } finally { setCreating(false); }
  };

  if (authLoading || !user) return null;

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
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Want to list your business?</h3>
            <p className="text-gray-500 text-sm mb-4">Contact us to become a business owner and list your experiences.</p>
          </div>
        )}

        {businesses.length > 0 && (
          <div className="space-y-4">
            {businesses.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-cedar-50 flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-cedar-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{b.name}</h3>
                    {b.city && <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {b.city}, {b.region}</p>}
                    {b.description && <p className="text-sm text-gray-600 mt-2">{b.description}</p>}
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {b._count?.experiences || 0} experiences</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.isVerified ? "bg-cedar-50 text-cedar-700" : "bg-yellow-50 text-yellow-700"}`}>
                        {b.isVerified ? "Verified" : "Pending verification"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Add New Business</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500" placeholder="Business Name" required />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500 h-20 resize-none" placeholder="Description" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500" placeholder="City" />
                  <input type="text" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500" placeholder="Region" />
                </div>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500" placeholder="Address" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500" placeholder="Phone" />
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500" placeholder="Email" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={creating} className="btn-primary flex-1 disabled:opacity-50">{creating ? "Creating..." : "Create"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
