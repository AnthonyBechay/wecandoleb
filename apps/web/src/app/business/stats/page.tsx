"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Star,
  Package,
  Wallet,
  BarChart3,
} from "lucide-react";

/* credits are in cents where 100 credits = $1 */
const usd = (credits: number) => `$${(credits / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const cr = (credits: number) => `${credits.toLocaleString()} cr`;

interface Stats {
  businesses: { id: string; name: string }[];
  totals: {
    experiences: number; activeExperiences: number; bookings: number; guests: number;
    revenueCredits: number; costCredits: number; profitCredits: number; upcoming: number; averageRating: number;
  };
  byStatus: Record<string, number>;
  byExperience: {
    id: string; title: string; status: string; unitsSold: number; bookings: number;
    revenueCredits: number; costCredits_total: number; profitCredits: number; averageRating: number; totalReviews: number;
  }[];
  recentBookings: {
    id: string; customer: string; experience: string; participants: number;
    totalCredits: number; status: string; date: string;
  }[];
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: "bg-cedar-50 text-cedar-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  PENDING: "bg-yellow-50 text-yellow-700",
  CANCELLED: "bg-red-50 text-red-700",
  NO_SHOW: "bg-gray-100 text-gray-600",
};

export default function BusinessStatsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [bizFilter, setBizFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!["BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) router.push("/dashboard");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const qs = bizFilter ? `?businessId=${bizFilter}` : "";
    api.get<Stats>(`/api/businesses/stats${qs}`)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [user, bizFilter]);

  const margin = useMemo(() => {
    if (!stats || stats.totals.revenueCredits === 0) return 0;
    return Math.round((stats.totals.profitCredits / stats.totals.revenueCredits) * 100);
  }, [stats]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/business" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to businesses
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-cedar-600" /> Business Dashboard
            </h1>
            <p className="text-gray-600 mt-1 text-sm">Revenue, profit and reservation performance.</p>
          </div>
          {stats && stats.businesses.length > 1 && (
            <select
              value={bizFilter}
              onChange={(e) => setBizFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500 text-sm bg-white"
            >
              <option value="">All businesses</option>
              {stats.businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-4 border-cedar-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !stats || stats.businesses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium mb-1">Nothing to report yet</p>
            <p className="text-sm text-gray-500 mb-4">Create a business and experiences to see your performance here.</p>
            <Link href="/business" className="btn-primary text-sm !py-2.5 inline-flex">Go to My Businesses</Link>
          </div>
        ) : (
          <>
            {/* Money row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <BigStat icon={<DollarSign className="w-5 h-5" />} tone="cedar" label="Revenue" primary={usd(stats.totals.revenueCredits)} secondary={cr(stats.totals.revenueCredits)} />
              <BigStat icon={<Wallet className="w-5 h-5" />} tone="sunset" label="Cost" primary={usd(stats.totals.costCredits)} secondary={cr(stats.totals.costCredits)} />
              <BigStat icon={<TrendingUp className="w-5 h-5" />} tone={stats.totals.profitCredits >= 0 ? "blue" : "wine"} label="Profit" primary={usd(stats.totals.profitCredits)} secondary={`${margin}% margin`} />
              <BigStat icon={<Star className="w-5 h-5" />} tone="wine" label="Avg rating" primary={stats.totals.averageRating ? stats.totals.averageRating.toFixed(1) : "—"} secondary={`${stats.totals.experiences} experiences`} />
            </div>

            {/* Reservation row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MiniStat icon={<Calendar className="w-4 h-4" />} label="Total bookings" value={stats.totals.bookings} />
              <MiniStat icon={<Users className="w-4 h-4" />} label="Guests served" value={stats.totals.guests} />
              <MiniStat icon={<Calendar className="w-4 h-4" />} label="Upcoming" value={stats.totals.upcoming} />
              <MiniStat icon={<Package className="w-4 h-4" />} label="Active listings" value={stats.totals.activeExperiences} />
            </div>

            {/* Booking status breakdown */}
            {Object.keys(stats.byStatus).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
                <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Reservations by status</h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className={`px-4 py-2 rounded-xl ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}>
                      <span className="text-lg font-bold">{count}</span>
                      <span className="text-xs ml-2 capitalize">{status.toLowerCase().replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-experience performance */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-display text-lg font-bold text-gray-900">Performance by experience</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium">Experience</th>
                      <th className="text-right px-4 py-3 font-medium">Units sold</th>
                      <th className="text-right px-4 py-3 font-medium">Bookings</th>
                      <th className="text-right px-4 py-3 font-medium">Revenue</th>
                      <th className="text-right px-4 py-3 font-medium">Cost</th>
                      <th className="text-right px-6 py-3 font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {stats.byExperience.map((e) => (
                      <tr key={e.id}>
                        <td className="px-6 py-3">
                          <div className="font-medium text-gray-900">{e.title}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-1">
                            {e.totalReviews > 0 && (<><Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> {e.averageRating.toFixed(1)} ({e.totalReviews})</>)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{e.unitsSold}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{e.bookings}</td>
                        <td className="px-4 py-3 text-right text-gray-900">{usd(e.revenueCredits)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">{usd(e.costCredits_total)}</td>
                        <td className={`px-6 py-3 text-right font-bold ${e.profitCredits >= 0 ? "text-cedar-700" : "text-red-600"}`}>{usd(e.profitCredits)}</td>
                      </tr>
                    ))}
                    {stats.byExperience.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No experiences yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent reservations */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-display text-lg font-bold text-gray-900 mb-4">Recent reservations</h2>
              {stats.recentBookings.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">No reservations yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                      <div className="w-10 h-10 rounded-lg bg-cedar-100 text-cedar-700 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{b.customer} · {b.experience}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" · "}{b.participants} {b.participants === 1 ? "guest" : "guests"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{usd(b.totalCredits)}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status] || "bg-gray-100 text-gray-600"}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BigStat({ icon, tone, label, primary, secondary }: { icon: React.ReactNode; tone: "cedar" | "sunset" | "blue" | "wine"; label: string; primary: string; secondary: string }) {
  const tones: Record<string, string> = {
    cedar: "bg-cedar-50 text-cedar-700",
    sunset: "bg-sunset-50 text-sunset-600",
    blue: "bg-blue-50 text-blue-600",
    wine: "bg-wine-50 text-wine-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tones[tone]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{primary}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label} · {secondary}</p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
