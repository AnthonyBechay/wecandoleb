"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Gift, Send, Sparkles, Search, Ticket, CreditCard } from "lucide-react";
import { api } from "@/lib/api";

interface Experience {
  id: string;
  title: string;
  coverImage: string;
  priceCredits: number;
  priceCurrency: number;
}

type GiftMode = "credits" | "experience";

function GiftContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedExperienceId = searchParams.get("experience");

  const [mode, setMode] = useState<GiftMode>(
    preselectedExperienceId ? "experience" : "credits"
  );
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [credits, setCredits] = useState(2500);
  const [sendEmail, setSendEmail] = useState(true);

  // Experience mode state
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loadingExperiences, setLoadingExperiences] = useState(false);
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(
    preselectedExperienceId
  );
  const [tickets, setTickets] = useState(1);
  const [experienceSearch, setExperienceSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ code: string } | null>(null);

  const presets = [
    { label: "25 credits", value: 2500, desc: "Perfect for a workshop" },
    { label: "50 credits", value: 5000, desc: "A wine tasting or tour" },
    { label: "100 credits", value: 10000, desc: "The ultimate experience" },
  ];

  // Fetch experiences when switching to experience mode
  useEffect(() => {
    if (mode !== "experience") return;
    if (experiences.length > 0) return;
    setLoadingExperiences(true);
    api
      .get<{ experiences: Experience[] }>("/api/experiences")
      .then((res) => setExperiences(res.experiences))
      .catch(() => setExperiences([]))
      .finally(() => setLoadingExperiences(false));
  }, [mode, experiences.length]);

  const selectedExperience = useMemo(
    () => experiences.find((e) => e.id === selectedExperienceId) ?? null,
    [experiences, selectedExperienceId]
  );

  const filteredExperiences = useMemo(() => {
    if (!experienceSearch.trim()) return experiences;
    const q = experienceSearch.toLowerCase();
    return experiences.filter((e) => e.title.toLowerCase().includes(q));
  }, [experiences, experienceSearch]);

  const totalCost =
    mode === "credits"
      ? credits
      : selectedExperience
        ? selectedExperience.priceCredits * tickets
        : 0;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    if (mode === "experience" && !selectedExperienceId) {
      alert("Please select an experience.");
      return;
    }

    setSending(true);
    try {
      const body: Record<string, unknown> = {
        recipientName,
        recipientEmail,
        message,
        sendEmail,
        giftType: mode,
      };

      if (mode === "credits") {
        body.credits = credits;
      } else {
        body.experienceId = selectedExperienceId;
        body.tickets = tickets;
      }

      const result = await api.post<any>("/api/gifts", body);
      setSent(result);
    } catch (err: any) {
      alert(err.message || "Failed to send gift");
    } finally {
      setSending(false);
    }
  };

  // Success state
  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-cedar-50 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-cedar-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
              Gift Sent!
            </h1>
            <p className="text-gray-600 mb-4">
              Your gift has been sent to {recipientName}.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">Redemption Code</p>
              <p className="text-2xl font-mono font-bold text-cedar-700 tracking-wider">
                {sent.code}
              </p>
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Share this code with the recipient so they can claim their gift.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <Gift className="w-12 h-12 text-sunset-500 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-gray-900">
            Send a Gift
          </h1>
          <p className="text-gray-600 mt-2">
            Send the joy of Lebanese culture to someone you love
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode("credits")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition ${
              mode === "credits"
                ? "border-cedar-600 bg-cedar-50 text-cedar-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Gift Credits
          </button>
          <button
            type="button"
            onClick={() => setMode("experience")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-semibold text-sm transition ${
              mode === "experience"
                ? "border-cedar-600 bg-cedar-50 text-cedar-700"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <Ticket className="w-4 h-4" />
            Gift an Experience
          </button>
        </div>

        <form
          onSubmit={handleSend}
          className="bg-white rounded-2xl border border-gray-100 p-8 space-y-6"
        >
          {/* Recipient Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Recipient&apos;s Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 outline-none"
                placeholder="Their name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Recipient&apos;s Email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 outline-none"
                placeholder="their@email.com"
                required
              />
            </div>
          </div>

          {/* Credits Mode */}
          {mode === "credits" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Gift Amount
              </label>
              <div className="grid grid-cols-3 gap-3">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setCredits(p.value)}
                    className={`p-4 rounded-xl border-2 transition text-center ${
                      credits === p.value
                        ? "border-cedar-600 bg-cedar-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-bold text-lg text-gray-900">{p.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Experience Mode */}
          {mode === "experience" && (
            <div className="space-y-4">
              {/* Experience Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Select Experience
                </label>
                <div className="relative">
                  <div
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-cedar-500 flex items-center gap-2 cursor-pointer"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={
                        dropdownOpen
                          ? experienceSearch
                          : selectedExperience
                            ? selectedExperience.title
                            : ""
                      }
                      onChange={(e) => {
                        setExperienceSearch(e.target.value);
                        if (!dropdownOpen) setDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setDropdownOpen(true);
                        setExperienceSearch("");
                      }}
                      className="w-full bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
                      placeholder="Search experiences..."
                    />
                  </div>

                  {dropdownOpen && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {loadingExperiences ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Loading experiences...
                        </div>
                      ) : filteredExperiences.length === 0 ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No experiences found
                        </div>
                      ) : (
                        filteredExperiences.map((exp) => (
                          <button
                            key={exp.id}
                            type="button"
                            onClick={() => {
                              setSelectedExperienceId(exp.id);
                              setDropdownOpen(false);
                              setExperienceSearch("");
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
                              selectedExperienceId === exp.id
                                ? "bg-cedar-50"
                                : ""
                            }`}
                          >
                            {exp.coverImage && (
                              <img
                                src={exp.coverImage}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {exp.title}
                              </p>
                              <p className="text-xs text-gray-500">
                                {exp.priceCredits / 100} credits
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Number of Tickets
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTickets((t) => Math.max(1, t - 1))}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-300 transition"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-semibold text-lg text-gray-900">
                    {tickets}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTickets((t) => Math.min(10, t + 1))}
                    className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 hover:border-gray-300 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Cost */}
              {selectedExperience && (
                <div className="bg-cedar-50 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {selectedExperience.title}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {selectedExperience.priceCredits / 100} credits x{" "}
                      {tickets}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-cedar-100">
                    <span className="font-medium text-gray-700">Total</span>
                    <span className="font-bold text-cedar-700">
                      {totalCost / 100} credits
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Personal Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Personal Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 outline-none h-24 resize-none"
              placeholder="Write a heartfelt message..."
            />
          </div>

          {/* Send Email Toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-cedar-600 focus:ring-cedar-500"
            />
            <span className="text-sm text-gray-700">
              Send notification email to recipient
            </span>
          </label>

          {/* Balance Display */}
          {user && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Your balance</span>
                <span className="font-semibold">
                  {(user.creditBalance / 100).toFixed(0)} credits
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-600">Gift cost</span>
                <span className="font-semibold text-cedar-700">
                  {totalCost / 100} credits
                </span>
              </div>
              {user.creditBalance < totalCost && (
                <p className="text-red-600 text-xs mt-2">
                  Insufficient credits. Please buy more credits first.
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={
              sending ||
              (user ? user.creditBalance < totalCost : false) ||
              (mode === "experience" && !selectedExperienceId)
            }
            className="btn-accent w-full !py-3.5 disabled:opacity-50"
          >
            <Send className="w-5 h-5 mr-2" />
            {sending ? "Sending..." : "Send Gift"}
          </button>

          {!user && (
            <p className="text-center text-sm text-gray-500">
              Please{" "}
              <a href="/login" className="text-cedar-700 font-semibold">
                sign in
              </a>{" "}
              to send a gift.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default function GiftPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-cedar-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <GiftContent />
    </Suspense>
  );
}
