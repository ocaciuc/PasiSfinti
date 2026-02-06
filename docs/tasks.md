# Pași de Pelerin - Implementation Tasks

## Current Status Overview
- ✅ Basic UI structure implemented (onboarding, profile, pilgrimages, candle, dashboard, navigation)
- ✅ Backend integration with Supabase (external project)
- ✅ Authentication system (email/password + Facebook OAuth)
- ✅ Database schema with production-ready features
- ✅ Persistent storage configured
- ✅ Public landing page (Welcome) as default entry point (/)
- ✅ Dashboard moved to /dashboard route

---

## DATABASE SCHEMA UPGRADE
**Priority: HIGH | Status: COMPLETED**

### Schema Improvements Completed:
- [x] Added soft deletes (`deleted_at` column) to all user-created content tables:
  - profiles, posts, comments, user_pilgrimages, candle_purchases, past_pilgrimages, post_likes, pilgrimages
- [x] Added `is_deleted` boolean flag to profiles for quick filtering
- [x] Created notifications system tables:
  - `notifications` (id, user_id, type, title, message, data, read, created_at, read_at)
  - `notification_settings` (user_id, allow_push, allow_email, pilgrimage_reminders, community_updates, comment_replies)
- [x] Added performance indexes for soft delete queries on all tables
- [x] Created helper views for clean queries:
  - `v_pilgrimages_active` - active/upcoming pilgrimages not deleted
  - `v_pilgrimages_passed` - past pilgrimages not deleted
  - `v_posts_active` - active posts with author info
  - `v_comments_threaded` - threaded comments with author info and reply count
  - `v_profiles_active` - active profiles not deleted
- [x] Created `delete_user_account(target_user_id)` SECURITY DEFINER function for GDPR/Meta compliance:
  - Soft deletes all user content (posts, comments, likes, pilgrimages, candles)
  - Anonymizes profile (sets name to "Deleted User", clears personal info)
  - Hard deletes transient data (notifications, roles)
- [x] Updated RLS policies to exclude soft-deleted records:
  - Posts, comments, profiles, user_pilgrimages, post_likes policies updated
- [x] Added co-pilgrim profile visibility policy (limited profile info for pilgrimage participants)
- [x] All views use SECURITY INVOKER for proper RLS enforcement

### Security Note:
- "Leaked Password Protection" warning in Supabase - can be enabled in Auth settings

---

## PHASE 1: BACKEND FOUNDATION & AUTHENTICATION
**Priority: HIGH | Status: COMPLETED**

### 1.1 Enable Lovable Cloud
- [x] Connected to external Supabase project (yanjhfqqdcevlzmwsrnj)
- [x] Database is created and accessible
- [x] Cloud dashboard configured

### 1.2 Database Schema Setup
- [x] Created `profiles` table with all required columns
- [x] Created `pilgrimages` table with all required columns
- [x] Created `user_pilgrimages` join table
- [x] Created `past_pilgrimages` table
- [x] Created `posts` table
- [x] Created `comments` table with `parent_comment_id` for threading
- [x] Created `post_likes` table
- [x] Created `candle_purchases` table
- [x] Created `orthodox_calendar_days` table
- [x] Created `user_roles` table for admin/moderator roles
- [x] Created `notifications` and `notification_settings` tables

### 1.3 Row Level Security (RLS) Policies
- [x] Enabled RLS on all tables
- [x] Created RLS policies for all tables with soft-delete awareness
- [x] Created `has_role()` SECURITY DEFINER function to avoid RLS recursion

### 1.4 Database Triggers & Functions
- [x] Created `update_updated_at_column()` trigger function
- [x] Created `update_pilgrimage_participant_count()` trigger function
- [x] Created `update_post_likes_count()` trigger function
- [x] Created `set_candle_expiration()` trigger function
- [x] Created `get_co_pilgrim_profiles()` SECURITY DEFINER function
- [x] Created `delete_user_account()` SECURITY DEFINER function

### 1.5 Seed Initial Data
- [x] Inserted sample pilgrimages
- [x] Populated Orthodox calendar data (January, February)

### 1.6 Storage Setup
- [ ] Create storage bucket `profile-photos` for user profile pictures
- [ ] Set bucket to public access
- [ ] Create RLS policies for profile-photos bucket
- [ ] Create storage bucket `pilgrimage-images` for pilgrimage photos

