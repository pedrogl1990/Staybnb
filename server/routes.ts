import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import { signToken, authMiddleware, optionalAuth } from "./auth";
import * as storage from "./storage";
import { db } from "./db";
import { users, listings } from "@shared/schema";
import { SEED_LISTINGS } from "../data/categories";
import { eq } from "drizzle-orm";

async function seedDatabase() {
  try {
    const count = await storage.getListingCount();
    if (count > 0) return; // Already seeded

    console.log("Seeding database with sample listings...");

    // Create a demo host user
    const demoPassword = process.env.DEMO_PASSWORD || "demo123456";
    const passwordHash = await bcrypt.hash(demoPassword, 10);
    const hostRows = await db
      .insert(users)
      .values({
        email: "host@stayfinder.demo",
        password_hash: passwordHash,
        name: "Demo Host",
        role: "host",
        bio: "Passionate traveler and host with properties around the world.",
        avatar_url:
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
      })
      .returning();

    const host = hostRows[0];

    for (const seed of SEED_LISTINGS) {
      await db.insert(listings).values({
        host_id: host.id,
        ...seed,
      });
    }

    console.log(`Seeded ${SEED_LISTINGS.length} listings successfully.`);
  } catch (err) {
    console.error("Seed error (safe to ignore if tables exist):", err);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed on startup
  await seedDatabase();

  // ─── Auth Routes ──────────────────────────────────────────────────────────

  // POST /api/auth/register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ message: "Email, password, and name are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }
    if (!["guest", "host"].includes(role)) {
      res.status(400).json({ message: "Role must be guest or host" });
      return;
    }

    const existing = await storage.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({ email, password_hash, name, role: role || "guest" });

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url, bio: user.bio },
    });
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role, name: user.name });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url, bio: user.bio },
    });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", authMiddleware, async (req: Request, res: Response) => {
    const user = await storage.getUserById(req.user!.userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url, bio: user.bio });
  });

  // PUT /api/auth/profile
  app.put("/api/auth/profile", authMiddleware, async (req: Request, res: Response) => {
    const { name, bio, avatar_url } = req.body;
    const updated = await storage.updateUser(req.user!.userId, { name, bio, avatar_url });
    if (!updated) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ id: updated.id, email: updated.email, name: updated.name, role: updated.role, avatar_url: updated.avatar_url, bio: updated.bio });
  });

  // ─── Listing Routes ───────────────────────────────────────────────────────

  // GET /api/listings
  app.get("/api/listings", optionalAuth, async (req: Request, res: Response) => {
    const { category, city, guests } = req.query;
    const listingsData = await storage.getListings({
      category: category as string,
      city: city as string,
      minGuests: guests ? parseInt(guests as string) : undefined,
    });
    res.json(listingsData);
  });

  // GET /api/listings/host/mine
  app.get("/api/listings/host/mine", authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== "host") {
      res.status(403).json({ message: "Only hosts can access this endpoint" });
      return;
    }
    const myListings = await storage.getListingsByHost(req.user!.userId);
    res.json(myListings);
  });

  // GET /api/listings/:id
  app.get("/api/listings/:id", optionalAuth, async (req: Request, res: Response) => {
    const listing = await storage.getListingById(req.params.id);
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    // Include wishlist status if user is authenticated
    let isWishlisted = false;
    if (req.user) {
      isWishlisted = await storage.isInWishlist(req.user.userId, listing.id);
    }

    res.json({ ...listing, isWishlisted });
  });

  // POST /api/listings
  app.post("/api/listings", authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== "host") {
      res.status(403).json({ message: "Only hosts can create listings" });
      return;
    }

    const {
      title, description, location, city, country,
      price_per_night, max_guests, bedrooms, beds, bathrooms,
      amenities, photos, category, latitude, longitude,
    } = req.body;

    if (!title || !description || !location || !city || !country || !price_per_night || !category) {
      res.status(400).json({ message: "Required fields missing" });
      return;
    }

    const listing = await storage.createListing({
      host_id: req.user!.userId,
      title, description, location, city, country,
      price_per_night: Math.round(price_per_night * 100), // store in cents
      max_guests: max_guests || 1,
      bedrooms: bedrooms || 1,
      beds: beds || 1,
      bathrooms: bathrooms || 1,
      amenities: amenities || [],
      photos: photos || [],
      category,
      latitude: latitude || null,
      longitude: longitude || null,
      is_active: true,
    });

    res.status(201).json(listing);
  });

  // PUT /api/listings/:id
  app.put("/api/listings/:id", authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== "host") {
      res.status(403).json({ message: "Only hosts can update listings" });
      return;
    }

    const updated = await storage.updateListing(req.params.id, req.user!.userId, req.body);
    if (!updated) {
      res.status(404).json({ message: "Listing not found or not authorized" });
      return;
    }
    res.json(updated);
  });

  // DELETE /api/listings/:id
  app.delete("/api/listings/:id", authMiddleware, async (req: Request, res: Response) => {
    const success = await storage.deleteListing(req.params.id, req.user!.userId);
    if (!success) {
      res.status(404).json({ message: "Listing not found or not authorized" });
      return;
    }
    res.json({ message: "Listing deleted" });
  });

  // ─── Booking Routes ───────────────────────────────────────────────────────

  // POST /api/bookings
  app.post("/api/bookings", authMiddleware, async (req: Request, res: Response) => {
    const { listing_id, check_in, check_out, guests_count } = req.body;

    if (!listing_id || !check_in || !check_out) {
      res.status(400).json({ message: "listing_id, check_in, and check_out are required" });
      return;
    }

    if (check_in >= check_out) {
      res.status(400).json({ message: "check_out must be after check_in" });
      return;
    }

    const listing = await storage.getListingById(listing_id);
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    // Prevent hosts from booking their own listing
    if (listing.host_id === req.user!.userId) {
      res.status(400).json({ message: "Hosts cannot book their own listings" });
      return;
    }

    // Check availability (no double booking)
    const available = await storage.checkAvailability(listing_id, check_in, check_out);
    if (!available) {
      res.status(409).json({ message: "Listing is not available for the selected dates" });
      return;
    }

    // Calculate total price
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const total_price = listing.price_per_night * nights;

    const booking = await storage.createBooking({
      listing_id,
      guest_id: req.user!.userId,
      check_in,
      check_out,
      guests_count: guests_count || 1,
      total_price,
    });

    res.status(201).json({ ...booking, nights, listing_price_per_night: listing.price_per_night });
  });

  // GET /api/bookings/mine
  app.get("/api/bookings/mine", authMiddleware, async (req: Request, res: Response) => {
    const myBookings = await storage.getBookingsByGuest(req.user!.userId);
    res.json(myBookings);
  });

  // GET /api/bookings/host
  app.get("/api/bookings/host", authMiddleware, async (req: Request, res: Response) => {
    if (req.user!.role !== "host") {
      res.status(403).json({ message: "Only hosts can access this endpoint" });
      return;
    }
    const hostBookings = await storage.getBookingsByHost(req.user!.userId);
    res.json(hostBookings);
  });

  // PUT /api/bookings/:id/cancel
  app.put("/api/bookings/:id/cancel", authMiddleware, async (req: Request, res: Response) => {
    const cancelled = await storage.cancelBooking(req.params.id, req.user!.userId);
    if (!cancelled) {
      res.status(404).json({ message: "Booking not found or not authorized" });
      return;
    }
    res.json(cancelled);
  });

  // PUT /api/bookings/:id/confirm
  app.put("/api/bookings/:id/confirm", authMiddleware, async (req: Request, res: Response) => {
    const confirmed = await storage.confirmBooking(req.params.id, req.user!.userId);
    if (!confirmed) {
      res.status(404).json({ message: "Booking not found or not authorized" });
      return;
    }
    res.json(confirmed);
  });

  // ─── Wishlist Routes ──────────────────────────────────────────────────────

  // GET /api/wishlists
  app.get("/api/wishlists", authMiddleware, async (req: Request, res: Response) => {
    const wishlist = await storage.getWishlist(req.user!.userId);
    res.json(wishlist);
  });

  // POST /api/wishlists/:listingId
  app.post("/api/wishlists/:listingId", authMiddleware, async (req: Request, res: Response) => {
    const result = await storage.toggleWishlist(req.user!.userId, req.params.listingId);
    res.json(result);
  });

  const httpServer = createServer(app);
  return httpServer;
}
