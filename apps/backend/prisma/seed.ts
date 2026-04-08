import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Categories ─────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "wine-tasting" },
      update: {},
      create: { name: "Wine Tasting", slug: "wine-tasting", description: "Explore Lebanon's 5,000-year wine heritage", sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: "workshops" },
      update: {},
      create: { name: "Workshops", slug: "workshops", description: "Hands-on artisan and craft experiences", sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: "cultural-tours" },
      update: {},
      create: { name: "Cultural Tours", slug: "cultural-tours", description: "Discover Lebanon's rich history and heritage", sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: "outdoor-adventures" },
      update: {},
      create: { name: "Outdoor Adventures", slug: "outdoor-adventures", description: "Hikes, trails, and nature escapes", sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { slug: "culinary" },
      update: {},
      create: { name: "Culinary", slug: "culinary", description: "Taste and cook authentic Lebanese cuisine", sortOrder: 5 },
    }),
    prisma.category.upsert({
      where: { slug: "wellness" },
      update: {},
      create: { name: "Wellness", slug: "wellness", description: "Relaxation, yoga, and self-care retreats", sortOrder: 6 },
    }),
  ]);

  const [wineCat, workshopCat, culturalCat, outdoorCat, culinaryCat, wellnessCat] = categories;

  // ── Super Admin ────────────────────────────────
  const adminHash = await bcrypt.hash("admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@wecandoleb.com" },
    update: {},
    create: {
      email: "admin@wecandoleb.com",
      passwordHash: adminHash,
      firstName: "Admin",
      lastName: "WeCanDoLeb",
      role: "SUPER_ADMIN",
      emailVerified: true,
      creditBalance: 100000,
    },
  });

  // ── Business Owner ─────────────────────────────
  const ownerHash = await bcrypt.hash("owner123!", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@wecandoleb.com" },
    update: {},
    create: {
      email: "owner@wecandoleb.com",
      passwordHash: ownerHash,
      firstName: "Karim",
      lastName: "Haddad",
      role: "BUSINESS_OWNER",
      emailVerified: true,
      creditBalance: 50000,
    },
  });

  // ── Admin ───────────────────────────────────────
  const adminUserHash = await bcrypt.hash("admin123!", 12);
  await prisma.user.upsert({
    where: { email: "moderator@wecandoleb.com" },
    update: {},
    create: {
      email: "moderator@wecandoleb.com",
      passwordHash: adminUserHash,
      firstName: "Nadia",
      lastName: "Saab",
      role: "ADMIN",
      emailVerified: true,
      creditBalance: 50000,
    },
  });

  // ── Demo User ──────────────────────────────────
  const userHash = await bcrypt.hash("user123!", 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "user@wecandoleb.com" },
    update: {},
    create: {
      email: "user@wecandoleb.com",
      passwordHash: userHash,
      firstName: "Lea",
      lastName: "Khalil",
      role: "USER",
      emailVerified: true,
      creditBalance: 15000,
    },
  });

  // ── Businesses ─────────────────────────────────
  const business1 = await prisma.business.upsert({
    where: { id: "biz-batroun-wine" },
    update: {},
    create: {
      id: "biz-batroun-wine",
      name: "Batroun Vineyards Collective",
      description: "A network of family-owned wineries in the heart of Batroun, preserving Lebanon's ancient winemaking traditions.",
      phone: "+961 6 740 000",
      email: "info@batrounwines.lb",
      city: "Batroun",
      region: "North Lebanon",
      isVerified: true,
      ownerId: owner.id,
    },
  });

  const business2 = await prisma.business.upsert({
    where: { id: "biz-tripoli-crafts" },
    update: {},
    create: {
      id: "biz-tripoli-crafts",
      name: "Tripoli Heritage Crafts",
      description: "Artisan workshops preserving the soap-making, metalwork, and textile traditions of Tripoli's historic souks.",
      phone: "+961 6 430 000",
      email: "hello@tripolicroats.lb",
      city: "Tripoli",
      region: "North Lebanon",
      isVerified: true,
      ownerId: owner.id,
    },
  });

  const business3 = await prisma.business.upsert({
    where: { id: "biz-bekaa-tours" },
    update: {},
    create: {
      id: "biz-bekaa-tours",
      name: "Bekaa Valley Experiences",
      description: "Guided tours through Lebanon's premier wine region, including Chateau Kefraya, Ksara, and Massaya.",
      phone: "+961 8 510 000",
      email: "tours@bekaavallev.lb",
      city: "Zahlé",
      region: "Bekaa Valley",
      isVerified: true,
      ownerId: owner.id,
    },
  });

  const business4 = await prisma.business.upsert({
    where: { id: "biz-mountain-adventures" },
    update: {},
    create: {
      id: "biz-mountain-adventures",
      name: "Lebanon Mountain Trails",
      description: "Guided outdoor experiences through Lebanon's most spectacular mountain landscapes.",
      phone: "+961 3 800 000",
      email: "hike@lmt.lb",
      city: "Bsharri",
      region: "North Lebanon",
      isVerified: true,
      ownerId: owner.id,
    },
  });

  // ── 10 Experiences ─────────────────────────────

  const experiences = [
    {
      id: "exp-1",
      title: "Wine Tasting in Batroun",
      slug: "wine-tasting-batroun",
      shortDescription: "Sample premium Lebanese wines at a boutique family vineyard overlooking the Mediterranean.",
      description: `Step into one of Batroun's most beloved family vineyards and discover the art of Lebanese winemaking.

Your host — a third-generation vintner — will walk you through the vineyard, explain the unique terroir of North Lebanon, and guide you through a tasting of 6 different wines including indigenous grape varieties like Obaideh and Merwah.

The experience concludes with a mezze platter of local cheeses, olives, and fresh bread paired with your favorite wine from the tasting.`,
      highlights: ["Guided vineyard tour", "Tasting of 6 premium wines", "Learn about indigenous grape varieties", "Mezze platter included", "Stunning Mediterranean views"],
      includes: ["Wine tasting (6 wines)", "Mezze platter", "Vineyard tour", "Tasting notes booklet"],
      whatToBring: ["Comfortable shoes", "Sun protection", "Camera"],
      priceCredits: 4500,
      priceCurrency: 45,
      duration: 120,
      maxParticipants: 12,
      difficulty: "EASY" as const,
      address: "Batroun Old Souk Road",
      city: "Batroun",
      region: "North Lebanon",
      coverImage: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800&q=80",
      categoryId: wineCat.id,
      businessId: business1.id,
      featured: true,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-2",
      title: "Traditional Soap Making in Tripoli",
      slug: "soap-making-tripoli",
      shortDescription: "Learn the ancient art of Tripoli's famous olive oil soap in a centuries-old Khan workshop.",
      description: `Tripoli has been producing olive oil soap for over 500 years. In this hands-on workshop, you'll enter one of the last traditional soap houses in the historic Khan el-Saboun.

A master soap maker will teach you the cold-process method using pure olive oil, laurel oil, and natural fragrances. You'll craft your own bars of soap to take home, and learn about the history and cultural significance of this ancient Lebanese craft.

The workshop includes a walking tour of the Khan and a cup of traditional Arabic coffee.`,
      highlights: ["Hands-on soap crafting", "Visit centuries-old Khan el-Saboun", "Take home your handmade soap", "Walking tour of historic souk", "Arabic coffee included"],
      includes: ["All materials", "3 handmade soap bars to take home", "Khan walking tour", "Arabic coffee"],
      whatToBring: ["Comfortable clothing", "Closed-toe shoes"],
      priceCredits: 3000,
      priceCurrency: 30,
      duration: 90,
      maxParticipants: 8,
      difficulty: "EASY" as const,
      address: "Khan el-Saboun, Old Souk",
      city: "Tripoli",
      region: "North Lebanon",
      coverImage: "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&q=80",
      categoryId: workshopCat.id,
      businessId: business2.id,
      featured: true,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-3",
      title: "Cedar Forest Guided Hike",
      slug: "cedar-forest-hike-bsharri",
      shortDescription: "Hike through the legendary Cedars of God forest, a UNESCO World Heritage site near Bsharri.",
      description: `Walk among the ancient Cedars of God — trees that have stood for thousands of years and are the symbol of Lebanon itself.

Your certified mountain guide will lead you through the forest, sharing stories of the cedars' significance in Phoenician, Biblical, and modern Lebanese history. The trail continues along a scenic ridge with panoramic views of the Qadisha Valley.

This moderate hike covers approximately 8km round trip and includes a rest stop with freshly brewed mountain tea and local snacks.`,
      highlights: ["UNESCO World Heritage site", "Panoramic Qadisha Valley views", "Expert mountain guide", "Ancient cedars up to 3,000 years old", "Mountain tea & snacks"],
      includes: ["Certified guide", "Mountain tea and snacks", "Walking poles (if needed)"],
      whatToBring: ["Hiking boots", "Water bottle", "Warm layer", "Sun protection", "Camera"],
      priceCredits: 3500,
      priceCurrency: 35,
      duration: 240,
      maxParticipants: 15,
      minParticipants: 2,
      difficulty: "MODERATE" as const,
      address: "Cedars of God, Bsharri",
      city: "Bsharri",
      region: "North Lebanon",
      coverImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
      categoryId: outdoorCat.id,
      businessId: business4.id,
      featured: true,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-4",
      title: "Pottery Workshop in Byblos",
      slug: "pottery-workshop-byblos",
      shortDescription: "Shape clay on a traditional wheel in one of the world's oldest continuously inhabited cities.",
      description: `In the shadow of the ancient Byblos Citadel, discover the art of pottery — a craft practiced in this city for over 7,000 years.

Under the guidance of a local ceramic artist, you'll learn to center clay on a traditional wheel, pull walls, and shape a vessel of your own design. The workshop takes place in a charming studio overlooking the old fishing harbor.

Your finished piece will be kiln-fired and can be picked up later or shipped to you. The session ends with a glass of local wine on the studio terrace.`,
      highlights: ["Traditional wheel-throwing", "Studio overlooking Byblos harbor", "Take home your creation", "Glass of local wine", "7,000 years of pottery heritage"],
      includes: ["All materials & clay", "Kiln firing", "Glass of wine", "Shipping option available"],
      whatToBring: ["Old clothes you don't mind getting dirty", "Hair tie if needed"],
      priceCredits: 3500,
      priceCurrency: 35,
      duration: 120,
      maxParticipants: 6,
      difficulty: "EASY" as const,
      address: "Old Port, Byblos",
      city: "Byblos",
      region: "Mount Lebanon",
      coverImage: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80",
      categoryId: workshopCat.id,
      businessId: business2.id,
      featured: true,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-5",
      title: "Beirut Street Food Tour",
      slug: "beirut-street-food-tour",
      shortDescription: "Taste your way through Beirut's vibrant neighborhoods with a local foodie guide.",
      description: `Discover why Lebanese cuisine is celebrated worldwide on this immersive street food tour through Beirut's most flavorful neighborhoods.

Your food-obsessed local guide will take you through Bourj Hammoud (Armenian quarter), Mar Mikhael, and Gemmayze, stopping at 7 carefully selected spots. You'll taste everything from fresh manakish and falafel to Armenian lahmajoun and kunefe.

Along the way, learn about the cultural melting pot that makes Beirut's food scene unlike any other in the Middle East.`,
      highlights: ["7 food stops", "Bourj Hammoud, Mar Mikhael & Gemmayze", "Armenian & Lebanese specialties", "Local foodie guide", "Drinks included"],
      includes: ["All food tastings (7 stops)", "Local drinks", "Expert food guide", "Neighborhood walking tour"],
      whatToBring: ["Empty stomach!", "Comfortable walking shoes", "Water bottle"],
      priceCredits: 5000,
      priceCurrency: 50,
      duration: 180,
      maxParticipants: 10,
      difficulty: "EASY" as const,
      address: "Meeting point: Sassine Square",
      city: "Beirut",
      region: "Beirut",
      coverImage: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800&q=80",
      categoryId: culinaryCat.id,
      businessId: business1.id,
      featured: true,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-6",
      title: "Bekaa Valley Wine Route",
      slug: "bekaa-valley-wine-route",
      shortDescription: "Visit three legendary Bekaa wineries — Ksara, Kefraya, and Massaya — in one unforgettable day.",
      description: `The Bekaa Valley is the cradle of Lebanese wine. This full-day tour takes you to three of its most iconic estates.

Start at Chateau Ksara — Lebanon's oldest winery with its famous Roman-era caves. Continue to Chateau Kefraya with its stunning estate and flagship reds. End at Massaya for a sunset tasting on their panoramic terrace.

Each stop includes a guided tour and tasting of 3-4 wines. A traditional Lebanese lunch is served at a local restaurant between the second and third winery.`,
      highlights: ["Three iconic wineries", "Roman-era Ksara caves", "Traditional Lebanese lunch", "Sunset tasting at Massaya", "Transportation included"],
      includes: ["Transport from/to Beirut", "Three winery tours & tastings", "Traditional lunch", "Wine guide"],
      whatToBring: ["Comfortable shoes", "Sun hat", "Camera", "Light jacket"],
      priceCredits: 9500,
      priceCurrency: 95,
      duration: 480,
      maxParticipants: 8,
      difficulty: "EASY" as const,
      address: "Pickup: Downtown Beirut",
      city: "Zahlé",
      region: "Bekaa Valley",
      coverImage: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&q=80",
      categoryId: wineCat.id,
      businessId: business3.id,
      featured: true,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-7",
      title: "Coffee Roasting Workshop",
      slug: "coffee-roasting-workshop-beirut",
      shortDescription: "Master the art of Lebanese-style coffee roasting and brewing in a specialty roastery.",
      description: `Lebanese coffee culture runs deep. In this intimate workshop at a Beirut specialty roastery, you'll learn every step of the process — from selecting green beans to roasting on a traditional rakweh.

Your barista host will teach you the differences between Lebanese, Turkish, and specialty coffee preparation. You'll roast your own small batch using a hand-cranked roaster and learn the art of reading the roast.

Take home 250g of your own roasted coffee and a traditional finjan to brew it in.`,
      highlights: ["Roast your own coffee beans", "Traditional hand-cranked roaster", "Learn Lebanese coffee ceremony", "Take home coffee & finjan", "Tasting of 4 brewing methods"],
      includes: ["All materials", "250g roasted coffee to take home", "Traditional finjan", "Pastries"],
      whatToBring: ["Curiosity!", "Notebook if you like"],
      priceCredits: 4000,
      priceCurrency: 40,
      duration: 120,
      maxParticipants: 8,
      difficulty: "EASY" as const,
      address: "Mar Mikhael, Armenia Street",
      city: "Beirut",
      region: "Beirut",
      coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80",
      categoryId: culinaryCat.id,
      businessId: business1.id,
      featured: false,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-8",
      title: "Chouf Cedar Reserve Trail",
      slug: "chouf-cedar-reserve-trail",
      shortDescription: "Trek through the largest remaining cedar forest in Lebanon with a professional naturalist.",
      description: `The Chouf Cedar Nature Reserve covers 5% of Lebanon's total area and is home to the country's largest cedar forests. This guided trail takes you deep into the reserve on a path rarely visited by tourists.

Your naturalist guide will help you spot local wildlife including gazelles, wolves, and rare bird species. The trail winds through three distinct ecosystems — from Mediterranean scrubland to alpine cedar groves.

Enjoy a picnic lunch prepared with local organic ingredients at a scenic overlook with views stretching to the Bekaa Valley.`,
      highlights: ["Lebanon's largest cedar forest", "Wildlife spotting", "Three distinct ecosystems", "Organic picnic lunch", "Professional naturalist guide"],
      includes: ["Naturalist guide", "Organic picnic lunch", "Reserve entry fee", "Trail map"],
      whatToBring: ["Hiking boots", "2L water", "Warm layers", "Binoculars (optional)", "Sun protection"],
      priceCredits: 4500,
      priceCurrency: 45,
      duration: 300,
      maxParticipants: 12,
      minParticipants: 2,
      difficulty: "MODERATE" as const,
      address: "Barouk Entrance, Chouf Reserve",
      city: "Barouk",
      region: "Mount Lebanon",
      coverImage: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
      categoryId: outdoorCat.id,
      businessId: business4.id,
      featured: false,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-9",
      title: "Byblos Old City Walking Tour",
      slug: "byblos-old-city-walking-tour",
      shortDescription: "Walk through 7,000 years of history in the world's oldest continuously inhabited city.",
      description: `Byblos (Jbeil) has been continuously inhabited for over 7,000 years. This walking tour takes you through layers of Phoenician, Roman, Crusader, and Ottoman history.

Your historian guide will bring the ruins to life as you explore the Crusader Castle, Roman amphitheater, Royal Necropolis, and the ancient harbor where the Phoenicians invented the alphabet.

The tour ends at the picturesque old souk where you'll enjoy a seafood lunch at a harbor-side restaurant with views of the fishing boats.`,
      highlights: ["7,000 years of history", "Crusader Castle & Roman ruins", "Birthplace of the alphabet", "Harbor-side seafood lunch", "Expert historian guide"],
      includes: ["Historian guide", "Site entrance fees", "Seafood lunch", "Map & historical booklet"],
      whatToBring: ["Comfortable walking shoes", "Sun protection", "Camera", "Water"],
      priceCredits: 5500,
      priceCurrency: 55,
      duration: 210,
      maxParticipants: 12,
      difficulty: "EASY" as const,
      address: "Byblos Entrance, Main Square",
      city: "Byblos",
      region: "Mount Lebanon",
      coverImage: "https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&q=80",
      categoryId: culturalCat.id,
      businessId: business2.id,
      featured: false,
      averageRating: 0,
      totalReviews: 0,
    },
    {
      id: "exp-10",
      title: "Mountain Yoga Retreat in Ehden",
      slug: "mountain-yoga-retreat-ehden",
      shortDescription: "A half-day yoga and mindfulness retreat in the serene mountain village of Ehden.",
      description: `Escape to the mountains of Ehden for a transformative half-day yoga and mindfulness retreat. Set in a beautifully restored stone house surrounded by pine forests, this experience offers a rare chance to disconnect and recharge.

The retreat includes two yoga sessions (Vinyasa flow and restorative Yin), a guided meditation with views of the valley, and a healthy plant-based lunch prepared with ingredients from the garden.

Whether you're a beginner or experienced practitioner, this retreat is designed to leave you feeling refreshed and centered.`,
      highlights: ["Vinyasa & Yin yoga sessions", "Guided mountain meditation", "Plant-based organic lunch", "Historic stone house setting", "Suitable for all levels"],
      includes: ["Yoga mats & props", "Two yoga sessions", "Guided meditation", "Organic lunch", "Herbal tea"],
      whatToBring: ["Comfortable yoga clothes", "Light jacket", "Water bottle", "Open mind"],
      priceCredits: 6000,
      priceCurrency: 60,
      duration: 300,
      maxParticipants: 10,
      difficulty: "EASY" as const,
      address: "Ehden Village, North Lebanon",
      city: "Ehden",
      region: "North Lebanon",
      coverImage: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80",
      categoryId: wellnessCat.id,
      businessId: business4.id,
      featured: false,
      averageRating: 0,
      totalReviews: 0,
    },
  ];

  for (const exp of experiences) {
    const { id, ...data } = exp;
    await prisma.experience.upsert({
      where: { id },
      update: {},
      create: { id, ...data, status: "ACTIVE" },
    });

    // Create sessions for each experience (next 4 weekends)
    for (let week = 1; week <= 4; week++) {
      const date = new Date();
      date.setDate(date.getDate() + (week * 7) - date.getDay() + 6); // Next Saturday
      date.setHours(10, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setMinutes(endDate.getMinutes() + data.duration);

      await prisma.experienceSession.upsert({
        where: { id: `session-${id}-week${week}` },
        update: {},
        create: {
          id: `session-${id}-week${week}`,
          experienceId: id,
          startTime: date,
          endTime: endDate,
          spotsLeft: data.maxParticipants,
        },
      });
    }
  }

  // ── Credit Packages ────────────────────────────
  const packages = [
    { id: "pkg-starter", name: "Starter", credits: 2500, priceUsd: 25, bonus: 0, sortOrder: 1 },
    { id: "pkg-explorer", name: "Explorer", credits: 5000, priceUsd: 48, bonus: 500, sortOrder: 2 },
    { id: "pkg-adventurer", name: "Adventurer", credits: 10000, priceUsd: 90, bonus: 1500, sortOrder: 3 },
  ];

  for (const pkg of packages) {
    const { id, ...data } = pkg;
    await prisma.creditPackage.upsert({
      where: { id },
      update: {},
      create: { id, ...data },
    });
  }

  // ── Extra Demo Users for Reviews ─────────────
  const reviewerHashes = await Promise.all([
    bcrypt.hash("reviewer1!", 12),
    bcrypt.hash("reviewer2!", 12),
    bcrypt.hash("reviewer3!", 12),
  ]);

  const reviewer1 = await prisma.user.upsert({
    where: { email: "maya@example.com" },
    update: {},
    create: { email: "maya@example.com", passwordHash: reviewerHashes[0], firstName: "Maya", lastName: "Farah", role: "USER", emailVerified: true, creditBalance: 5000 },
  });
  const reviewer2 = await prisma.user.upsert({
    where: { email: "sami@example.com" },
    update: {},
    create: { email: "sami@example.com", passwordHash: reviewerHashes[1], firstName: "Sami", lastName: "Nassar", role: "USER", emailVerified: true, creditBalance: 5000 },
  });
  const reviewer3 = await prisma.user.upsert({
    where: { email: "rania@example.com" },
    update: {},
    create: { email: "rania@example.com", passwordHash: reviewerHashes[2], firstName: "Rania", lastName: "Khoury", role: "USER", emailVerified: true, creditBalance: 5000 },
  });

  // ── Completed Bookings & Real Reviews ─────────
  const reviewers = [demoUser, reviewer1, reviewer2, reviewer3];

  const reviewData: { expId: string; reviews: { userId: string; rating: number; comment: string }[] }[] = [
    {
      expId: "exp-1",
      reviews: [
        { userId: demoUser.id, rating: 5, comment: "An incredible wine tasting experience! The host was so knowledgeable about indigenous grape varieties. The mezze pairing was perfect." },
        { userId: reviewer1.id, rating: 5, comment: "Loved learning about Obaideh and Merwah grapes. The vineyard views were breathtaking." },
        { userId: reviewer2.id, rating: 4, comment: "Great wines and beautiful setting. Wish we had more time at the vineyard." },
        { userId: reviewer3.id, rating: 5, comment: "Best wine experience in Lebanon hands down. The family's passion for winemaking is contagious!" },
      ],
    },
    {
      expId: "exp-2",
      reviews: [
        { userId: demoUser.id, rating: 4, comment: "Such a unique workshop! Making soap in a centuries-old Khan was surreal. My soap bars turned out great." },
        { userId: reviewer1.id, rating: 5, comment: "Absolutely loved this. The master soap maker was fascinating and the walking tour of the Khan was a bonus." },
        { userId: reviewer2.id, rating: 5, comment: "A hidden gem in Tripoli. The olive oil soap we made smells amazing." },
      ],
    },
    {
      expId: "exp-3",
      reviews: [
        { userId: demoUser.id, rating: 5, comment: "Walking among 3,000-year-old cedars was a spiritual experience. The guide brought the history to life." },
        { userId: reviewer1.id, rating: 5, comment: "The Qadisha Valley views alone are worth it. Mountain tea at the rest stop was the cherry on top." },
        { userId: reviewer2.id, rating: 5, comment: "Our guide was phenomenal — so much knowledge about the ecology and history of the cedars." },
        { userId: reviewer3.id, rating: 4, comment: "Beautiful hike. The trail was moderate but manageable. Bring good shoes!" },
      ],
    },
    {
      expId: "exp-4",
      reviews: [
        { userId: reviewer1.id, rating: 5, comment: "What a magical setting! Pottery wheel with harbor views — doesn't get better than this." },
        { userId: reviewer3.id, rating: 4, comment: "Super fun even as a complete beginner. My bowl turned out... creative. Wine at the end was a nice touch." },
      ],
    },
    {
      expId: "exp-5",
      reviews: [
        { userId: demoUser.id, rating: 5, comment: "Best food tour I've ever done! Every single stop was incredible. The lahmajoun in Bourj Hammoud was life-changing." },
        { userId: reviewer1.id, rating: 5, comment: "Our guide knew every shop owner personally. The kunefe was the best I've ever had." },
        { userId: reviewer2.id, rating: 4, comment: "So much food! Come hungry. The Armenian quarter was my favorite part." },
        { userId: reviewer3.id, rating: 5, comment: "A perfect introduction to Beirut's food scene. Learned so much about the cultural diversity." },
      ],
    },
    {
      expId: "exp-6",
      reviews: [
        { userId: demoUser.id, rating: 5, comment: "Three legendary wineries in one day — absolute perfection. The Ksara caves were mesmerizing." },
        { userId: reviewer2.id, rating: 5, comment: "Sunset tasting at Massaya was magical. The guide really knows Lebanese wine." },
        { userId: reviewer3.id, rating: 5, comment: "Worth every credit. The lunch between wineries was outstanding. A full day of indulgence." },
      ],
    },
    {
      expId: "exp-7",
      reviews: [
        { userId: reviewer1.id, rating: 5, comment: "I had no idea Lebanese coffee had such a rich tradition. Roasting my own beans was incredible." },
        { userId: reviewer2.id, rating: 4, comment: "Great workshop, learned a lot about different brewing methods. The take-home finjan is beautiful." },
      ],
    },
    {
      expId: "exp-8",
      reviews: [
        { userId: demoUser.id, rating: 5, comment: "The Chouf reserve is massive and gorgeous. Our naturalist spotted a gazelle! Organic picnic was chef's kiss." },
        { userId: reviewer3.id, rating: 4, comment: "Challenging but rewarding hike. The three ecosystem changes were fascinating to see." },
      ],
    },
    {
      expId: "exp-9",
      reviews: [
        { userId: demoUser.id, rating: 5, comment: "7,000 years of history brought to life. Our guide was basically a walking encyclopedia of Byblos." },
        { userId: reviewer1.id, rating: 5, comment: "The Crusader Castle and harbor are stunning. Seafood lunch was the perfect ending." },
        { userId: reviewer2.id, rating: 5, comment: "This tour gave me goosebumps. Standing where the Phoenicians invented the alphabet — incredible." },
        { userId: reviewer3.id, rating: 4, comment: "Very informative and beautiful. Wish we had more time at the old souk." },
      ],
    },
    {
      expId: "exp-10",
      reviews: [
        { userId: reviewer1.id, rating: 5, comment: "Exactly what I needed. The mountain setting is so peaceful and the yoga instructor was wonderful." },
        { userId: reviewer2.id, rating: 4, comment: "Beautiful retreat in Ehden. The organic lunch was delicious. Very restorative." },
        { userId: reviewer3.id, rating: 5, comment: "Left feeling completely recharged. The stone house setting is magical — highly recommend!" },
      ],
    },
  ];

  for (const { expId, reviews } of reviewData) {
    const sessionId = `session-${expId}-week1`;

    for (const rev of reviews) {
      // Create a completed booking for this reviewer
      const bookingId = `booking-${expId}-${rev.userId.slice(-6)}`;
      await prisma.booking.upsert({
        where: { id: bookingId },
        update: {},
        create: {
          id: bookingId,
          userId: rev.userId,
          experienceId: expId,
          sessionId,
          participants: 1,
          totalCredits: 0, // comp'd for seeding
          status: "COMPLETED",
        },
      });

      // Create the review
      const reviewId = `review-${expId}-${rev.userId.slice(-6)}`;
      await prisma.review.upsert({
        where: { id: reviewId },
        update: {},
        create: {
          id: reviewId,
          userId: rev.userId,
          experienceId: expId,
          rating: rev.rating,
          comment: rev.comment,
        },
      });
    }

    // Recalculate averageRating & totalReviews
    const agg = await prisma.review.aggregate({
      where: { experienceId: expId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.experience.update({
      where: { id: expId },
      data: {
        averageRating: Math.round((agg._avg.rating || 0) * 10) / 10,
        totalReviews: agg._count,
      },
    });
  }

  console.log("Seed complete!");
  console.log("  - 6 categories");
  console.log("  - 7 users (superadmin, admin, business owner, 4 demo/reviewer users)");
  console.log("  - 4 businesses");
  console.log("  - 10 experiences with sessions");
  console.log("  - 3 credit packages");
  console.log("  - Real bookings & reviews for all experiences");
  console.log("");
  console.log("Login credentials:");
  console.log("  Super Admin: admin@wecandoleb.com / admin123!");
  console.log("  Admin: moderator@wecandoleb.com / admin123!");
  console.log("  Business Owner: owner@wecandoleb.com / owner123!");
  console.log("  Demo User: user@wecandoleb.com / user123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
