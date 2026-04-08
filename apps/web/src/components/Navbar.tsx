"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Menu, X, Gift, CreditCard, User, LogOut, LayoutDashboard, Building2, ChevronDown } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cedar-600 to-cedar-800 flex items-center justify-center">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <span className="font-display text-xl font-bold text-cedar-800">WeCanDoLeb</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/experiences" className="text-sm font-medium text-gray-600 hover:text-cedar-700 transition">
              Experiences
            </Link>
            <Link href="/gift" className="text-sm font-medium text-gray-600 hover:text-cedar-700 transition">
              Gift an Experience
            </Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-cedar-700 transition">
              About Lebanon
            </Link>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <Link href="/credits" className="flex items-center gap-1.5 text-sm font-medium text-cedar-700 bg-cedar-50 px-3 py-1.5 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                  {(user.creditBalance / 100).toFixed(0)} credits
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-cedar-100 flex items-center justify-center text-cedar-700 font-semibold">
                      {user.firstName[0]}
                    </div>
                    <span>{user.firstName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link href="/bookings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <CreditCard className="w-4 h-4" /> My Bookings
                      </Link>
                      <Link href="/gifts" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <Gift className="w-4 h-4" /> My Gifts
                      </Link>
                      {(user.role === "BUSINESS_OWNER" || user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                        <Link href="/business" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                          <Building2 className="w-4 h-4" /> My Business
                        </Link>
                      )}
                      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
                        <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                          <User className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <Link href="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      <button
                        onClick={() => { logout(); setProfileOpen(false); }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-sm !py-2 !px-4">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-2">
          <Link href="/experiences" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Experiences</Link>
          <Link href="/gift" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Gift an Experience</Link>
          <Link href="/about" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>About Lebanon</Link>
          {user ? (
            <>
              <hr className="border-gray-100" />
              <Link href="/dashboard" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link href="/bookings" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>My Bookings</Link>
              <Link href="/credits" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Credits ({(user.creditBalance / 100).toFixed(0)})</Link>
              <Link href="/gifts" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>My Gifts</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50">Sign Out</button>
            </>
          ) : (
            <>
              <hr className="border-gray-100" />
              <Link href="/login" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link href="/register" className="block px-3 py-2 rounded-lg text-white bg-cedar-700 text-center" onClick={() => setMobileOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
