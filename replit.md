# StayFinder — Airbnb-style Booking App

A full-stack production-ready mobile booking application built with Expo React Native + Express + PostgreSQL.

## Architecture

**Frontend**: Expo React Native (SDK 54) with Expo Router (file-based routing)
**Backend**: Node.js + Express (TypeScript)
**Database**: PostgreSQL via Drizzle ORM (Replit-hosted)
**Auth**: JWT (jsonwebtoken) + bcrypt password hashing
**State**: React Query + React Context + AsyncStorage

## Project Structure

```
app/
  _layout.tsx          # Root layout with QueryClient, AuthProvider
  (tabs)/
    _layout.tsx        # Tab bar (NativeTabs + classic fallback)
    index.tsx          # Explore screen (browse listings)
    wishlists.tsx      # Saved listings
    trips.tsx          # Booking history
    inbox.tsx          # Booking notifications
    profile.tsx        # User profile & settings
  listing/
    [id].tsx           # Listing detail + booking modal
    create.tsx         # Multi-step listing creation (hosts only)
  auth/
    login.tsx          # Login screen
    register.tsx       # Registration screen

server/
  index.ts             # Express server setup
  routes.ts            # All API endpoints + DB seed
  storage.ts           # Drizzle DB operations
  auth.ts              # JWT sign/verify middleware
  db.ts                # Drizzle/pg connection

shared/
  schema.ts            # Drizzle schema: users, listings, bookings, wishlists

context/
  AuthContext.tsx      # Auth state (user, token, login/logout)

components/
  ListingCard.tsx      # Animated listing card
  CategoryFilter.tsx   # Horizontal category filter chips
  ErrorBoundary.tsx    # Error boundary
  ErrorFallback.tsx    # Error fallback UI

data/
  categories.ts        # Categories, amenities, and seed listing data

lib/
  query-client.ts      # React Query client + apiRequest with JWT auth
```

## Features

### Authentication
- Email/password registration with role selection (Guest or Host)
- JWT token stored in AsyncStorage
- Demo account: host@stayfinder.demo / demo123456

### For Guests
- Browse 12+ seed listings with beautiful photos
- Filter by category (Beachfront, Mountains, City, etc.)
- Search by city name
- View listing details (photos, amenities, host info)
- Save to wishlists (heart icon)
- Book stays with date selection and guest count
- View all bookings (Trips tab)
- Cancel upcoming reservations

### For Hosts
- Create listings via 4-step wizard
- Manage listing details (title, description, location, pricing, amenities)
- View booking requests in Inbox tab

### Double-booking Prevention
The backend checks for date overlaps before confirming any booking.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login |
| GET | /api/auth/me | JWT | Get current user |
| PUT | /api/auth/profile | JWT | Update profile |
| GET | /api/listings | Optional | Browse listings |
| GET | /api/listings/:id | Optional | Listing detail |
| POST | /api/listings | Host JWT | Create listing |
| PUT | /api/listings/:id | Host JWT | Update listing |
| DELETE | /api/listings/:id | Host JWT | Delete listing |
| GET | /api/listings/host/mine | Host JWT | My listings |
| POST | /api/bookings | Guest JWT | Create booking |
| GET | /api/bookings/mine | JWT | My bookings |
| GET | /api/bookings/host | Host JWT | My listing bookings |
| PUT | /api/bookings/:id/cancel | JWT | Cancel booking |
| PUT | /api/bookings/:id/confirm | Host JWT | Confirm booking |
| GET | /api/wishlists | JWT | Get wishlists |
| POST | /api/wishlists/:listingId | JWT | Toggle wishlist |

## Running Locally

1. Start backend: `npm run server:dev` (port 5000)
2. Start frontend: `npm run expo:dev` (port 8081)
3. Database migrations: `npm run db:push`

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `SESSION_SECRET` — Express session secret
- `EXPO_PUBLIC_DOMAIN` — Domain for API calls (auto-set in dev)

## Design System

- Primary: `#FF385C` (Airbnb coral)
- Background: `#FFFFFF`
- Text: `#222222`
- Text Secondary: `#717171`
- Success: `#00A699`
- Font: Inter (400, 500, 600, 700)
