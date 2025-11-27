# Pași de Pelerin - Implementation Tasks

## Current Status Overview
- ✅ Basic UI structure implemented (onboarding, profile, pilgrimages, candle, dashboard, navigation)
- ❌ No backend integration (Lovable Cloud/Supabase)
- ❌ No authentication system
- ❌ All data is hardcoded (no database)
- ❌ No persistent storage

---

## PHASE 1: BACKEND FOUNDATION & AUTHENTICATION
**Priority: HIGH | Status: NOT STARTED**

### 1.1 Enable Lovable Cloud
- [ ] Enable Lovable Cloud for the project
- [ ] Verify database is created and accessible
- [ ] Review Cloud dashboard and configuration

### 1.2 Database Schema Setup
- [ ] Create `profiles` table with columns:
  - id (uuid, PK, references auth.users.id)
  - first_name (text)
  - last_name (text)
  - age (int)
  - city (text)
  - parish (text)
  - photo_url (text)
  - religion (text, default 'Orthodox')
  - created_at (timestamp)
  - updated_at (timestamp)
- [ ] Create `pilgrimages` table with columns:
  - id (uuid, PK)
  - title (text)
  - description (text)
  - location (text)
  - start_date (date)
  - end_date (date)
  - type (text) // 'local' or 'national'
  - image_url (text)
  - participant_count (int, default 0)
  - created_at (timestamp)
- [ ] Create `user_pilgrimages` join table:
  - id (uuid, PK)
  - user_id (uuid, FK → profiles.id)
  - pilgrimage_id (uuid, FK → pilgrimages.id)
  - joined_at (timestamp)
  - UNIQUE constraint on (user_id, pilgrimage_id)
- [ ] Create `past_pilgrimages` table:
  - id (uuid, PK)
  - user_id (uuid, FK → profiles.id)
  - place (text)
  - period (text)
  - impressions (text)
  - created_at (timestamp)
- [ ] Create `posts` table:
  - id (uuid, PK)
  - pilgrimage_id (uuid, FK → pilgrimages.id)
  - user_id (uuid, FK → profiles.id)
  - content (text)
  - created_at (timestamp)
  - updated_at (timestamp)
- [ ] Create `comments` table:
  - id (uuid, PK)
  - post_id (uuid, FK → posts.id)
  - user_id (uuid, FK → profiles.id)
  - content (text)
  - created_at (timestamp)
- [ ] Create `post_likes` table:
  - id (uuid, PK)
  - post_id (uuid, FK → posts.id)
  - user_id (uuid, FK → profiles.id)
  - created_at (timestamp)
  - UNIQUE constraint on (post_id, user_id)
- [ ] Create `candle_purchases` table:
  - id (uuid, PK)
  - user_id (uuid, FK → profiles.id)
  - lit_at (timestamp)
  - expires_at (timestamp)
  - intent (text, nullable)
  - created_at (timestamp)

### 1.3 Row Level Security (RLS) Policies
- [ ] Enable RLS on all tables
- [ ] Create RLS policy for `profiles`: users can read all, update only their own
- [ ] Create RLS policy for `pilgrimages`: public read access
- [ ] Create RLS policy for `user_pilgrimages`: users can read all, insert/delete only their own
- [ ] Create RLS policy for `past_pilgrimages`: users can only access their own
- [ ] Create RLS policy for `posts`: read all, insert/update/delete only their own
- [ ] Create RLS policy for `comments`: read all, insert/update/delete only their own
- [ ] Create RLS policy for `post_likes`: read all, insert/delete only their own
- [ ] Create RLS policy for `candle_purchases`: users can only access their own

### 1.4 Database Triggers & Functions
- [ ] Create trigger function `handle_new_user()` to auto-create profile on signup
- [ ] Create trigger `on_auth_user_created` to call `handle_new_user()`
- [ ] Create function to update `participant_count` on pilgrimages when users join/leave

### 1.5 Seed Initial Data
- [ ] Insert sample pilgrimages (Bobotează 2025, Sf. Parascheva, etc.)
- [ ] Verify data is accessible through database

### 1.6 Storage Setup
- [ ] Create storage bucket `profile-photos` for user profile pictures
- [ ] Set bucket to public access
- [ ] Create RLS policies for profile-photos bucket
- [ ] Create storage bucket `pilgrimage-images` for pilgrimage photos
- [ ] Set appropriate RLS policies

