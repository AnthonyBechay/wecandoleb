"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Gift, Send, ArrowDownRight, Copy, Check } from "lucide-react";
import { api } from "@/lib/api";

export default function GiftsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"sent" | "received" | "claim">("sent");
  const [sent, setSent] = useState<any[]>([]);
  const [received, setReceived] = useState<any[]>([]);
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<any[]>("/api/gifts/sent").then(setSent).catch(() => {});
    api.get<any[]>("/api/gifts/received").then(setReceived).catch(() => {});
  }, [user]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true);
    setClaimResult("");
    try {
      const result = await api.post<any>("/api/gifts/claim", { code: claimCode.trim() });
      setClaimResult(`Claimed ${result.creditsReceived / 100} credits!`);
      setClaimCode("");
      await refreshUser();
    } catch (err: any) {
      setClaimResult(err.message || "Failed to claim");
    } finally { setClaiming(false); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(""), 2000);
  };

  if (authLoading || !user) return null;

  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700",
    CLAIMED: "bg-cedar-50 text-cedar-700",
    EXPIRED: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-6">My Gifts</h1>

        <div className="flex gap-2 mb-6">
          {(["sent", "received", "claim"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition ${tab === t ? "bg-cedar-700 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
              {t === "sent" ? "Sent" : t === "received" ? "Received" : "Claim Gift"}
            </button>
          ))}
        </div>

        {tab === "claim" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Claim a Gift</h2>
            <form onSubmit={handleClaim} className="space-y-4">
              <input type="text" value={claimCode} onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 outline-none font-mono text-lg tracking-wider text-center"
                placeholder="Enter gift code" required />
              <button type="submit" disabled={claiming} className="btn-primary w-full disabled:opacity-50">
                {claiming ? "Claiming..." : "Claim Gift"}
              </button>
              {claimResult && <p className={`text-sm text-center ${claimResult.includes("credits") ? "text-cedar-700" : "text-red-600"}`}>{claimResult}</p>}
            </form>
          </div>
        )}

        {tab === "sent" && (
          <div className="space-y-4">
            {sent.length > 0 ? sent.map((g) => (
              <div key={g.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sunset-50 flex items-center justify-center"><Send className="w-5 h-5 text-sunset-600" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">To: {g.recipientName}</p>
                  <p className="text-sm text-gray-500">{g.recipientEmail} &middot; {g.totalCredits / 100} credits</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyCode(g.code)} className="p-2 hover:bg-gray-50 rounded-lg transition" title="Copy code">
                    {copiedId === g.code ? <Check className="w-4 h-4 text-cedar-600" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor[g.status] || "bg-gray-100"}`}>{g.status}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-16 bg-white rounded-2xl border"><Gift className="w-10 h-10 mx-auto mb-2 text-gray-300" /><p className="text-gray-500">No gifts sent yet</p></div>
            )}
          </div>
        )}

        {tab === "received" && (
          <div className="space-y-4">
            {received.length > 0 ? received.map((g) => (
              <div key={g.id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cedar-50 flex items-center justify-center"><ArrowDownRight className="w-5 h-5 text-cedar-600" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">From: {g.sender?.firstName} {g.sender?.lastName}</p>
                  <p className="text-sm text-gray-500">{g.totalCredits / 100} credits</p>
                  {g.message && <p className="text-sm text-gray-600 italic mt-1">&ldquo;{g.message}&rdquo;</p>}
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor[g.status] || "bg-gray-100"}`}>{g.status}</span>
              </div>
            )) : (
              <div className="text-center py-16 bg-white rounded-2xl border"><Gift className="w-10 h-10 mx-auto mb-2 text-gray-300" /><p className="text-gray-500">No gifts received yet</p></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
