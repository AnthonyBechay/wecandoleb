"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Menu, X, Gift, CreditCard, User, LogOut, LayoutDashboard, Building2, ChevronDown, CalendarDays, Shield } from "lucide-react";

const NAV_LINKS = [
  { href: "/experiences", label: "Experiences" },
  { href: "/gift", label: "Gift an Experience" },
  { href: "/about", label: "About Lebanon" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close the profile dropdown when clicking outside of it
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  // Solidify the bar once the user scrolls past the hero
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isProvider = user && ["BUSINESS_OWNER", "ADMIN", "SUPER_ADMIN"].includes(user.role);
  const isAdmin = user && ["ADMIN", "SUPER_ADMIN"].includes(user.role);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-md border-b border-gray-200/70 shadow-soft" : "bg-white/70 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cedar-500 to-cedar-800 flex items-center justify-center shadow-md shadow-cedar-800/25 transition-transform group-hover:scale-105">
              <span className="text-white font-display font-bold text-lg leading-none">M</span>
            </div>
            <span className="font-display text-xl font-bold text-cedar-900 tracking-tight">
              Make<span className="text-cedar-600">YourOwn</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.href) ? "text-cedar-700 bg-cedar-50" : "text-gray-600 hover:text-cedar-700 hover:bg-gray-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link href="/credits" className="flex items-center gap-1.5 text-sm font-semibold text-cedar-700 bg-cedar-50 px-3 py-1.5 rounded-lg hover:bg-cedar-100 transition-colors">
                  <CreditCard className="w-4 h-4" />
                  {(user.creditBalance / 100).toFixed(0)}
                </Link>
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cedar-500 to-cedar-700 flex items-center justify-center text-white font-semibold text-sm">
                      {user.firstName[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user.firstName}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-lift border border-gray-100 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-2 mb-1 border-b border-gray-50">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-400 capitalize">{user.role.toLowerCase().replace("_", " ")}</p>
                      </div>
                      <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <LayoutDashboard className="w-4 h-4 text-gray-400" /> Dashboard
                      </Link>
                      <Link href="/bookings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <CreditCard className="w-4 h-4 text-gray-400" /> My Bookings
                      </Link>
                      <Link href="/gifts" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <Gift className="w-4 h-4 text-gray-400" /> My Gifts
                      </Link>
                      {isProvider && (
                        <>
                          <div className="my-1 border-t border-gray-50" />
                          <Link href="/business" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                            <Building2 className="w-4 h-4 text-gray-400" /> My Business
                          </Link>
                          <Link href="/schedule" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                            <CalendarDays className="w-4 h-4 text-gray-400" /> My Schedule
                          </Link>
                        </>
                      )}
                      {isAdmin && (
                        <>
                          <div className="my-1 border-t border-gray-50" />
                          <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-wine-700 hover:bg-wine-50 font-medium" onClick={() => setProfileOpen(false)}>
                            <Shield className="w-4 h-4" /> Admin Panel
                          </Link>
                        </>
                      )}
                      <div className="my-1 border-t border-gray-50" />
                      <Link href="/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                        <User className="w-4 h-4 text-gray-400" /> Profile
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
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition px-3 py-2">
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary text-sm !py-2 !px-4">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 -mr-2 text-gray-700" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1 shadow-lift">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`block px-3 py-2.5 rounded-lg font-medium ${isActive(l.href) ? "bg-cedar-50 text-cedar-700" : "text-gray-700 hover:bg-gray-50"}`} onClick={() => setMobileOpen(false)}>{l.label}</Link>
          ))}
          {user ? (
            <>
              <hr className="border-gray-100 my-2" />
              <Link href="/dashboard" className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link href="/bookings" className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>My Bookings</Link>
              <Link href="/credits" className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Credits ({(user.creditBalance / 100).toFixed(0)})</Link>
              <Link href="/gifts" className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>My Gifts</Link>
              {isProvider && (
                <>
                  <Link href="/business" className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>My Business</Link>
                  <Link href="/schedule" className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>My Schedule</Link>
                </>
              )}
              {isAdmin && (
                <Link href="/admin" className="block px-3 py-2.5 rounded-lg text-wine-700 font-medium hover:bg-wine-50" onClick={() => setMobileOpen(false)}>Admin Panel</Link>
              )}
              <Link href="/profile" className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Profile</Link>
              <button onClick={() => { logout(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50">Sign Out</button>
            </>
          ) : (
            <>
              <hr className="border-gray-100 my-2" />
              <Link href="/login" className="block px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link href="/register" className="block px-3 py-2.5 rounded-lg text-white bg-cedar-700 text-center font-semibold" onClick={() => setMobileOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
