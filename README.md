# StayFinder

A full-stack Airbnb-inspired mobile app built with React Native (Expo) and Node.js. Users can browse property listings, make bookings, manage wishlists, and hosts can list and manage their properties.

## Features

**Guests**
- Browse listings with category and location filters
- View detailed property pages (photos, amenities, host info)
- Book properties with date selection and real-time availability check
- Manage trips and cancel bookings
- Save listings to wishlists

**Hosts**
- Create and manage property listings
- View and confirm incoming bookings
- Dedicated host dashboard

**Auth**
- Register / login with JWT authentication
- Secure token storage via `expo-secure-store`
- Guest and host roles

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo SDK 54, Expo Router |
| Language | TypeScript |
| State / Data | TanStack Query |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL, Drizzle ORM |
| Auth | JWT, bcryptjs |
| Validation | Zod |

## Project Structure

```
├── app/                  # Expo Router screens
│   ├── (tabs)/           # Main tab navigation (Home, Trips, Wishlists, Profile)
│   ├── auth/             # Login & Register
│   └── listing/          # Listing detail & create
├── components/           # Shared UI components
├── context/              # Auth context
├── server/               # Express API
│   ├── auth.ts           # JWT middleware
│   ├── db.ts             # Database connection
│   ├── routes.ts         # API endpoints
│   └── storage.ts        # Data access layer
└── shared/
    └── schema.ts         # Drizzle schema + Zod types
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/profile` | Update profile |
| GET | `/api/listings` | List properties (filterable) |
| GET | `/api/listings/:id` | Property detail |
| POST | `/api/listings` | Create listing (host) |
| PUT | `/api/listings/:id` | Update listing (host) |
| DELETE | `/api/listings/:id` | Delete listing (host) |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/mine` | My trips |
| GET | `/api/bookings/host` | Bookings for host |
| PUT | `/api/bookings/:id/cancel` | Cancel booking |
| PUT | `/api/bookings/:id/confirm` | Confirm booking (host) |
| GET | `/api/wishlists` | My wishlist |
| POST | `/api/wishlists/:listingId` | Toggle wishlist |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Expo Go app (for mobile) or a simulator

### Setup

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET

# Push database schema
npm run db:push

# Start the API server
npm run server:dev

# Start the Expo client (in a separate terminal)
npm run expo:dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-here          # min 32 chars, use: openssl rand -hex 32
DEMO_PASSWORD=demo123456             # optional, for seeded demo account
```

## Demo Account

The database seeds a demo host account on first start:

```
Email:    host@stayfinder.demo
Password: demo123456
```

## Database Schema

```
users       — id, email, password_hash, name, avatar_url, role, bio
listings    — id, host_id, title, description, location, city, country,
              price_per_night, max_guests, bedrooms, beds, bathrooms,
              amenities[], photos[], category, latitude, longitude
bookings    — id, listing_id, guest_id, check_in, check_out,
              guests_count, total_price, status
wishlists   — id, user_id, listing_id
```
