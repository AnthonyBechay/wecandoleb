"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Shield, Lock, Check, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", avatarUrl: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  if (authLoading || !user) return null;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await api.put("/api/auth/me", {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        avatarUrl: form.avatarUrl,
      });
      await refreshUser();
      setProfileMsg({ type: "ok", text: "Profile updated" });
    } catch (err: any) {
      setProfileMsg({ type: "err", text: err.message || "Failed to update profile" });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword.length < 8) {
      setPwMsg({ type: "err", text: "New password must be at least 8 characters" });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: "err", text: "Passwords do not match" });
      return;
    }
    setSavingPw(true);
    try {
      await api.post("/api/auth/change-password", {
        currentPassword: pwForm.currentPassword || undefined,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwMsg({ type: "ok", text: "Password updated" });
    } catch (err: any) {
      setPwMsg({ type: "err", text: err.message || "Failed to change password" });
    } finally {
      setSavingPw(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-cedar-500 text-sm";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

        {/* Identity header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
          <div className="flex items-center gap-4">
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-cedar-100 flex items-center justify-center text-cedar-700 text-2xl font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {user.email}
                <span className="text-gray-300">·</span>
                <Shield className="w-3.5 h-3.5" /> <span className="capitalize">{user.role.toLowerCase().replace("_", " ")}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Edit details */}
        <form onSubmit={saveProfile} className="bg-white rounded-2xl border border-gray-100 p-8 mb-6">
          <h3 className="font-display text-lg font-bold text-gray-900 mb-5">Edit details</h3>

          {profileMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${profileMsg.type === "ok" ? "bg-cedar-50 text-cedar-700" : "bg-red-50 text-red-700"}`}>
              {profileMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First name</label>
              <input className={inputCls} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input className={inputCls} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1" />Phone</label>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+961 …" />
            </div>
            <div>
              <label className={labelCls}><ImageIcon className="w-3.5 h-3.5 inline mr-1" />Avatar URL</label>
              <input className={inputCls} value={form.avatarUrl} onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Email</label>
              <input className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`} value={user.email} disabled />
              <p className="text-xs text-gray-400 mt-1">Contact support to change your email.</p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button type="submit" disabled={savingProfile} className="btn-primary text-sm !py-2.5 disabled:opacity-50">
              <Check className="w-4 h-4 mr-1" /> {savingProfile ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        {/* Change password */}
        <form onSubmit={changePassword} className="bg-white rounded-2xl border border-gray-100 p-8">
          <h3 className="font-display text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-400" /> Change password
          </h3>
          <p className="text-sm text-gray-500 mb-5">You&apos;ll be signed out of other devices after changing it.</p>

          {pwMsg && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${pwMsg.type === "ok" ? "bg-cedar-50 text-cedar-700" : "bg-red-50 text-red-700"}`}>
              {pwMsg.text}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Current password</label>
              <input type="password" className={inputCls} value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} placeholder="Leave blank if you signed up with Google" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>New password</label>
                <input type="password" className={inputCls} value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
              </div>
              <div>
                <label className={labelCls}>Confirm new password</label>
                <input type="password" className={inputCls} value={pwForm.confirmPassword} onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button type="submit" disabled={savingPw} className="btn-primary text-sm !py-2.5 disabled:opacity-50">
              <Lock className="w-4 h-4 mr-1" /> {savingPw ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
