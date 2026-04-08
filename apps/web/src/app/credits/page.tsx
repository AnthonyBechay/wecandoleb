"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, ArrowUpRight, ArrowDownRight, Check } from "lucide-react";
import { api } from "@/lib/api";

interface CreditPackage {
  id: string; name: string; credits: number; priceUsd: number; bonus: number;
}

interface Transaction {
  id: string; amount: number; type: string; description: string; createdAt: string;
}

export default function CreditsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buying, setBuying] = useState("");

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<CreditPackage[]>("/api/credits/packages").then(setPackages).catch(() => {});
    api.get<{ transactions: Transaction[] }>("/api/credits/history").then((d) => setTransactions(d.transactions)).catch(() => {});
  }, [user]);

  const handleBuy = async (pkgId: string) => {
    setBuying(pkgId);
    try {
      await api.post("/api/credits/purchase", { packageId: pkgId });
      await refreshUser();
      const data = await api.get<{ transactions: Transaction[] }>("/api/credits/history");
      setTransactions(data.transactions);
    } catch (err: any) {
      alert(err.message);
    } finally { setBuying(""); }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-cedar-700 to-cedar-900 rounded-2xl p-8 text-white mb-10">
          <p className="text-sm font-medium text-cedar-300 mb-1">Your Credit Balance</p>
          <p className="text-4xl font-bold">{(user.creditBalance / 100).toFixed(0)} <span className="text-xl font-normal text-cedar-300">credits</span></p>
          <p className="text-sm text-cedar-300 mt-2">1 credit = $1 USD</p>
        </div>

        {/* Packages */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Buy Credits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {packages.map((pkg) => (
            <div key={pkg.id} className="bg-white rounded-2xl border border-gray-100 p-6 text-center hover:border-cedar-300 transition">
              <h3 className="font-bold text-lg text-gray-900">{pkg.name}</h3>
              <p className="text-3xl font-bold text-cedar-700 mt-2">{pkg.credits / 100}</p>
              <p className="text-sm text-gray-500">credits</p>
              {pkg.bonus > 0 && <p className="text-sm text-cedar-600 font-semibold mt-1">+{pkg.bonus / 100} bonus!</p>}
              <p className="text-lg font-semibold text-gray-900 mt-3">${pkg.priceUsd}</p>
              <button onClick={() => handleBuy(pkg.id)} disabled={buying === pkg.id}
                className="btn-primary w-full mt-4 !py-2.5 text-sm disabled:opacity-50">
                {buying === pkg.id ? "Processing..." : "Purchase"}
              </button>
            </div>
          ))}
        </div>

        {/* Transaction history */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {transactions.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.amount > 0 ? "bg-cedar-50 text-cedar-600" : "bg-red-50 text-red-500"}`}>
                    {t.amount > 0 ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{t.description || t.type.replace("_", " ")}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`font-semibold ${t.amount > 0 ? "text-cedar-700" : "text-red-600"}`}>
                    {t.amount > 0 ? "+" : ""}{(t.amount / 100).toFixed(0)} credits
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
