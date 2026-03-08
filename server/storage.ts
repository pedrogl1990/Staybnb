import { db } from "./db";
import { eq, and, or, lte, gte, lt, gt, ne, ilike, not } from "drizzle-orm";
import { users, listings, bookings, wishlists } from "@shared/schema";
import type { User, Listing, Booking, Wishlist } from "@shared/schema";

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserById(id: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return rows[0];
}

export async function createUser(data: {
  email: string;
  password_hash: string;
  name: string;
  role: string;
}): Promise<User> {
  const rows = await db
    .insert(users)
    .values({ ...data, email: data.email.toLowerCase() })
    .returning();
  return rows[0];
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, "name" | "avatar_url" | "bio" | "role">>
): Promise<User | undefined> {
  const rows = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
  return rows[0];
}

// ─── Listings ─────────────────────────────────────────────────────────────────

export async function getListings(filters?: {
  category?: string;
  city?: string;
  minGuests?: number;
}): Promise<(Listing & { host: Pick<User, "id" | "name" | "avatar_url"> })[]> {
  let query = db
    .select({
      id: listings.id,
      host_id: listings.host_id,
      title: listings.title,
      description: listings.description,
      location: listings.location,
      city: listings.city,
      country: listings.country,
      price_per_night: listings.price_per_night,
      max_guests: listings.max_guests,
      bedrooms: listings.bedrooms,
      beds: listings.beds,
      bathrooms: listings.bathrooms,
      amenities: listings.amenities,
      photos: listings.photos,
      category: listings.category,
      latitude: listings.latitude,
      longitude: listings.longitude,
      is_active: listings.is_active,
      created_at: listings.created_at,
      host: {
        id: users.id,
        name: users.name,
        avatar_url: users.avatar_url,
      },
    })
    .from(listings)
    .leftJoin(users, eq(listings.host_id, users.id))
    .where(eq(listings.is_active, true));

  const rows = await query;

  let filtered = rows as any[];

  if (filters?.category && filters.category !== "all") {
    filtered = filtered.filter((l) => l.category === filters.category);
  }
  if (filters?.city) {
    filtered = filtered.filter((l) =>
      l.city.toLowerCase().includes(filters.city!.toLowerCase())
    );
  }
  if (filters?.minGuests) {
    filtered = filtered.filter((l) => l.max_guests >= filters.minGuests!);
  }

  return filtered;
}

export async function getListingById(
  id: string
): Promise<(Listing & { host: Pick<User, "id" | "name" | "avatar_url" | "bio"> }) | undefined> {
  const rows = await db
    .select({
      id: listings.id,
      host_id: listings.host_id,
      title: listings.title,
      description: listings.description,
      location: listings.location,
      city: listings.city,
      country: listings.country,
      price_per_night: listings.price_per_night,
      max_guests: listings.max_guests,
      bedrooms: listings.bedrooms,
      beds: listings.beds,
      bathrooms: listings.bathrooms,
      amenities: listings.amenities,
      photos: listings.photos,
      category: listings.category,
      latitude: listings.latitude,
      longitude: listings.longitude,
      is_active: listings.is_active,
      created_at: listings.created_at,
      host: {
        id: users.id,
        name: users.name,
        avatar_url: users.avatar_url,
        bio: users.bio,
      },
    })
    .from(listings)
    .leftJoin(users, eq(listings.host_id, users.id))
    .where(eq(listings.id, id))
    .limit(1);

  return rows[0] as any;
}

export async function getListingsByHost(hostId: string): Promise<Listing[]> {
  return db
    .select()
    .from(listings)
    .where(eq(listings.host_id, hostId))
    .orderBy(listings.created_at);
}

export async function createListing(data: Omit<Listing, "id" | "created_at">): Promise<Listing> {
  const rows = await db.insert(listings).values(data).returning();
  return rows[0];
}

export async function updateListing(
  id: string,
  hostId: string,
  data: Partial<Omit<Listing, "id" | "host_id" | "created_at">>
): Promise<Listing | undefined> {
  const rows = await db
    .update(listings)
    .set(data)
    .where(and(eq(listings.id, id), eq(listings.host_id, hostId)))
    .returning();
  return rows[0];
}

