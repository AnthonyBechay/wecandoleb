"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Star, MapPin, Clock, ArrowRight, Wine, Palette, Mountain, Utensils, Leaf, Music } from "lucide-react";
import { api } from "@/lib/api";

interface Experience {
  id: string;
  title: string;
  shortDescription: string;
  coverImage: string | null;
  priceCredits: number;
  priceCurrency: number;
  duration: number;
  city: string;
  region: string;
  averageRating: number;
  totalReviews: number;
  slug: string;
  category: { name: string; slug: string };
  business: { name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { experiences: number };
}

const categoryIcons: Record<string, React.ReactNode> = {
  "wine-tasting": <Wine className="w-6 h-6" />,
  "workshops": <Palette className="w-6 h-6" />,
  "outdoor-adventures": <Mountain className="w-6 h-6" />,
  "culinary": <Utensils className="w-6 h-6" />,
  "cultural-tours": <Leaf className="w-6 h-6" />,
  "wellness": <Music className="w-6 h-6" />,
};

const heroImages = [
  "https://images.unsplash.com/photo-1579606032821-4e6161c81571?w=1920&q=80",
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1920&q=80",
  "https://images.unsplash.com/photo-1549144511-f099e773c147?w=1920&q=80",
];

export default function HomePage() {
  const [featured, setFeatured] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    api.get<Experience[]>("/api/experiences/featured").then(setFeatured).catch(() => {});
    api.get<Category[]>("/api/experiences/meta/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setHeroIdx((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[600px] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          {heroImages.map((img, i) => (
            <div
              key={img}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: heroIdx === i ? 1 : 0 }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${img})` }}
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/50 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white/90 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Gift className="w-4 h-4" />
              Gift Unforgettable Moments
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
              Discover the <br />
              <span className="text-cedar-400">Magic of Lebanon</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
              From wine cellars in Batroun to artisan soap workshops in Tripoli — gift or book one-of-a-kind experiences that celebrate Lebanese heritage.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/experiences" className="btn-primary text-base !py-4 !px-8">
                Explore Experiences
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link href="/gift" className="btn-accent text-base !py-4 !px-8">
                <Gift className="w-5 h-5 mr-2" />
                Gift Someone Special
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-6 h-10 border-2 border-white/40 rounded-full flex items-start justify-center p-1"
          >
            <div className="w-1.5 h-3 bg-white/60 rounded-full" />
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle mx-auto mt-4">Three simple steps to share the joy of Lebanese culture</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Choose an Experience", desc: "Browse curated activities from wine tastings to mountain hikes across Lebanon.", icon: <MapPin className="w-7 h-7" /> },
              { step: "02", title: "Purchase Credits or Gift", desc: "Buy credits for yourself or send a personalized gift card to someone special.", icon: <Gift className="w-7 h-7" /> },
              { step: "03", title: "Book & Enjoy", desc: "Pick a date, show up, and create memories that last a lifetime.", icon: <Star className="w-7 h-7" /> },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-cedar-50 text-cedar-700 flex items-center justify-center mx-auto mb-5">
                  {item.icon}
                </div>
                <span className="text-xs font-bold text-cedar-500 tracking-wider uppercase">Step {item.step}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-2 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="section-title">Explore by Category</h2>
              <p className="section-subtitle mt-3">Find the perfect experience for every taste</p>
            </div>
            <Link href="/experiences" className="hidden md:flex items-center gap-1 text-cedar-700 font-semibold hover:text-cedar-800 transition">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(categories.length > 0
              ? categories
              : [
                  { id: "1", name: "Wine Tasting", slug: "wine-tasting", _count: { experiences: 0 } },
                  { id: "2", name: "Workshops", slug: "workshops", _count: { experiences: 0 } },
                  { id: "3", name: "Cultural Tours", slug: "cultural-tours", _count: { experiences: 0 } },
                  { id: "4", name: "Outdoor Adventures", slug: "outdoor-adventures", _count: { experiences: 0 } },
                  { id: "5", name: "Culinary", slug: "culinary", _count: { experiences: 0 } },
                  { id: "6", name: "Wellness", slug: "wellness", _count: { experiences: 0 } },
                ]
            ).map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/experiences?category=${cat.slug}`}
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-gray-50 hover:bg-cedar-50 hover:border-cedar-200 border border-gray-100 transition-all group"
                >
                  <div className="text-gray-400 group-hover:text-cedar-600 transition">
                    {categoryIcons[cat.slug] || <Leaf className="w-6 h-6" />}
                  </div>
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-cedar-700 transition">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Experiences */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="section-title">Featured Experiences</h2>
              <p className="section-subtitle mt-3">Hand-picked activities that showcase the best of Lebanon</p>
            </div>
            <Link href="/experiences" className="hidden md:flex items-center gap-1 text-cedar-700 font-semibold hover:text-cedar-800 transition">
              See All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(featured.length > 0
              ? featured
              : Array.from({ length: 6 }, (_, i) => ({
                  id: `placeholder-${i}`,
                  title: ["Wine Tasting in Batroun", "Soap Making in Tripoli", "Cedar Forest Hike", "Pottery Workshop in Byblos", "Beirut Food Tour", "Chouf Mountain Trail"][i],
                  shortDescription: "Discover the beauty and heritage of Lebanon through this unique experience.",
                  coverImage: null,
                  priceCredits: [4500, 3000, 2500, 3500, 4000, 2000][i],
                  priceCurrency: [45, 30, 25, 35, 40, 20][i],
                  duration: [120, 90, 180, 120, 150, 240][i],
                  city: ["Batroun", "Tripoli", "Bsharri", "Byblos", "Beirut", "Chouf"][i],
                  region: "Lebanon",
                  averageRating: [4.8, 4.6, 4.9, 4.7, 4.8, 4.5][i],
                  totalReviews: [24, 18, 31, 15, 42, 12][i],
                  slug: `experience-${i}`,
                  category: { name: ["Wine", "Workshop", "Hiking", "Workshop", "Food", "Hiking"][i], slug: "cat" },
                  business: { name: "Local Partner" },
                }))
            ).map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/experiences/${exp.slug}`} className="card group block">
                  <div className="relative h-56 bg-gradient-to-br from-cedar-100 to-sunset-100 overflow-hidden">
                    {exp.coverImage ? (
                      <img src={exp.coverImage} alt={exp.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Mountain className="w-16 h-16 text-cedar-300" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm text-xs font-semibold text-cedar-700 px-2.5 py-1 rounded-lg">
                        {exp.category.name}
                      </span>
                    </div>
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
                      <div className="text-right">
                        <span className="text-lg font-bold text-cedar-700">${exp.priceCurrency}</span>
                        <span className="text-xs text-gray-400 block">{exp.priceCredits / 100} credits</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Gift CTA */}
      <section className="py-20 bg-gradient-to-br from-cedar-700 via-cedar-800 to-cedar-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Gift className="w-12 h-12 mx-auto mb-6 text-cedar-300" />
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-5">
              Give the Gift of Experience
            </h2>
            <p className="text-lg text-cedar-200 max-w-2xl mx-auto mb-8">
              Forget ordinary gifts. Give someone special the chance to explore Lebanon&apos;s hidden treasures — from vineyard tours to mountain retreats.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/gift" className="btn-accent text-base !py-4 !px-8">
                <Gift className="w-5 h-5 mr-2" /> Send a Gift Card
              </Link>
              <Link href="/credits" className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition">
                Buy Credits
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Regions */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Explore by Region</h2>
            <p className="section-subtitle mx-auto mt-3">Lebanon is small but endlessly diverse</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Beirut", desc: "The vibrant capital", img: "https://images.unsplash.com/photo-1579606032821-4e6161c81571?w=600&q=75" },
              { name: "Mount Lebanon", desc: "Mountains & heritage", img: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&q=75" },
              { name: "North Lebanon", desc: "Tripoli, Batroun & beyond", img: "https://images.unsplash.com/photo-1549144511-f099e773c147?w=600&q=75" },
              { name: "Bekaa Valley", desc: "Wine country", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=75" },
            ].map((region, i) => (
              <motion.div
                key={region.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/experiences?region=${region.name}`} className="relative group block h-64 rounded-2xl overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                    style={{ backgroundImage: `url(${region.img})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-lg font-bold text-white">{region.name}</h3>
                    <p className="text-sm text-white/70">{region.desc}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