### 1.7 Authentication Implementation
- [x] Created `/auth` page for login/signup
- [x] Implemented email/password signup flow
- [x] Implemented email/password login flow
- [x] Added Google OAuth integration (replaced Facebook OAuth)
- [x] Added proper error handling and validation
- [x] Added auth state management with `onAuthStateChange`
- [x] Implemented session persistence
- [x] Added persistent session storage for mobile using @capacitor/preferences
  - Custom storage adapter bridges Supabase's synchronous API with Capacitor's async Preferences
  - Uses SharedPreferences (Android) / UserDefaults (iOS) instead of transient localStorage
  - Cache hydration on app start ensures session is available immediately
  - Logout explicitly clears both localStorage and Preferences
- [x] Added protected route logic
- [x] Added session check on app start with splash screen
  - Shows splash screen while checking for existing session
  - Redirects authenticated users to Dashboard (or Onboarding if no profile)
  - Shows Welcome/Auth only if no active session
- [x] Added auto-redirect to dashboard if already logged in
- [x] Created `/auth/callback` page for OAuth code exchange
- [x] Created `/confirmare-cont` page for email confirmation links
  - Standalone confirmation page with Romanian success message
  - Signs out user before navigating to auth (prevents session from auto-redirecting)
  - No onboarding trigger - users must explicitly log in after confirmation
  - Consistent behavior on first and subsequent confirmation clicks
- [x] Updated sign-up emailRedirectTo to point to /confirmare-cont
- [x] Created `/reset-password` page for password reset flow
  - Reads recovery tokens from URL hash
  - Validates session with proper error handling
  - Romanian UI messages for all states (loading, expired link, success)
  - Password complexity validation (8+ chars, mixed case, digit, special)
  - Show/hide password toggle
  - "Mergi la autentificare" button after successful reset
  - No onboarding or dashboard interference
- [x] Configured mobile deep linking for Google OAuth (Capacitor)
  - Custom URL scheme: pelerinaj://auth/callback
  - In-app browser for OAuth flow on mobile (fullscreen presentation)
  - Deep link listener to capture OAuth callback tokens
  - Automatic session restoration from callback URL
  - Browser auto-closes when deep link is received
- [x] Fixed password reset deep link handling for mobile
  - Deep link listener now correctly detects `type=recovery` in URL
  - Recovery links route to `/reset-password` instead of `/dashboard`
  - Global deep link handler in AppInitializer catches cold-start recovery links
  - Separate callbacks for auth success vs. recovery success
- [x] **Native Android Google Sign-In (No Browser)**
  - **Replaced OAuth browser redirect with native Google Identity Services SDK**
  - Custom Capacitor plugin: `GoogleSignInPlugin.kt` using One Tap Sign-In
  - JavaScript bridge: `src/lib/native-google-signin.ts`
  - Uses `signInWithIdToken` instead of `signInWithOAuth`
  - No browser or Chrome Custom Tab opened during sign-in
  - Auth flow: Native UI → Google ID Token → Supabase session
  - Web fallback: OAuth redirect still works on non-native platforms
  - **Setup required**: See `docs/native-google-signin-setup.md` for configuration
- [x] **Aligned Capacitor dependencies to v7.0.1**
  - All packages aligned: @capacitor/core, @capacitor/android, @capacitor/app, @capacitor/browser, @capacitor/preferences
  - Fixes potential lifecycle and plugin callback issues during Google auth (pause/resume)
- [x] **Fixed authentication validation**
  - Password strength validation now only applies on signup, not login
  - Users can log in with any password (validation happens server-side)
- [x] **Fixed onboarding age validation**
  - Age field now accepts only integers (no decimals)
  - Validates range 1-120 years
  - Shows clear Romanian error messages

## PHASE 2: ONBOARDING FLOW INTEGRATION
**Priority: HIGH | Status: COMPLETED**

### 2.1 Connect Onboarding to Backend
- [x] Update Onboarding.tsx to save data to Supabase `profiles` table
- [x] Implement profile photo upload (using base64 for MVP)
- [x] Add loading states during form submission
- [x] Add error handling with toast notifications
- [x] Redirect to dashboard after successful onboarding
- [x] Add validation for all form fields

