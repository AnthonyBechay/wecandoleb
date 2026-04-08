import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "../lib/prisma";

export function configurePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn("Google OAuth credentials not configured — skipping Google strategy");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: "/api/auth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"));

          let user = await prisma.user.findUnique({ where: { email } });

          if (user) {
            // Link Google account if not already linked
            if (!user.googleId) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  googleId: profile.id,
                  avatarUrl: user.avatarUrl || profile.photos?.[0]?.value,
                  emailVerified: true,
                },
              });
            }
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                email,
                firstName: profile.name?.givenName || "User",
                lastName: profile.name?.familyName || "",
                googleId: profile.id,
                authProvider: "GOOGLE",
                avatarUrl: profile.photos?.[0]?.value,
                emailVerified: true,
              },
            });
          }

          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );
}