### 1.7 Authentication Implementation
- [x] Create `/auth` page for login/signup
- [x] Implement email/password signup flow
- [x] Implement email/password login flow
- [x] Add proper error handling and validation (use zod)
- [x] Add auth state management with `onAuthStateChange`
- [x] Implement session persistence
- [x] Add logout functionality
- [x] Add protected route logic (redirect to /auth if not logged in)
- [x] Add auto-redirect to dashboard if already logged in (on /auth page)
- [ ] Disable "Confirm email" in Supabase settings for faster testing

**Testing checklist for Phase 1:**
- [ ] User can sign up with email/password
- [ ] User can log in with email/password
- [ ] Profile is automatically created on signup
- [ ] Session persists on page refresh
- [ ] User can log out
- [ ] Protected routes redirect to /auth when not authenticated

---

## PHASE 2: ONBOARDING FLOW INTEGRATION
**Priority: HIGH | Status: COMPLETED**

### 2.1 Connect Onboarding to Backend
- [x] Update Onboarding.tsx to save data to Supabase `profiles` table
- [x] Implement profile photo upload to `profile-photos` storage bucket (using base64 for MVP)
- [x] Save past pilgrimages to `past_pilgrimages` table
- [x] Add loading states during form submission
- [x] Add error handling with toast notifications
- [x] Redirect to dashboard after successful onboarding
- [x] Add validation for all form fields

### 2.2 First-Time User Flow
- [x] Check if user has completed onboarding (profile data exists)
- [x] Redirect new users to /onboarding if profile incomplete
- [x] Skip onboarding if profile already exists

**Testing checklist for Phase 2:**
- [x] New user goes through onboarding after signup
- [x] Profile data is saved to database
- [x] Profile photo uploads successfully
- [x] Past pilgrimages are saved
- [x] User is redirected to dashboard
- [x] Returning users skip onboarding

---

## PHASE 3: PROFILE PAGE INTEGRATION
**Priority: HIGH | Status: PARTIALLY COMPLETED**

### 3.1 Connect Profile to Backend
- [x] Fetch user profile data from `profiles` table
- [x] Fetch user's past pilgrimages from `past_pilgrimages` table
- [x] Fetch user's upcoming pilgrimages from `user_pilgrimages` join
- [x] Display profile photo from storage
- [x] Add loading states while fetching data
- [x] Add error handling

### 3.2 Edit Profile Functionality
- [x] Create edit profile form/modal
- [x] Allow users to update: name, age, city, parish, photo
- [x] Implement photo update with storage
- [x] Add validation
- [x] Save changes to database
- [x] Show success/error feedback

### 3.3 Manage Past Pilgrimages
- [ ] Allow users to add new past pilgrimages
- [ ] Allow users to edit past pilgrimages
- [ ] Allow users to delete past pilgrimages
- [ ] Update UI in real-time

**Testing checklist for Phase 3:**
- [x] Profile page displays correct user data
- [x] Past pilgrimages are displayed
- [x] Upcoming pilgrimages are displayed
- [x] User can edit profile information
- [x] User can update profile photo
- [ ] User can manage past pilgrimages

---

## PHASE 4: PILGRIMAGES INTEGRATION
**Priority: HIGH | Status: IN PROGRESS**

### 4.1 Pilgrimages List Page
- [x] Fetch pilgrimages from database instead of hardcoded data
- [x] Implement filtering by type (local/national/all)
- [x] Add search functionality (by title, location)
- [x] Implement filters:
  - [x] By date range
  - [x] By location/city
  - [x] By type (local/national)
- [x] Show participant count from database
- [x] Add loading states
- [x] Add error handling
- [x] Add empty state if no pilgrimages found

### 4.2 Pilgrimage Detail Page
- [x] Fetch pilgrimage details from database by ID
- [x] Check if current user has joined this pilgrimage
- [x] Implement "Join Pilgrimage" functionality:
  - [x] Insert into `user_pilgrimages` table
  - [x] Update participant count
  - [x] Update UI state
  - [x] Show success message
- [x] Display participant list with avatars and city
- [x] Show map link if available
- [x] Add loading states with Skeleton components
- [x] Add error handling for join/leave actions
- [ ] Implement "Leave Pilgrimage" functionality (optional)

