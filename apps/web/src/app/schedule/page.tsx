"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  MapPin,
  Clock,
  X,
  Trash2,
  Edit,
  Globe,
  Building2,
  CalendarDays,
} from "lucide-react";

/* ---------- types ---------- */
interface Meeting {
  id: string;
  source: "PLATFORM" | "EXTERNAL";
  title: string;
  startTime: string;
  endTime: string | null;
  headcount: number;
  bookingCount: number;
  location: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  businessId: string;
  experience: { id: string; title: string } | null;
  attendees?: { name: string; participants: number; status: string }[];
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
}

interface Business {
  id: string;
  name: string;
}

interface ExperienceLite {
  id: string;
  title: string;
}

/* ---------- helpers ---------- */
const inputCls =
  "w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500 text-sm";

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const EMPTY_FORM = {
  id: "",
  businessId: "",
  experienceId: "",
  title: "",
  date: "",
  startTime: "10:00",
  endTime: "",
  headcount: "1",
  location: "",
  customerName: "",
  customerPhone: "",
  notes: "",
};

export default function SchedulePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bizFilter, setBizFilter] = useState<string>(""); // "" = all
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formExperiences, setFormExperiences] = useState<ExperienceLite[]>([]);
  const [saving, setSaving] = useState(false);

  /* auth guard */
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (!["BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  /* load businesses */
  useEffect(() => {
    if (!user) return;
    api.get<Business[]>("/api/businesses/mine").then(setBusinesses).catch(() => {});
  }, [user]);

  /* month range */
  const range = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [cursor]);

  /* load schedule */
  const loadSchedule = () => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams({ from: range.from, to: range.to });
    if (bizFilter) params.set("businessId", bizFilter);
    api
      .get<Meeting[]>(`/api/schedule?${params.toString()}`)
      .then(setMeetings)
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bizFilter, range.from, range.to]);

  /* group meetings by day */
  const byDay = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    for (const m of meetings) {
      const k = dayKey(new Date(m.startTime));
      (map[k] ||= []).push(m);
    }
    return map;
  }, [meetings]);

  /* month stats */
  const stats = useMemo(() => {
    const active = meetings.filter((m) => m.status !== "CANCELLED");
    return {
      total: active.length,
      guests: active.reduce((sum, m) => sum + m.headcount, 0),
      platform: active.filter((m) => m.source === "PLATFORM").length,
      external: active.filter((m) => m.source === "EXTERNAL").length,
    };
  }, [meetings]);

  /* calendar grid cells */
  const cells = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const leading = firstDay.getDay(); // 0=Sun
    const arr: (Date | null)[] = [];
    for (let i = 0; i < leading; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const todayKey = dayKey(new Date());

  /* ----- modal handlers ----- */
  const openAdd = (presetDate?: string) => {
    setForm({
      ...EMPTY_FORM,
      businessId: bizFilter || businesses[0]?.id || "",
      date: presetDate || dayKey(new Date()),
    });
    setShowForm(true);
  };

  const openEdit = (m: Meeting) => {
    if (m.source !== "EXTERNAL") return;
    const start = new Date(m.startTime);
    setForm({
      id: m.id,
      businessId: m.businessId,
      experienceId: m.experience?.id || "",
      title: m.title,
      date: dayKey(start),
      startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endTime: m.endTime ? `${pad(new Date(m.endTime).getHours())}:${pad(new Date(m.endTime).getMinutes())}` : "",
      headcount: String(m.headcount),
      location: m.location || "",
      customerName: m.customerName || "",
      customerPhone: m.customerPhone || "",
      notes: m.notes || "",
    });
    setShowForm(true);
  };

  /* load experiences for the selected business in the form */
  useEffect(() => {
    if (!showForm || !form.businessId) { setFormExperiences([]); return; }
    api
      .get<ExperienceLite[]>(`/api/businesses/${form.businessId}/experiences`)
      .then((exps) => setFormExperiences(exps.map((e) => ({ id: e.id, title: e.title }))))
      .catch(() => setFormExperiences([]));
  }, [showForm, form.businessId]);

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessId) { alert("Please select a business"); return; }
    if (!form.title.trim()) { alert("Title is required"); return; }
    if (!form.date) { alert("Date is required"); return; }

    const startISO = new Date(`${form.date}T${form.startTime || "10:00"}`).toISOString();
    const endISO = form.endTime ? new Date(`${form.date}T${form.endTime}`).toISOString() : undefined;

    const payload = {
      businessId: form.businessId,
      experienceId: form.experienceId || undefined,
      title: form.title.trim(),
      startTime: startISO,
      endTime: endISO,
      headcount: Number(form.headcount) || 1,
      location: form.location || undefined,
      customerName: form.customerName || undefined,
      customerPhone: form.customerPhone || undefined,
      notes: form.notes || undefined,
    };

    setSaving(true);
    try {
      if (form.id) {
        await api.put(`/api/schedule/meetings/${form.id}`, payload);
      } else {
        await api.post(`/api/schedule/meetings`, payload);
      }
      setShowForm(false);
      loadSchedule();
    } catch (err: any) {
      alert(err.message || "Failed to save meeting");
    } finally {
      setSaving(false);
    }
  };

  const deleteMeeting = async (m: Meeting) => {
    if (m.source !== "EXTERNAL") return;
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      await api.delete(`/api/schedule/meetings/${m.id}`);
      loadSchedule();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (authLoading || !user) return null;

  const listDays = Object.keys(byDay).sort();
  const visibleDays = selectedDay ? listDays.filter((d) => d === selectedDay) : listDays;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-7 h-7 text-cedar-600" /> My Schedule
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              All your meetings in one place — booked through WeCanDoLeb or added yourself.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {businesses.length > 1 && (
              <select
                value={bizFilter}
                onChange={(e) => setBizFilter(e.target.value)}
                className={`${inputCls} !w-auto`}
              >
                <option value="">All businesses</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <button onClick={() => openAdd()} className="btn-primary text-sm !py-2.5 whitespace-nowrap">
              <Plus className="w-4 h-4 mr-1" /> Add Meeting
            </button>
          </div>
        </div>

        {businesses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-600 font-medium mb-1">No business yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Create a business to start scheduling meetings and experiences.
            </p>
            <Link href="/business" className="btn-primary text-sm !py-2.5 inline-flex">
              Go to My Businesses
            </Link>
          </div>
        ) : (
          <>
            {/* stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard icon={<CalendarIcon className="w-5 h-5" />} label="Meetings this month" value={stats.total} tone="cedar" />
              <StatCard icon={<Users className="w-5 h-5" />} label="Guests expected" value={stats.guests} tone="sunset" />
              <StatCard icon={<Globe className="w-5 h-5" />} label="Via WeCanDoLeb" value={stats.platform} tone="blue" />
              <StatCard icon={<Building2 className="w-5 h-5" />} label="Added directly" value={stats.external} tone="wine" />
            </div>

            {/* calendar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-gray-900">{monthLabel(cursor)}</h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setSelectedDay(null); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)); }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { setSelectedDay(null); setCursor(new Date()); setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); }}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 text-gray-600"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => { setSelectedDay(null); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)); }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    aria-label="Next month"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                  if (!date) return <div key={i} className="min-h-[84px] rounded-lg" />;
                  const k = dayKey(date);
                  const dayMeetings = (byDay[k] || []).filter((m) => m.status !== "CANCELLED");
                  const guests = dayMeetings.reduce((s, m) => s + m.headcount, 0);
                  const isToday = k === todayKey;
                  const isSelected = k === selectedDay;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(isSelected ? null : k)}
                      className={`min-h-[84px] rounded-lg border p-1.5 text-left align-top transition ${
                        isSelected ? "border-cedar-500 ring-1 ring-cedar-500 bg-cedar-50/40"
                        : "border-gray-100 hover:border-cedar-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? "bg-cedar-600 text-white" : "text-gray-600"
                        }`}>
                          {date.getDate()}
                        </span>
                        {guests > 0 && (
                          <span className="text-[10px] font-semibold text-sunset-700 bg-sunset-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" />{guests}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayMeetings.slice(0, 2).map((m) => (
                          <div
                            key={m.id}
                            className={`text-[10px] leading-tight truncate px-1 py-0.5 rounded ${
                              m.source === "PLATFORM"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-wine-50 text-wine-700"
                            }`}
                            title={`${timeLabel(m.startTime)} · ${m.title}`}
                          >
                            {timeLabel(m.startTime)} {m.title}
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <div className="text-[10px] text-gray-400 px-1">+{dayMeetings.length - 2} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* list */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-gray-900">
                  {selectedDay
                    ? new Date(selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                    : "Upcoming this month"}
                </h2>
                {selectedDay && (
                  <button onClick={() => setSelectedDay(null)} className="text-sm text-cedar-700 font-semibold hover:underline">
                    Show all
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-4 border-cedar-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : visibleDays.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>No meetings {selectedDay ? "on this day" : "this month"}.</p>
                  <button onClick={() => openAdd(selectedDay || undefined)} className="text-cedar-700 font-semibold text-sm hover:underline mt-1">
                    Add a meeting
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {visibleDays.map((k) => (
                    <div key={k}>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">
                        {new Date(k).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <div className="space-y-2">
                        {byDay[k]
                          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                          .map((m) => (
                            <MeetingRow key={m.id} m={m} onEdit={openEdit} onDelete={deleteMeeting} />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* add/edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900 font-display">
                {form.id ? "Edit Meeting" : "Add Meeting"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitForm} className="space-y-4">
              {businesses.length > 1 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Business</label>
                  <select
                    value={form.businessId}
                    onChange={(e) => setForm({ ...form, businessId: e.target.value, experienceId: "" })}
                    className={inputCls}
                    required
                  >
                    <option value="">Select business</option>
                    {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputCls}
                  placeholder="e.g. Private wine tasting for the Haddad family"
                  required
                />
              </div>

              {formExperiences.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Linked experience (optional)</label>
                  <select
                    value={form.experienceId}
                    onChange={(e) => setForm({ ...form, experienceId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">None</option>
                    {formExperiences.map((exp) => <option key={exp.id} value={exp.id}>{exp.title}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Number of people</label>
                  <input type="number" min={1} value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} className={inputCls} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Start time</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">End time (optional)</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Location (optional)</label>
                <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} placeholder="Where is it taking place?" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Customer name (optional)</label>
                  <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Customer phone (optional)</label>
                  <input type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Notes (optional)</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${inputCls} h-20 resize-none`} placeholder="Any details to remember" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? "Saving…" : form.id ? "Update" : "Add Meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- small components ---------- */
function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "cedar" | "sunset" | "blue" | "wine" }) {
  const tones: Record<string, string> = {
    cedar: "bg-cedar-50 text-cedar-700",
    sunset: "bg-sunset-50 text-sunset-600",
    blue: "bg-blue-50 text-blue-600",
    wine: "bg-wine-50 text-wine-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${tones[tone]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function MeetingRow({ m, onEdit, onDelete }: { m: Meeting; onEdit: (m: Meeting) => void; onDelete: (m: Meeting) => void }) {
  const cancelled = m.status === "CANCELLED";
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${cancelled ? "border-gray-100 bg-gray-50 opacity-60" : "border-gray-100 bg-gray-50"}`}>
      <div className="w-14 shrink-0 text-center">
        <p className="text-sm font-bold text-gray-900">{timeLabel(m.startTime)}</p>
        {m.endTime && <p className="text-[11px] text-gray-400">{timeLabel(m.endTime)}</p>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className={`font-semibold text-gray-900 ${cancelled ? "line-through" : ""}`}>{m.title}</h3>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            m.source === "PLATFORM" ? "bg-blue-50 text-blue-700" : "bg-wine-50 text-wine-700"
          }`}>
            {m.source === "PLATFORM" ? "WeCanDoLeb" : "Direct"}
          </span>
          {cancelled && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Cancelled</span>}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {m.headcount} {m.headcount === 1 ? "person" : "people"}</span>
          {m.source === "PLATFORM" && m.bookingCount > 1 && (
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.bookingCount} bookings</span>
          )}
          {m.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {m.location}</span>}
          {m.customerName && <span>{m.customerName}</span>}
        </div>
        {m.attendees && m.attendees.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            {m.attendees.map((a) => `${a.name} (${a.participants})`).join(", ")}
          </p>
        )}
        {m.notes && <p className="text-xs text-gray-400 mt-1">{m.notes}</p>}
      </div>
      {m.source === "EXTERNAL" && (
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(m)} className="p-2 text-gray-400 hover:text-cedar-600 hover:bg-cedar-50 rounded-lg transition" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(m)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