### 2.2 First-Time User Flow
- [x] Check if user has completed onboarding (profile data exists)
- [x] Redirect new users to /onboarding if profile incomplete
- [x] Skip onboarding if profile already exists

---

## PHASE 3: PROFILE PAGE INTEGRATION
**Priority: HIGH | Status: COMPLETED**

### 3.1 Connect Profile to Backend
- [x] Fetch user profile data from `profiles` table
- [x] Fetch user's past pilgrimages
- [x] Fetch user's upcoming pilgrimages
- [x] Display profile photo
- [x] Add loading states and error handling

### 3.2 Edit Profile Functionality
- [x] Create edit profile form/modal
- [x] Allow users to update profile info
- [x] Implement photo update
- [x] Add validation and save to database

### 3.3 Past Pilgrimages Section
- [x] Shows enrolled pilgrimages that have passed
- [x] Friendly empty state message

---

## PHASE 4: PILGRIMAGES INTEGRATION
**Priority: HIGH | Status: MOSTLY COMPLETED**

### 4.1 Pilgrimages List Page
- [x] Fetch pilgrimages from database
- [x] Implement filtering by type (local/national/all)
- [x] Add search functionality
- [x] Implement Smart Filter Bar with date, location, type filters
- [x] Show participant count
- [x] Add loading and error states
- [x] Implement time filter (Upcoming vs Previous pilgrimages)
- [x] Default to showing upcoming/current pilgrimages only

### 4.2 Pilgrimage Detail Page
- [x] Fetch pilgrimage details
- [x] Check if user has joined
- [x] Implement "Join Pilgrimage" functionality with date validation
- [x] Display participant list
- [x] Show map link if available
- [x] Implement "Leave Pilgrimage" functionality
- [x] Fixed RLS policy for user_pilgrimages to allow users to see own enrollment
- [x] Added double-click prevention for enrollment button

### 4.3 Pilgrimage Community Wall
- [x] Fetch posts for specific pilgrimage
- [x] Display posts with user info
- [x] Show post creation form only if user has joined
- [x] Implement post creation with optimistic UI
- [x] Implement post likes with candle icon
- [x] Implement comments with threading
- [x] Only enrolled users can view/add posts and comments (RLS enforced)
- [ ] Add sorting options (Newest / Most Helpful)
- [ ] Implement delete post (only for post author)

---

## PHASE 5: DASHBOARD INTEGRATION
**Priority: HIGH | Status: COMPLETED**

- [x] Fetch user's active candle and display with timer
- [x] Display next major pilgrimage if no candle active
- [x] Show closest upcoming enrolled pilgrimage
- [x] Real-time candle timer
- [x] Quick action navigation buttons
- [x] Orthodox Calendar widget (from Supabase)
- [x] Calendar page with TodayCalendarCard component
- [x] Expandable Calendar card on Dashboard (accordion-style, shows saint details & fasting info)
- [ ] Populate remaining calendar months (March-December)

---

## PHASE 6: VIRTUAL CANDLE FEATURE
**Priority: MEDIUM | Status: COMPLETED**

- [x] Check if user has active candle
- [x] Display candle with animation and timer
- [x] Placeholder donation flow with prayer intention
- [x] Insert candle purchase to database
- [x] 24-hour countdown timer
- [x] Candle history display

---

## PHASE 7: POLISH & REFINEMENTS
**Priority: MEDIUM | Status: NOT STARTED**

### 7.1 UI/UX Improvements
- [ ] Review all colors use HSL and design tokens
- [ ] Ensure Indigo primary color is used consistently
- [ ] Review all text for calm, spiritual tone
- [ ] Ensure soft glows and rounded edges
- [ ] Review all icons
- [ ] Mobile responsiveness audit

### 7.2 Performance Optimizations
- [x] Add proper loading skeletons
- [x] Implement optimistic UI updates
- [x] Add image lazy loading
- [x] Optimize database queries
- [x] **Lazy load comments in Pilgrimage details**
  - Comments now start collapsed showing just count
  - Only load comments when user clicks to expand
  - Dramatically improves page load time with many comments
