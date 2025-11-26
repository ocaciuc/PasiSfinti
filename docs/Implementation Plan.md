Perfect — îți construiesc **un Implementation Plan complet, pas cu pas**, optimizat pentru **Lovable + Supabase**, astfel încât să poți lansa MVP-ul „Pași de Pelerin” rapid, stabil și scalabil.

Planul include:

* Arhitectura aplicației
* Structura bazei de date (Supabase schema)
* Plan de implementare în Lovable (flows, UI, logica)
* Feature roadmap pentru MVP
* Checklist tehnic
* Estimări de timp

---

# 🟣 **1. HIGH-LEVEL ARCHITECTURE**

```
Mobile App (Lovable)
      |
      v
Supabase
  - Auth         (email/password, social optional)
  - Database     (PostgreSQL)
  - Storage      (profile photos, pilgrimage photos)
  - Edge Functions (optional for advanced logic)
```

**Lovable** = UI, logic flows, API integration
**Supabase** = Users, Posts, Relationships, Data, Auth
**Stripe** = Candle donations

---

# 🟣 **2. SUPABASE DATABASE SCHEMA (MVP)**

Super important — structurat simplu, scalabil.

---

## **TABLE: users**

*(Supabase already has auth.users; create a parallel public profile table)*

```
profiles
---------
id (uuid, PK, references auth.users.id)
first_name (text)
last_name (text)
age (int)
city (text)
parish (text)
photo_url (text)
created_at (timestamp)
```

---

## **TABLE: pilgrimages**

```
pilgrimages
---------
id (uuid, PK)
title (text)
description (text)
location (text)
start_date (date)
end_date (date)
type (text) // "occasional" or "national"
image_url (text)
created_at (timestamp)
```

---

## **TABLE: user_pilgrimages (join table)**

*(When a user joins a pilgrimage)*

```
user_pilgrimages
---------
id (uuid, PK)
user_id (uuid, FK → profiles.id)
pilgrimage_id (uuid, FK → pilgrimages.id)
joined_at (timestamp)
```

---

## **TABLE: posts**

*(Works for global community + pilgrimage walls)*

```
posts
---------
id (uuid, PK)
user_id (uuid, FK → profiles.id)
pilgrimage_id (uuid, FK → pilgrimages.id OR null if global)
content (text)
created_at (timestamp)
```

---

## **TABLE: comments**

```
comments
---------
id (uuid, PK)
post_id (uuid, FK)
user_id (uuid, FK)
content (text)
created_at (timestamp)
```

---

## **TABLE: candle_purchases**

```
candle_purchases
---------
id (uuid, PK)
user_id (uuid)
lit_at (timestamp)
expires_at (timestamp)
intent (text) // optional prayer intention
```

---

## **TABLE: past_pilgrimages (user-added)**

```
past_pilgrimages
---------
id (uuid, PK)
user_id (uuid)
place (text)
period (text)
impressions (text)
```

---

# 🟣 **3. LOVABLE IMPLEMENTATION STEPS (Full Plan)**

Lovable permite UI + logic + API calls.
Vom construi în 4 etape.

---

# ✅ **Phase 1 — Setup (1–2 days)**

### **Step 1 — Create Supabase project**

* Create database
* Enable row-level security
* Create tables (above schema)
* Insert sample data (pilgrimages)
* Enable Auth: email/password
* Create service role key

### **Step 2 — Integrate Lovable with Supabase**

In Lovable:

* Add Supabase client (REST API)
* Store supabase URL + anon key
* Define API endpoints:

  * signup
  * login
  * get/update profile
  * CRUD for posts, comments
  * list pilgrimages
  * join pilgrimage

### **Step 3 — Create Data Collections in Lovable**

* Profiles
* Pilgrimages
* Posts
* Comments
* Candle purchases

---

# ✅ **Phase 2 — Onboarding & Profile (2–3 days)**

### **UI Screens to Build**

1. Welcome screen
2. Personal details form
3. Past pilgrimage form
4. Photo upload
5. Finish onboarding → Save to Supabase
6. Dashboard

### **Logic**

* On signup → create profile record
* On onboarding form → upsert profile
* Upload photo → store in Supabase Storage
* Redirect to Dashboard

---

# ✅ **Phase 3 — Pilgrimages (3–4 days)**

### **Build screens**

1. Pilgrimage list (tabs)
2. Pilgrimage details
3. Join pilgrimage button
4. My upcoming pilgrimages

### **Logic**

* Fetch pilgrimages from Supabase
* When user taps JOIN:

  * Insert into user_pilgrimages
  * Unlock pilgrimage wall
* Show user count (simple count query)
* Add search and filters (Lovable built-in)

---

# ✅ **Phase 4 — Community (4–5 days)**

### **Build screens**

1. Global community feed
2. Post creation
3. Comments screen
4. Pilgrimage-specific wall
5. Candle-like button

### **Logic**

* Global feed → SELECT posts WHERE pilgrimage_id IS NULL
* Pilgrimage feed → SELECT posts WHERE pilgrimage_id = X
* Insert posts
* Insert comments

### **Moderation**

* Users can delete their own posts
* Admin (you) can delete any post via Supabase Dashboard

---

# ✅ **Phase 5 — Candle Donation (2–3 days)**

### **Build screens**

1. Candle landing page
2. Purchase flow (Stripe checkout session)
3. Candle active screen
4. Candle history

### **Logic**

* Stripe payment → redirect to success
* On success → Supabase insert (lit_at + expires_at = now + 24h)
* Dashboard shows active candle (SELECT WHERE expires_at > NOW)

---


# 🟣 **5. API Endpoints (Lovable → Supabase)**

### **Authentication**

* POST /auth/v1/signup
* POST /auth/v1/token?grant_type=password

### **Profiles**

* GET /rest/v1/profiles?select=*
* PATCH /rest/v1/profiles?id=eq.{user_id}

### **Pilgrimages**

* GET /rest/v1/pilgrimages
* POST /rest/v1/user_pilgrimages

### **Community**

* POST /rest/v1/posts
* GET /rest/v1/posts?pilgrimage_id=eq.{id}
* POST /rest/v1/comments

### **Candle**

* POST /rest/v1/candle_purchases
* GET /rest/v1/candle_purchases?user_id=eq.{id}

