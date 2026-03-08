import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: text("name").notNull(),
  avatar_url: text("avatar_url"),
  role: text("role").notNull().default("guest"),
  bio: text("bio"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const listings = pgTable("listings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  host_id: varchar("host_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  price_per_night: integer("price_per_night").notNull(),
  max_guests: integer("max_guests").notNull().default(1),
  bedrooms: integer("bedrooms").notNull().default(1),
  beds: integer("beds").notNull().default(1),
  bathrooms: real("bathrooms").notNull().default(1),
  amenities: text("amenities")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  photos: text("photos")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  category: text("category").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  listing_id: varchar("listing_id")
    .notNull()
    .references(() => listings.id),
  guest_id: varchar("guest_id")
    .notNull()
    .references(() => users.id),
  check_in: text("check_in").notNull(),
  check_out: text("check_out").notNull(),
  guests_count: integer("guests_count").notNull().default(1),
  total_price: integer("total_price").notNull(),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const wishlists = pgTable("wishlists", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_id: varchar("user_id")
    .notNull()
    .references(() => users.id),
  listing_id: varchar("listing_id")
    .notNull()
    .references(() => listings.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  name: true,
  role: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  created_at: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  created_at: true,
  status: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Wishlist = typeof wishlists.$inferSelect;