export async function deleteListing(id: string, hostId: string): Promise<boolean> {
  const rows = await db
    .update(listings)
    .set({ is_active: false })
    .where(and(eq(listings.id, id), eq(listings.host_id, hostId)))
    .returning();
  return rows.length > 0;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function checkAvailability(
  listingId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
): Promise<boolean> {
  // Returns true if available (no conflicts)
  let conditions: any = and(
    eq(bookings.listing_id, listingId),
    ne(bookings.status, "cancelled"),
    // Overlap: existing booking overlaps with requested range
    lt(bookings.check_in, checkOut),
    gt(bookings.check_out, checkIn)
  );

  if (excludeBookingId) {
    conditions = and(conditions, ne(bookings.id, excludeBookingId));
  }

  const conflicts = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(conditions)
    .limit(1);

  return conflicts.length === 0;
}

export async function createBooking(data: {
  listing_id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  guests_count: number;
  total_price: number;
}): Promise<Booking> {
  const rows = await db.insert(bookings).values(data).returning();
  return rows[0];
}

export async function getBookingsByGuest(
  guestId: string
): Promise<(Booking & { listing: Pick<Listing, "id" | "title" | "photos" | "location" | "city"> })[]> {
  const rows = await db
    .select({
      id: bookings.id,
      listing_id: bookings.listing_id,
      guest_id: bookings.guest_id,
      check_in: bookings.check_in,
      check_out: bookings.check_out,
      guests_count: bookings.guests_count,
      total_price: bookings.total_price,
      status: bookings.status,
      created_at: bookings.created_at,
      listing: {
        id: listings.id,
        title: listings.title,
        photos: listings.photos,
        location: listings.location,
        city: listings.city,
      },
    })
    .from(bookings)
    .leftJoin(listings, eq(bookings.listing_id, listings.id))
    .where(eq(bookings.guest_id, guestId))
    .orderBy(bookings.created_at);

  return rows as any[];
}

export async function getBookingsByHost(
  hostId: string
): Promise<(Booking & { listing: Pick<Listing, "id" | "title" | "photos">; guest: Pick<User, "id" | "name"> })[]> {
  const guestUsers = db.select().from(users).as("guest_users");

  const rows = await db
    .select({
      id: bookings.id,
      listing_id: bookings.listing_id,
      guest_id: bookings.guest_id,
      check_in: bookings.check_in,
      check_out: bookings.check_out,
      guests_count: bookings.guests_count,
      total_price: bookings.total_price,
      status: bookings.status,
      created_at: bookings.created_at,
      listing: {
        id: listings.id,
        title: listings.title,
        photos: listings.photos,
      },
    })
    .from(bookings)
    .leftJoin(listings, eq(bookings.listing_id, listings.id))
    .where(eq(listings.host_id, hostId))
    .orderBy(bookings.created_at);

  return rows as any[];
}

export async function cancelBooking(
  id: string,
  userId: string
): Promise<Booking | undefined> {
  // User can cancel their own booking
  const rows = await db
    .update(bookings)
    .set({ status: "cancelled" })
    .where(and(eq(bookings.id, id), eq(bookings.guest_id, userId)))
    .returning();
  return rows[0];
}

export async function confirmBooking(
  id: string,
  hostId: string
): Promise<Booking | undefined> {
  // Host confirms a booking by checking they own the listing
  const booking = await db
    .select({ id: bookings.id, listing_id: bookings.listing_id })
    .from(bookings)
    .where(eq(bookings.id, id))
    .limit(1);

  if (!booking[0]) return undefined;

  const listing = await db
    .select({ host_id: listings.host_id })
    .from(listings)
    .where(and(eq(listings.id, booking[0].listing_id), eq(listings.host_id, hostId)))
    .limit(1);

  if (!listing[0]) return undefined;

  const rows = await db
    .update(bookings)
    .set({ status: "confirmed" })
    .where(eq(bookings.id, id))
    .returning();
  return rows[0];
}

// ─── Wishlists ────────────────────────────────────────────────────────────────

export async function getWishlist(
  userId: string
): Promise<(Wishlist & { listing: Listing & { host: Pick<User, "id" | "name" | "avatar_url"> } })[]> {
  const rows = await db
    .select({
      id: wishlists.id,
      user_id: wishlists.user_id,
      listing_id: wishlists.listing_id,
      created_at: wishlists.created_at,
      listing: {
        id: listings.id,
        host_id: listings.host_id,
        title: listings.title,
        description: listings.description,
        location: listings.location,
        city: listings.city,
        country: listings.country,
        price_per_night: listings.price_per_night,
        max_guests: listings.max_guests,
        bedrooms: listings.bedrooms,
        beds: listings.beds,
        bathrooms: listings.bathrooms,
        amenities: listings.amenities,
        photos: listings.photos,
        category: listings.category,
        latitude: listings.latitude,
        longitude: listings.longitude,
        is_active: listings.is_active,
        created_at: listings.created_at,
      },
    })
    .from(wishlists)
    .leftJoin(listings, eq(wishlists.listing_id, listings.id))
    .where(eq(wishlists.user_id, userId));

  return rows as any[];
}

export async function toggleWishlist(
  userId: string,
  listingId: string
): Promise<{ added: boolean }> {
  const existing = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.user_id, userId), eq(wishlists.listing_id, listingId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(wishlists)
      .where(and(eq(wishlists.user_id, userId), eq(wishlists.listing_id, listingId)));
    return { added: false };
  } else {
    await db.insert(wishlists).values({ user_id: userId, listing_id: listingId });
    return { added: true };
  }
}

export async function isInWishlist(userId: string, listingId: string): Promise<boolean> {
  const rows = await db
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(and(eq(wishlists.user_id, userId), eq(wishlists.listing_id, listingId)))
    .limit(1);
  return rows.length > 0;
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function getSeedHostId(): Promise<string | undefined> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, "host@stayfinder.demo"))
    .limit(1);
  return rows[0]?.id;
}

export async function getListingCount(): Promise<number> {
  const rows = await db.select({ id: listings.id }).from(listings);
  return rows.length;
}