### 4.3 Pilgrimage Community Wall
- [x] Fetch posts for specific pilgrimage from `posts` table
- [x] Display posts with user info (join with profiles)
- [x] Show post creation form only if user has joined pilgrimage
- [x] Implement post creation:
  - [x] Insert into `posts` table
  - [x] Update UI optimistically
  - [x] Handle errors
- [x] Implement post likes:
  - [x] Insert/delete from `post_likes` table
  - [x] Update like count in real-time
  - [x] Use candle icon for likes
- [x] Implement comments:
  - [x] Fetch comments for each post
  - [x] Allow users to add comments
  - [x] Display comments with author info
- [ ] Add sorting options (Newest / Most Helpful)
- [ ] Implement delete post (only for post author)
- [x] Add loading and error states

**Testing checklist for Phase 4:**
- [ ] Pilgrimages list displays data from database
- [ ] Search and filters work correctly
- [ ] User can join a pilgrimage
- [ ] Join action updates participant count
- [ ] Community wall shows only for joined users
- [ ] User can create posts
- [ ] User can like posts (candle icon)
- [ ] User can comment on posts
- [ ] Sorting works correctly

---

## PHASE 5: DASHBOARD INTEGRATION
**Priority: HIGH | Status: COMPLETED**

### 5.1 Dashboard Data Integration
- [x] Fetch user's active candle from `candle_purchases` (if expires_at > now)
- [x] Display candle animation and timer if active
- [x] Fetch next major pilgrimage if no candle active
- [x] Display upcoming pilgrimages user has joined
- [x] Add real-time updates for candle timer
- [x] Implement quick action navigation buttons

### 5.2 Orthodox Calendar Widget
- [x] Research and integrate Romanian Orthodox Calendar API (using orthocal.info)
- [x] Display today's date and saint of the day
- [x] Add link to full calendar view
- [x] Handle API errors gracefully
- [x] Cache calendar data appropriately

### 5.3 Orthodox Calendar Full Page
- [x] Create `/calendar` route
- [x] Create Calendar.tsx page component
- [x] Display monthly calendar grid
- [x] Show saints and feasts for each day
- [x] Highlight major feasts with gold dot
- [x] Implement month navigation
- [x] Create day detail view
- [x] Add calendar data from Orthodox API
- [x] Add loading and error states

**Testing checklist for Phase 5:**
- [x] Dashboard shows active candle if user has one
- [x] Candle timer counts down correctly
- [x] Dashboard shows next pilgrimage news if no candle
- [x] Orthodox calendar widget displays correct data
- [x] Full calendar page works and displays all days
- [x] Quick actions navigate correctly

---

## PHASE 6: VIRTUAL CANDLE FEATURE
**Priority: MEDIUM | Status: COMPLETED**

### 6.1 Candle Page Integration
- [x] Check if user has active candle (expires_at > now)
- [x] Display active candle with animation and timer
- [x] Display "Light a Candle" CTA if no active candle
- [x] Fetch and display candle history from database

### 6.2 Candle Purchase Flow (Placeholder)
- [x] Create donation flow UI
- [x] Add optional prayer intention field
- [x] Implement placeholder payment confirmation
- [x] On "payment success":
  - [x] Insert into `candle_purchases` table
  - [x] Set lit_at = now, expires_at = now + 24 hours
  - [x] Show success message
  - [x] Redirect to candle animation view
- [x] Add error handling

### 6.3 Candle Timer & Animation
- [x] Implement 24-hour countdown timer
- [x] Create soft, respectful candle animation (golden glow)
- [x] Update timer in real-time
- [x] Auto-hide candle when timer expires
- [x] Add visual feedback for time remaining

### 6.4 Candle History
- [x] Fetch all past candles from database
- [x] Display chronologically
- [x] Show date, intent, and status
- [x] Add empty state if no history

**Testing checklist for Phase 6:**
- [x] User can view active candle with timer
- [x] User can light a new candle (placeholder payment)
- [x] Candle data is saved to database
- [x] Timer counts down correctly
- [x] Candle expires after 24 hours
- [x] Candle history displays correctly
- [x] Candle appears on dashboard when active

---

## PHASE 7: POLISH & REFINEMENTS
**Priority: MEDIUM | Status: NOT STARTED**

