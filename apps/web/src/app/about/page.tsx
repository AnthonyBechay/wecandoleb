"use client";

import Link from "next/link";
import { Mountain, Wine, Palette, Heart, MapPin, Star } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1579606032821-4e6161c81571?w=1920&q=80)" }}
        />
        <div className="absolute inset-0 bg-gray-900/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <div>
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">About Lebanon</h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              A land of ancient cedars, Mediterranean shores, and a culture that celebrates hospitality, food, and art.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="section-title">Our Mission</h2>
            <p className="text-gray-600 mt-4 text-lg leading-relaxed max-w-3xl mx-auto">
              WeCanDoLeb is a platform that connects people with the authentic soul of Lebanon.
              We curate unique experiences — from wine tastings in family vineyards to artisan workshops
              in historic cities — and make it easy to gift these moments to loved ones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Heart className="w-7 h-7" />, title: "Gift Culture", desc: "We believe the best gifts are experiences. Share the magic of Lebanon with the people you care about." },
              { icon: <MapPin className="w-7 h-7" />, title: "Local Treasures", desc: "Every experience is hosted by passionate locals who take pride in sharing their craft and heritage." },
              { icon: <Star className="w-7 h-7" />, title: "Curated Quality", desc: "Each experience is hand-picked and vetted to ensure an unforgettable adventure for every visitor." },
            ].map((item, i) => (
              <div key={item.title}
                className="text-center">
                <div className="w-14 h-14 rounded-xl bg-cedar-50 text-cedar-700 flex items-center justify-center mx-auto mb-4">{item.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center mb-12">Why Lebanon?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Wine className="w-8 h-8" />, title: "5,000+ Years of Wine", desc: "One of the oldest wine-producing regions in the world." },
              { icon: <Mountain className="w-8 h-8" />, title: "Cedars & Mountains", desc: "Ski in the morning, swim in the afternoon." },
              { icon: <Palette className="w-8 h-8" />, title: "Artisan Heritage", desc: "Soap-making, pottery, and crafts passed through generations." },
              { icon: <Heart className="w-8 h-8" />, title: "World-Class Hospitality", desc: "Lebanese generosity and warmth are legendary." },
            ].map((item, i) => (
              <div key={item.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
                <div className="text-cedar-600 mb-3 flex justify-center">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-cedar-800 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready to Explore?</h2>
          <p className="text-cedar-200 mb-8">Start discovering unique experiences or gift them to someone special.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/experiences" className="btn-accent !py-4 !px-8">Browse Experiences</Link>
            <Link href="/gift" className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition">
              Gift Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
