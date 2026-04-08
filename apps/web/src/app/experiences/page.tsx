"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, MapPin, Clock, Star, Filter, Mountain } from "lucide-react";
import { api } from "@/lib/api";

interface Experience {
  id: string; title: string; shortDescription: string; coverImage: string | null;
  priceCredits: number; priceCurrency: number; duration: number; city: string;
  averageRating: number; totalReviews: number; slug: string;
  category: { name: string; slug: string }; business: { name: string };
  images: { url: string }[];
}

interface Category { id: string; name: string; slug: string; _count: { experiences: number } }

function ExperiencesContent() {
  const searchParams = useSearchParams();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "");
  const [activeRegion, setActiveRegion] = useState(searchParams.get("region") || "");

  const fetchExperiences = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeCategory) params.set("category", activeCategory);
      if (activeRegion) params.set("region", activeRegion);
      const data = await api.get<{ experiences: Experience[] }>(`/api/experiences?${params}`);
      setExperiences(data.experiences);
    } catch { /* empty */ } finally { setLoading(false); }
  }, [search, activeCategory, activeRegion]);

  useEffect(() => { fetchExperiences(); }, [fetchExperiences]);
  useEffect(() => {
    api.get<Category[]>("/api/experiences/meta/categories").then(setCategories).catch(() => {});
  }, []);

  const regions = ["Beirut", "Mount Lebanon", "North Lebanon", "Bekaa Valley", "South Lebanon"];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-6">All Experiences</h1>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search experiences, cities..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 focus:border-transparent outline-none" />
            </div>
            <select value={activeRegion} onChange={(e) => setActiveRegion(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 outline-none bg-white">
              <option value="">All Regions</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => setActiveCategory("")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${!activeCategory ? "bg-cedar-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              All
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeCategory === cat.slug ? "bg-cedar-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {cat.name} ({cat._count.experiences})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse"><div className="h-56 bg-gray-200" /><div className="p-5 space-y-3"><div className="h-4 bg-gray-200 rounded w-3/4" /><div className="h-4 bg-gray-200 rounded w-1/2" /></div></div>
            ))}
          </div>
        ) : experiences.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {experiences.map((exp, i) => (
              <div key={exp.id}>
                <Link href={`/experiences/${exp.slug}`} className="card group block">
                  <div className="relative h-56 bg-gradient-to-br from-cedar-100 to-sunset-100 overflow-hidden">
                    {exp.coverImage || exp.images?.[0]?.url ? (
                      <img src={exp.coverImage || exp.images[0].url} alt={exp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Mountain className="w-16 h-16 text-cedar-300" /></div>
                    )}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold text-cedar-700 px-2.5 py-1 rounded-lg">{exp.category.name}</span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <MapPin className="w-3.5 h-3.5" /> {exp.city}
                      <span className="text-gray-300">|</span>
                      <Clock className="w-3.5 h-3.5" /> {exp.duration}min
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-cedar-700 transition mb-2">{exp.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{exp.shortDescription}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-semibold">{exp.averageRating}</span>
                        <span className="text-xs text-gray-400">({exp.totalReviews})</span>
                      </div>
                      <span className="text-lg font-bold text-cedar-700">${exp.priceCurrency}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No experiences found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ExperiencesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-cedar-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <ExperiencesContent />
    </Suspense>
  );
}