### 7.1 UI/UX Improvements
- [ ] Review all colors use HSL and design tokens from index.css
- [ ] Ensure Indigo primary color (#4B0082) is used consistently
- [ ] Review all text for calm, spiritual tone
- [ ] Ensure soft glows and rounded edges throughout
- [ ] Add gentle shadows (very light)
- [ ] Review all icons (footsteps, candles, paths, crosses)
- [ ] Ensure mobile responsiveness on all screens

### 7.2 Performance Optimizations
- [ ] Add proper loading skeletons
- [ ] Implement optimistic UI updates where appropriate
- [ ] Add image lazy loading
- [ ] Optimize database queries
- [ ] Add proper caching strategies

### 7.3 Error Handling & Edge Cases
- [ ] Review all error states
- [ ] Add user-friendly error messages
- [ ] Handle network failures gracefully
- [ ] Add empty states for all lists/feeds
- [ ] Test with slow network conditions

### 7.4 Accessibility
- [ ] Add proper ARIA labels
- [ ] Ensure keyboard navigation works
- [ ] Test with screen readers
- [ ] Ensure sufficient color contrast
- [ ] Add focus indicators

**Testing checklist for Phase 7:**
- [ ] All colors follow design system
- [ ] UI is responsive on mobile and tablet
- [ ] Loading states are clear and smooth
- [ ] Error messages are helpful and calm
- [ ] App works well on slow connections
- [ ] Accessibility requirements are met

---

## PHASE 8: TESTING & LAUNCH PREPARATION
**Priority: HIGH | Status: NOT STARTED**

### 8.1 Comprehensive Testing
- [ ] Test complete user journey: signup → onboarding → browse → join → post
- [ ] Test all authentication flows
- [ ] Test all database operations
- [ ] Test file uploads
- [ ] Test on different devices
- [ ] Test with multiple users
- [ ] Test edge cases (expired sessions, network errors, etc.)

### 8.2 Content & Data
- [ ] Add real pilgrimage data for 2025
- [ ] Verify all pilgrimage information is accurate
- [ ] Add pilgrimage images
- [ ] Review all interface text in Romanian
- [ ] Ensure spiritual tone is consistent

### 8.3 Pre-Launch Checklist
- [ ] Set up production environment
- [ ] Configure proper email settings in Supabase
- [ ] Set up analytics (optional)
- [ ] Create privacy policy page
- [ ] Create terms & conditions page
- [ ] Test payment integration (when implementing real payments)
- [ ] Set up error monitoring
- [ ] Prepare launch announcement

**Testing checklist for Phase 8:**
- [ ] Complete end-to-end user journey works
- [ ] No critical bugs
- [ ] All content is accurate and appropriate
- [ ] Legal pages are in place
- [ ] Production environment is configured

---

## POST-MVP FEATURES (Future Releases)

### Deferred to Post-MVP:
- [ ] Real-time queue tracker for pilgrimages
- [ ] Advanced Orthodox calendar with liturgical readings
- [ ] Location-based features and maps
- [ ] Push notifications
- [ ] Direct messaging between pilgrims
- [ ] Stripe payment integration for candles
- [ ] Advanced search with more filters
- [ ] User badges and gamification
- [ ] Parish partnerships and verified profiles
- [ ] Offline mode
- [ ] Global community feed (separate from pilgrimage walls)

---

## NOTES & DECISIONS

### Architecture Decisions:
- Backend: Lovable Cloud (Supabase)
- Authentication: Email/password (social login deferred to post-MVP)
- Storage: Supabase Storage for images
- Calendar: Romanian Orthodox Calendar API integration
- Payment: Placeholder for MVP, Stripe integration post-MVP

### MVP Scope Constraints:
- Community features: Only pilgrimage-specific walls (no global feed in MVP)
- Queue tracker: Deferred to post-MVP
- Search/Filters: Include date, location, and type filters
- Notifications: In-app only (no push notifications in MVP)

### Design System:
- Primary color: Indigo (#4B0082 in HSL)
- Secondary colors: Earth Gold, Soft Clay, Stone Grey, White
- All colors must use HSL format and design tokens
- Tone: Calm, respectful, spiritual
- Icons: Minimal, inspired by footsteps, candles, paths, crosses
- Shadows: Very light, gentle
- Edges: Soft, rounded, welcoming

---

**Last Updated:** [Will be updated as tasks are completed]
**Next Priority:** Phase 1 - Backend Foundation & Authentication
