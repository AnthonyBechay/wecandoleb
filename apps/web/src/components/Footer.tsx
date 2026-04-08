import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cedar-500 to-cedar-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm">W</span>
              </div>
              <span className="font-display text-xl font-bold text-white">WeCanDoLeb</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Discover and gift unique experiences across Lebanon. From wine tasting in the Bekaa Valley to artisan workshops in the mountains.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-white font-semibold mb-4">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/experiences" className="hover:text-white transition">All Experiences</Link></li>
              <li><Link href="/experiences?category=wine-tasting" className="hover:text-white transition">Wine Tasting</Link></li>
              <li><Link href="/experiences?category=workshops" className="hover:text-white transition">Workshops</Link></li>
              <li><Link href="/experiences?category=cultural-tours" className="hover:text-white transition">Cultural Tours</Link></li>
              <li><Link href="/experiences?category=outdoor-adventures" className="hover:text-white transition">Outdoor Adventures</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="/gift" className="hover:text-white transition">Gift Experiences</Link></li>
              <li><Link href="/business/register" className="hover:text-white transition">List Your Business</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/faq" className="hover:text-white transition">FAQ</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} WeCanDoLeb. All rights reserved.</p>
          <p className="text-sm text-gray-500">Made with love in Lebanon</p>
        </div>
      </div>
    </footer>
  );
}