- [x] **Comment section performance refactoring**
  - Split CommentSection into smaller memoized components (CommentItem, CommentList, ReplyItem)
  - Replies load on-demand when user expands a comment (not on page load)
  - Pagination for both comments (10) and replies (5)
  - Eliminated N+1 queries by batching profile lookups
  - React.memo prevents full list re-renders when expanding replies

 - [x] **Client-side caching with React Query**
   - Pilgrimage details cached with 10-min stale/15-min GC
   - Community data cached with 2-min stale/5-min GC
   - Custom hooks: usePilgrimageDetails, usePilgrimageCommunity
   - Stale-while-revalidate for instant page revisits
   - Optimistic updates for registration, likes, posts
 
### 7.3 Error Handling & Edge Cases
- [x] Robust onboarding error handling implemented
  - UPSERT logic to prevent duplicate profile errors
  - Reusable error handler with recovery actions (onboarding-error-handler.ts)
  - Graceful redirect on duplicate key constraint errors
  - Check for existing profile on mount (handles refresh, re-login)
  - Double-submit prevention with loading state
  - Network error handling with retry capability
- [ ] Review remaining error states
- [ ] Handle network failures gracefully (partially done for onboarding)

### 7.4 Accessibility
- [ ] Add proper ARIA labels
- [ ] Ensure keyboard navigation
- [ ] Test color contrast

---

## PHASE 8: TESTING & LAUNCH PREPARATION
**Priority: HIGH | Status: NOT STARTED**

### 8.1 Comprehensive Testing
- [ ] Test complete user journey
- [ ] Test all authentication flows
- [ ] Test all database operations
- [ ] Test on different devices
- [ ] Test with multiple users

### 8.2 Content & Data
- [ ] Add real pilgrimage data for 2025
- [ ] Add pilgrimage images
- [ ] Review all interface text in Romanian

### 8.3 Pre-Launch Checklist
- [ ] Configure proper email settings in Supabase
- [ ] Create privacy policy page
- [ ] Create terms & conditions page
- [ ] Set up error monitoring

---

## POST-MVP FEATURES (Future Releases)

### Recently Completed:
- [x] Spiritual Diary (Jurnal Spiritual) for past pilgrimages
  - Database: spiritual_diaries, spiritual_diary_photos tables with RLS
  - Storage bucket: diary-photos for photo uploads
  - UI: /pilgrimage/:pilgrimageId/diary page with photos, reflections, places, people
  - Navigation: "Jurnal Spiritual" button on past pilgrimages in Profile
- [x] Gamification Badge System (Insigne)
  - Database: badges, user_badges tables with 4 predefined badges
  - Badges: Primul Pelerinaj, 5 Mănăstiri Vizitate, Purtător de Lumină (10+ candles/month), Ajutătorul Comunității
  - Function: evaluate_and_award_badges() for automated badge awarding
  - UI: BadgesSection component on Profile page showing earned/locked badges

### Deferred to Post-MVP:
- [ ] Real-time queue tracker for pilgrimages
- [ ] Advanced Orthodox calendar with liturgical readings
- [ ] Location-based features and maps
- [ ] Push notifications (infrastructure now ready with notifications tables)
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
- Backend: External Supabase project (yanjhfqqdcevlzmwsrnj)
- Authentication: Email/password + Google OAuth
- Storage: Supabase Storage for images
- Calendar: Data stored in Supabase `orthodox_calendar_days` table
- Payment: Placeholder for MVP, Stripe integration post-MVP
- Soft Deletes: All user content uses soft deletes with `deleted_at` column
- Views: Helper views created for clean queries with SECURITY INVOKER

### Account Management & Data Deletion:
- [x] Google OAuth integration (replaced Facebook)
- [x] Settings page with Delete Account functionality
- [x] Public /user-data-deletion page for data deletion requests
- [x] delete-account Edge Function for secure account deletion
- [x] `delete_user_account()` database function for comprehensive cleanup
- [x] Account deleted confirmation page

### MVP Scope Constraints:
- Community features: Only pilgrimage-specific walls (no global feed in MVP)
- Queue tracker: Deferred to post-MVP
- Search/Filters: Include date, location, and type filters
- Notifications: Infrastructure ready, implementation deferred

### Design System:
- Primary color: Indigo (#4B0082 in HSL)
- Secondary: Earth Gold, Soft Clay, Stone Grey, White
- Design: Simple, sacred, thin lines, elegant icons, soft glows
- All colors must use HSL format and semantic tokens
- Safe area CSS: `.pb-safe` utility class for consistent bottom padding (8rem + safe-area-inset)
