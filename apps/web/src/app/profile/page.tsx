"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Shield } from "lucide-react";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-cedar-100 flex items-center justify-center text-cedar-700 text-2xl font-bold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
              <p className="text-sm text-gray-500 capitalize">{user.role.toLowerCase().replace("_", " ")}</p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="font-medium text-gray-900 capitalize">{user.role.toLowerCase().replace("_", " ")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Member since</p>
                <p className="font-medium text-gray-900">{new Date(user.createdAt || "").toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
