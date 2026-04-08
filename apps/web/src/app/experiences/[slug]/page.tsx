"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Star, Check, ArrowLeft, Gift, Calendar, Mountain, Send } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Experience {
  id: string; title: string; shortDescription: string; description: string;
  highlights: string[]; includes: string[]; whatToBring: string[];
  priceCredits: number; priceCurrency: number; duration: number;
  maxParticipants: number; minParticipants: number; difficulty: string;
  minAge: number | null; address: string; city: string; region: string;
  coverImage: string | null; averageRating: number; totalReviews: number;
  category: { name: string; slug: string };
  business: { id: string; name: string; description: string | null; phone: string | null; email: string | null };
  images: { id: string; url: string; alt: string | null }[];
  sessions: { id: string; startTime: string; endTime: string; spotsLeft: number }[];
  reviews: { id: string; rating: number; comment: string | null; user: { firstName: string; lastName: string; avatarUrl: string | null }; createdAt: string }[];
}

export default function ExperienceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [exp, setExp] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [participants, setParticipants] = useState(1);
  const [booking, setBooking] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    api.get<Experience>(`/api/experiences/${slug}`)
      .then((data) => { setExp(data); if (data.sessions.length > 0) setSelectedSession(data.sessions[0].id); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleBook = async () => {
    if (!user) { router.push("/login"); return; }
    if (!selectedSession) return;
    setBooking(true);
    try {
      await api.post("/api/bookings", { experienceId: exp!.id, sessionId: selectedSession, participants });
      router.push("/bookings");
    } catch (err: any) {
      alert(err.message || "Booking failed");
    } finally { setBooking(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-cedar-600 border-t-transparent rounded-full animate-spin" /></div>;
  if (!exp) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Experience not found</p></div>;

  const allImages = exp.coverImage ? [{ url: exp.coverImage, alt: exp.title }, ...exp.images] : exp.images;
  const totalCredits = exp.priceCredits * participants;

  return (
    <div className="min-h-screen bg-white">
      {/* Back */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      {/* Image gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[400px] lg:h-[500px]">
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-cedar-100 to-sunset-100">
            {allImages.length > 0 ? (
              <img src={allImages[activeImage]?.url} alt={exp.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Mountain className="w-24 h-24 text-cedar-300" /></div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {allImages.slice(1, 5).map((img, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden bg-gray-100 cursor-pointer" onClick={() => setActiveImage(i + 1)}>
                  <img src={img.url} alt={img.alt || ""} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <span className="text-sm font-semibold text-cedar-600">{exp.category.name}</span>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mt-1">{exp.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {exp.city}, {exp.region}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {exp.duration} min</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Up to {exp.maxParticipants} people</span>
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> {exp.averageRating} ({exp.totalReviews} reviews)</span>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">About This Experience</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{exp.description}</p>
            </div>

            {exp.highlights.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Highlights</h2>
                <ul className="space-y-2">
                  {exp.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600"><Check className="w-5 h-5 text-cedar-600 mt-0.5 flex-shrink-0" />{h}</li>
                  ))}
                </ul>
              </div>
            )}

            {exp.includes.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">What&apos;s Included</h2>
                <ul className="space-y-2">
                  {exp.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-600"><Check className="w-5 h-5 text-cedar-600 mt-0.5 flex-shrink-0" />{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Host info */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Hosted by {exp.business.name}</h2>
              {exp.business.description && <p className="text-gray-600 mb-3">{exp.business.description}</p>}
            </div>

            {/* Review Submission */}
            {user && (
              <ReviewForm experienceId={exp.id} userId={user.id} existingReviews={exp.reviews} onReviewSubmitted={(review) => {
                setExp((prev) => prev ? {
                  ...prev,
                  reviews: [review, ...prev.reviews.filter((r) => r.user.firstName !== review.user.firstName || r.user.lastName !== review.user.lastName)],
                  totalReviews: prev.reviews.some((r) => r.user.firstName === review.user.firstName && r.user.lastName === review.user.lastName) ? prev.totalReviews : prev.totalReviews + 1,
                } : prev);
              }} />
            )}

            {/* Reviews */}
            {exp.reviews.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Reviews ({exp.reviews.length})</h2>
                <div className="space-y-4">
                  {exp.reviews.map((review) => (
                    <div key={review.id} className="border border-gray-100 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-cedar-100 flex items-center justify-center text-cedar-700 font-semibold">
                          {review.user.firstName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{review.user.firstName} {review.user.lastName[0]}.</p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && <p className="text-gray-600 text-sm">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-lg p-6 space-y-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-bold text-cedar-700">${exp.priceCurrency}</span>
                  <span className="text-gray-500 text-sm"> / person</span>
                </div>
                <span className="text-sm text-gray-500">{exp.priceCredits / 100} credits</span>
              </div>

              {exp.sessions.length > 0 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Date</label>
                    <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 outline-none">
                      {exp.sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {" "}({s.spotsLeft} spots left)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Participants</label>
                    <select value={participants} onChange={(e) => setParticipants(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 outline-none">
                      {Array.from({ length: exp.maxParticipants }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? "person" : "people"}</option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">${exp.priceCurrency} x {participants}</span>
                      <span className="font-semibold">${exp.priceCurrency * participants}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Credits needed</span>
                      <span className="font-semibold text-cedar-700">{totalCredits / 100} credits</span>
                    </div>
                  </div>

                  <button onClick={handleBook} disabled={booking}
                    className="btn-primary w-full !py-3.5 disabled:opacity-50">
                    <Calendar className="w-5 h-5 mr-2" />
                    {booking ? "Booking..." : "Book Now"}
                  </button>
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">No sessions available right now</p>
              )}

              <Link href={`/gift?experience=${exp.id}`} className="btn-accent w-full !py-3.5 text-center block">
                <Gift className="w-5 h-5 mr-2 inline" /> Gift This Experience
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ experienceId, userId, existingReviews, onReviewSubmitted }: {
  experienceId: string;
  userId: string;
  existingReviews: Experience["reviews"];
  onReviewSubmitted: (review: Experience["reviews"][0]) => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await api.post<any>("/api/reviews", { experienceId, rating, comment });
      setSuccess(true);
      onReviewSubmitted({
        id: result.id,
        rating: result.rating,
        comment: result.comment,
        user: { firstName: user!.firstName, lastName: user!.lastName, avatarUrl: null },
        createdAt: result.createdAt,
      });
    } catch (err: any) {
      setError(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-cedar-50 border border-cedar-200 rounded-xl p-5">
        <p className="text-cedar-700 font-medium">Thank you for your review!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Leave a Review</h2>
      <form onSubmit={handleSubmit} className="border border-gray-100 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)}>
                <Star className={`w-7 h-7 transition ${(hoverRating || rating) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Review</label>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cedar-500 outline-none h-24 resize-none"
            placeholder="Share your experience..." />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary !py-2.5 disabled:opacity-50">
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Review"}
        </button>
        <p className="text-xs text-gray-400">You must have a completed booking to leave a review.</p>
      </form>
    </div>
  );
}
