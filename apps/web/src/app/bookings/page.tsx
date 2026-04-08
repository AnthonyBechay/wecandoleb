"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Calendar, MapPin, Clock, X } from "lucide-react";
import { api } from "@/lib/api";

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const params = filter ? `?status=${filter}` : "";
    api.get<any[]>(`/api/bookings${params}`).then(setBookings).catch(() => {}).finally(() => setLoading(false));
  }, [user, filter]);

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this booking? Credits will be refunded.")) return;
    try {
      await api.post(`/api/bookings/${id}/cancel`);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "CANCELLED" } : b)));
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (authLoading || !user) return null;

  const statusColor: Record<string, string> = {
    CONFIRMED: "bg-cedar-50 text-cedar-700",
    PENDING: "bg-yellow-50 text-yellow-700",
    CANCELLED: "bg-red-50 text-red-700",
    COMPLETED: "bg-blue-50 text-blue-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-6">My Bookings</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {["", "CONFIRMED", "COMPLETED", "CANCELLED"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === f ? "bg-cedar-700 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
              {f || "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>
        ) : bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-cedar-50 flex items-center justify-center"><Calendar className="w-6 h-6 text-cedar-600" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{b.experience?.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{b.experience?.city}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{b.experience?.duration}min</span>
                    <span>{b.participants} {b.participants === 1 ? "person" : "people"}</span>
                  </div>
                  {b.session && <p className="text-xs text-gray-400 mt-1">{new Date(b.session.startTime).toLocaleString()}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor[b.status] || "bg-gray-100 text-gray-600"}`}>{b.status}</span>
                  {(b.status === "CONFIRMED" || b.status === "PENDING") && (
                    <button onClick={() => handleCancel(b.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700">No bookings yet</h3>
            <p className="text-gray-500 text-sm mt-1">Explore experiences and book your first adventure!</p>
          </div>
        )}
      </div>
    </div>
  );
}
