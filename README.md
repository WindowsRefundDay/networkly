# Networkly - AI-Powered Professional Networking

Networkly is an AI-powered professional networking platform designed to help students and professionals connect, grow, and succeed.

## Features

- **AI-Powered Networking:** Personalized connection suggestions and conversation starters
- **Opportunity Discovery:** Find internships, jobs, and hackathons tailored to your profile
- **Career Guidance:** AI-driven insights and mentorship opportunities
- **Profile Analytics:** Track your profile views and network growth
- **Project Showcase:** Display your projects to potential employers

## Tech Stack

- **Runtime:** [Bun](https://bun.sh) (fast all-in-one JavaScript runtime)
- **Framework:** Next.js 16
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI + shadcn/ui
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Clerk
- **AI Integration:** Vercel AI SDK + Groq

## Getting Started

### Prerequisites

- **[Bun](https://bun.sh)** v1.0 or higher
- **PostgreSQL database** (see options below)
- **Clerk account** (free at [clerk.com](https://clerk.com))
- **Groq API key** (free at [console.groq.com](https://console.groq.com))

### Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/NetworklyINC/Networkly-Frontend.git
   cd Networkly-Frontend
   ```

2. **Install Bun (if not installed):**

   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Install dependencies:**

   ```bash
   bun install
   ```

4. **Set up environment variables:**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in your values:

   - **DATABASE_URL:** Get a free PostgreSQL database from:
     - [Neon](https://neon.tech) (recommended - generous free tier)
     - [Supabase](https://supabase.com) 
     - [Railway](https://railway.app)
   
   - **CLERK_SECRET_KEY & NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:**
     1. Create a Clerk account at [clerk.com](https://clerk.com)
     2. Create a new application
     3. Go to API Keys and copy both keys

   - **GROQ_API_KEY:**
     1. Create an account at [console.groq.com](https://console.groq.com)
     2. Go to API Keys and create a new key

5. **Set up the database:**

   ```bash
   # Generate Prisma client
   bun run db:generate

   # Push the schema to your database
   bun run db:push

   # (Optional) Seed with sample data
   bun run db:seed
   ```

6. **Start the development server:**

   ```bash
   bun dev
   ```

7. **Open the app:**

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | ✅ | Clerk backend API key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk frontend key |
| `GROQ_API_KEY` | ✅ | Groq AI API key |
| `OPENROUTER_API_KEY` | ❌ | Optional: OpenRouter API key |
| `NEXT_PUBLIC_APP_URL` | ❌ | App URL (defaults to localhost:3000) |

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun test` | Run tests |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push schema to database |
| `bun run db:seed` | Seed database with sample data |
| `bun run db:studio` | Open Prisma Studio (database GUI) |

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run `bun run db:generate` to generate the Prisma client.

### "CLERK_SECRET_KEY is missing"
Make sure you've copied `.env.example` to `.env` and filled in your Clerk keys.

### "Connection refused" or database errors
1. Check that your DATABASE_URL is correct
2. Make sure your database server is running
3. Run `bun run db:push` to create the database tables

### "Invalid API key" errors
Double-check your GROQ_API_KEY in the `.env` file.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.
