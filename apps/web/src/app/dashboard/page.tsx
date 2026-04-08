"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CreditCard, Gift, Calendar, ArrowRight, Star, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [gifts, setGifts] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.get<any[]>("/api/bookings").then(setBookings).catch(() => {});
    api.get<any[]>("/api/gifts/sent").then(setGifts).catch(() => {});
  }, [user]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-cedar-600 border-t-transparent rounded-full animate-spin" /></div>;

  const upcomingBookings = bookings.filter((b) => b.status === "CONFIRMED").slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="font-display text-3xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">Here&apos;s your activity at a glance</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-cedar-50 text-cedar-700 flex items-center justify-center"><CreditCard className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-gray-500">Credit Balance</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{(user.creditBalance / 100).toFixed(0)} <span className="text-sm font-normal text-gray-500">credits</span></p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sunset-50 text-sunset-600 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-gray-500">Total Bookings</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-wine-50 text-wine-600 flex items-center justify-center"><Gift className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-gray-500">Gifts Sent</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{gifts.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Star className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-gray-500">Role</span>
            </div>
            <p className="text-lg font-bold text-gray-900 capitalize">{user.role.toLowerCase().replace("_", " ")}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Link href="/experiences" className="bg-gradient-to-br from-cedar-600 to-cedar-800 rounded-2xl p-6 text-white hover:shadow-lg transition group">
            <TrendingUp className="w-8 h-8 mb-3 text-cedar-300" />
            <h3 className="text-lg font-bold mb-1">Browse Experiences</h3>
            <p className="text-sm text-cedar-200">Discover new activities</p>
            <ArrowRight className="w-5 h-5 mt-3 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/gift" className="bg-gradient-to-br from-sunset-500 to-sunset-700 rounded-2xl p-6 text-white hover:shadow-lg transition group">
            <Gift className="w-8 h-8 mb-3 text-sunset-200" />
            <h3 className="text-lg font-bold mb-1">Send a Gift</h3>
            <p className="text-sm text-sunset-200">Surprise someone special</p>
            <ArrowRight className="w-5 h-5 mt-3 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/credits" className="bg-gradient-to-br from-wine-600 to-wine-800 rounded-2xl p-6 text-white hover:shadow-lg transition group">
            <CreditCard className="w-8 h-8 mb-3 text-wine-300" />
            <h3 className="text-lg font-bold mb-1">Buy Credits</h3>
            <p className="text-sm text-wine-200">Top up your balance</p>
            <ArrowRight className="w-5 h-5 mt-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Upcoming bookings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Upcoming Bookings</h2>
            <Link href="/bookings" className="text-sm text-cedar-700 font-semibold hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-3">
              {upcomingBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-xl bg-cedar-100 flex items-center justify-center text-cedar-700">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{b.experience?.title}</p>
                    <p className="text-sm text-gray-500">
                      {b.session && new Date(b.session.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {" "} &middot; {b.participants} {b.participants === 1 ? "person" : "people"}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-cedar-50 text-cedar-700 text-xs font-semibold rounded-full">{b.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>No upcoming bookings</p>
              <Link href="/experiences" className="text-cedar-700 font-semibold text-sm hover:underline mt-1 inline-block">Explore experiences</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
