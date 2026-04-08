"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Send,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { api } from "@/lib/api";

interface RegisterForm {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city: string;
  region: string;
  address: string;
  website: string;
  description: string;
  message: string;
}

const initialForm: RegisterForm = {
  businessName: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  city: "",
  region: "",
  address: "",
  website: "",
  description: "",
  message: "",
};

export default function BusinessRegisterPage() {
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof RegisterForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/api/businesses/register", form);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-lg"
        >
          <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Thank You!
          </h1>
          <p className="text-gray-600 text-lg mb-2">
            Your business registration has been submitted successfully.
          </p>
          <p className="text-gray-500">
            Our team will review your application and get back to you at{" "}
            <span className="font-medium text-gray-700">{form.ownerEmail}</span>{" "}
            within a few business days.
          </p>
          <a
            href="/"
            className="inline-block mt-8 btn-primary !py-3 !px-8"
          >
            Back to Home
          </a>
        </motion.div>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 focus:border-transparent outline-none transition";
  const inputWithIconClass =
    "w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 focus:border-transparent outline-none transition";

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 md:py-28 flex items-center bg-cedar-700">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1920&q=80')] bg-cover bg-center opacity-15" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-8 h-8" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Register Your Business
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Join the WeCanDoLeb platform and connect with visitors looking
              for authentic Lebanese experiences. Share your story, reach new
              customers, and grow your business.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
                Business Details
              </h2>
              <p className="text-gray-500 text-sm mb-8">
                Fields marked with <span className="text-red-500">*</span> are
                required.
              </p>

              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={set("businessName")}
                      className={inputWithIconClass}
                      placeholder="e.g. Cedar Mountain Winery"
                      required
                    />
                  </div>
                </div>

                {/* Owner Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Owner Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={form.ownerName}
                        onChange={set("ownerName")}
                        className={inputWithIconClass}
                        placeholder="Full name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Owner Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={form.ownerEmail}
                        onChange={set("ownerEmail")}
                        className={inputWithIconClass}
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Owner Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={form.ownerPhone}
                      onChange={set("ownerPhone")}
                      className={inputWithIconClass}
                      placeholder="+961 XX XXX XXX"
                    />
                  </div>
                </div>

                {/* City & Region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={form.city}
                        onChange={set("city")}
                        className={inputWithIconClass}
                        placeholder="e.g. Byblos"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Region
                    </label>
                    <input
                      type="text"
                      value={form.region}
                      onChange={set("region")}
                      className={inputClass}
                      placeholder="e.g. Mount Lebanon"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={set("address")}
                    className={inputClass}
                    placeholder="Street address"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={form.website}
                      onChange={set("website")}
                      className={inputWithIconClass}
                      placeholder="https://yoursite.com"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={form.description}
                      onChange={set("description")}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 focus:border-transparent outline-none transition resize-none"
                      placeholder="Tell us about your business and the experiences you offer..."
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Additional Message
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      value={form.message}
                      onChange={set("message")}
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 focus:border-transparent outline-none transition resize-none"
                      placeholder="Anything else you'd like us to know?"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full !py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Registration
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
