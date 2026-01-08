# Networkly Frontend - Technical Documentation

**Last Updated:** January 8, 2026

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Authentication Setup](#authentication-setup)
3. [Database Schema](#database-schema)
4. [Server Actions (APIs)](#server-actions-apis)
5. [Feature Implementation Status](#feature-implementation-status)
6. [Recent Fixes & Updates](#recent-fixes--updates)

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.0.10 (App Router, Turbopack) |
| **Language** | TypeScript 5.0.2 |
| **Styling** | TailwindCSS + shadcn/ui components |
| **Authentication** | Clerk (with Prisma sync) |
| **Database** | PostgreSQL via Prisma ORM 5.22.0 |
| **AI Chat** | OpenAI GPT-4o via Vercel AI SDK |
| **Package Manager** | pnpm |

---

## Authentication Setup

### Clerk Configuration

**ClerkProvider Props** (in `app/layout.tsx`):
```tsx
<ClerkProvider
  signInUrl="/login"
  signUpUrl="/signup"
  signInFallbackRedirectUrl="/dashboard"
  signUpFallbackRedirectUrl="/dashboard"
>
```

**Route Structure:**
- `/login/[[...sign-in]]/page.tsx` - Catch-all route for Clerk SignIn component
- `/signup/[[...sign-up]]/page.tsx` - Catch-all route for Clerk SignUp component

**Middleware** (`middleware.ts`):
```typescript
const isPublicRoute = createRouteMatcher([
    "/",
    "/login(.*)",
    "/signup(.*)",
    "/api/webhooks(.*)",
])

export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
        await auth.protect()
    }
})
```

**Auto-Sync:** When a user authenticates with Clerk but doesn't exist in the database, they are automatically synced via `syncUserFromClerk()` in the dashboard page.

---

## Database Schema

### Core Models

| Model | Description | Key Fields |
|-------|-------------|------------|
| **User** | User profiles linked to Clerk | `clerkId`, `email`, `name`, `skills[]`, `interests[]` |
| **Opportunity** | Job/internship/fellowship listings | `title`, `company`, `matchScore`, `deadline`, `skills[]` |
| **Project** | User project showcase | `title`, `status`, `visibility`, `tags[]`, `lookingFor[]` |
| **Connection** | Network connections | `requesterId`, `receiverId`, `status` (pending/connected/suggested) |
| **Message** | Direct messages | `senderId`, `receiverId`, `content`, `unread` |
| **Application** | Job application tracker | `company`, `position`, `status`, `appliedDate` |
| **Event** | Networking events | `title`, `date`, `location`, `type` |

### Supporting Models

| Model | Purpose |
|-------|---------|
| **ProjectCollaborator** | Many-to-many: Users ↔ Projects |
| **ProjectUpdate** | Activity feed for projects |
| **SavedOpportunity** | Many-to-many: Users ↔ Opportunities |
| **Achievement** | User profile achievements |
| **Extracurricular** | User activities/roles |
| **AnalyticsData** | Profile views, network growth stats |
| **ChatLog** | AI assistant conversation history |

---

## Server Actions (APIs)

All server actions are located in `/app/actions/` and use the `"use server"` directive.

### User Actions (`user.ts`)

| Function | Description |
|----------|-------------|
| `getCurrentUser()` | Get authenticated user's profile with achievements & extracurriculars |
| `getUserAnalytics()` | Get profile views, network growth, skill endorsements |
| `updateUserProfile(data)` | Update user profile fields |
| `getEvents()` | Get all networking events |
| `syncUserFromClerk(clerkUser)` | Upsert user from Clerk to database |

### Connections Actions (`connections.ts`)

| Function | Description |
|----------|-------------|
| `getConnections()` | Get all user connections (connected, pending, suggested) |
| `getSuggestedConnections()` | Get AI-suggested connections (users not yet connected) |
| `sendConnectionRequest(receiverId)` | Send a connection request |
| `acceptConnectionRequest(connectionId)` | Accept a pending request |
| `removeConnection(connectionId)` | Remove an existing connection |

### Messages Actions (`messages.ts`)

| Function | Description |
|----------|-------------|
| `getMessages()` | Get all messages (inbox preview) |
| `getConversation(otherUserId)` | Get full conversation thread, marks as read |
| `sendMessage(receiverId, content)` | Send a new message |
| `markMessagesAsRead(senderId)` | Mark all messages from sender as read |

### Opportunities Actions (`opportunities.ts`)

| Function | Description |
|----------|-------------|
| `getOpportunities()` | Get all opportunities |
| `getOpportunitiesWithSaved()` | Get opportunities with user's saved status |
| `toggleSaveOpportunity(opportunityId)` | Save/unsave an opportunity |
| `getSavedOpportunities()` | Get user's saved opportunities |

### Projects Actions (`projects.ts`)

| Function | Description |
|----------|-------------|
| `getProjects()` | Get all projects with collaborators |
| `getProjectById(id)` | Get single project with updates |
| `createProject(data)` | Create new project (auto-adds creator as collaborator) |
| `updateProject(id, data)` | Update project fields |
| `deleteProject(id)` | Delete project |
| `likeProject(id)` | Increment project likes |
| `getProjectUpdates()` | Get recent project activity feed |

### Applications Actions (`applications.ts`)

| Function | Description |
|----------|-------------|
| `getApplications()` | Get user's job applications |
| `createApplication(data)` | Add new application to tracker |
| `updateApplication(id, data)` | Update application status/next step |
| `deleteApplication(id)` | Remove application |

### AI Chat API (`api/chat/route.ts`)

**Endpoint:** `POST /api/chat`

**Model:** OpenAI GPT-4o via Vercel AI SDK

**System Prompt:**
```
You are Networkly AI, a helpful career assistant for students and young professionals. You help with:
- Career advice and guidance
- Networking strategies and introductions
- Application assistance (cover letters, emails, follow-ups)
- Interview preparation
- Skill development recommendations
- Opportunity discovery
```

---

## Feature Implementation Status

### ✅ Fully Implemented

| Feature | Location | Status |
|---------|----------|--------|
| **User Authentication** | Clerk + auto-sync | ✅ Working |
| **Dashboard** | `/dashboard` | ✅ Working |
| **Profile Management** | `/profile` | ✅ Working |
| **Network/Connections** | `/network` | ✅ Working |
| **Messaging** | `/network` (Messages panel) | ✅ Working |
| **Opportunities Discovery** | `/opportunities` | ✅ Working |
| **Save/Unsave Opportunities** | `/opportunities` | ✅ Working |
| **Project Showcase** | `/projects` | ✅ Working |
| **Create/Edit Projects** | `/projects` | ✅ Working |
| **Application Tracker** | `/dashboard` | ✅ Working |
| **AI Assistant Chat** | `/assistant` | ✅ Working |
| **Analytics Dashboard** | `/analytics` | ✅ Working |
| **Settings** | `/settings` | ✅ Working |
| **Events Calendar** | `/events` | ✅ Working |

### 🔄 Partially Implemented / Needs Enhancement

| Feature | Current State | What's Missing |
|---------|---------------|----------------|
| **AI Match Scoring** | Static `matchScore` field | Real AI-based matching algorithm |
| **Mutual Connections Count** | Always 0 for suggestions | Actual calculation needed |
| **Notification System** | No notifications | Push/in-app notifications |
| **Email Integration** | Not implemented | Email alerts for messages/opportunities |
| **Search & Filters** | Basic text search | Advanced filters, AI-powered search |

### ❌ Not Yet Implemented

| Feature | Description |
|---------|-------------|
| **Real-time Messaging** | WebSocket/SSE for live chat |
| **File Uploads** | Project images, resumes |
| **OAuth Connections** | LinkedIn, GitHub integration |
| **Calendar Sync** | Google/Outlook integration for events |
| **Export Data** | PDF resume, portfolio export |

---

## Recent Fixes & Updates

### Session: January 8, 2026

#### 1. Clerk Authentication Paths
- Configured `ClerkProvider` with `signInUrl`, `signUpUrl`, `signInFallbackRedirectUrl`, `signUpFallbackRedirectUrl`
- Converted `/login` and `/signup` to catch-all routes (`[[...sign-in]]`, `[[...sign-up]]`)
- Updated middleware to properly protect routes

#### 2. Fixed Infinite Redirect Loop
- **Problem:** `/dashboard` was redirecting to `/login` when user existed in Clerk but not in database
- **Solution:** Removed manual `redirect("/login")` from dashboard, replaced with auto-sync mechanism

#### 3. Fixed Async Client Component Errors
- **Problem:** `MessagesPanel` and `ProjectUpdatesFeed` were async Server Components embedded in Client Component pages
- **Solution:** Converted both to standard Client Components using `useEffect` + `useState` for data fetching

#### 4. Fixed Date Rendering Error
- **Problem:** Prisma `Date` objects were being rendered directly in JSX
- **Solution:** Added `getRelativeTime()` conversion in `getProjects()` and `createProject()` to return strings

#### 5. Auto-Sync Clerk Users to Database
- **Problem:** New Clerk users had no corresponding database record, causing "Setting up account" to hang
- **Solution:** Added `syncUserFromClerk()` call in dashboard page when user is authenticated but not in DB

#### 6. Updated Deprecated Clerk Props
- Replaced deprecated `afterSignOutUrl` with `signInFallbackRedirectUrl` and `signUpFallbackRedirectUrl`

---

## File Structure Overview

```
app/
├── actions/           # Server actions (APIs)
│   ├── applications.ts
│   ├── connections.ts
│   ├── messages.ts
│   ├── opportunities.ts
│   ├── projects.ts
│   └── user.ts
├── api/
│   └── chat/
│       └── route.ts   # AI chat endpoint
├── dashboard/
├── login/[[...sign-in]]/
├── signup/[[...sign-up]]/
├── network/
├── opportunities/
├── projects/
├── profile/
├── analytics/
├── assistant/
├── events/
└── settings/

components/
├── dashboard/
├── network/
├── opportunities/
├── projects/
└── ui/               # shadcn/ui components

prisma/
└── schema.prisma     # Database schema

lib/
└── prisma.ts         # Prisma client singleton
```

---

## Environment Variables

Required in `.env` or `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# OpenAI (for AI Assistant)
OPENAI_API_KEY="sk-..."
```
