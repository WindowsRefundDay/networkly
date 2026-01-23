# Networkly - AI-Powered Professional Networking

Networkly is an AI-powered professional networking platform designed to help students and professionals connect, grow, and succeed. It offers features like opportunity discovery, career guidance, and AI-driven insights to enhance your professional journey.

## Features

- **AI-Powered Networking:** Get personalized connection suggestions and conversation starters.
- **Opportunity Discovery:** Find internships, jobs, and hackathons tailored to your profile.
- **Career Guidance:** Access AI-driven insights and mentorship opportunities.
- **Profile Analytics:** Track your profile views and network growth.
- **Project Showcase:** Display your projects and achievements to potential employers and collaborators.

## Tech Stack

- **Framework:** Next.js 16
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **UI Components:** Radix UI + shadcn/ui
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Clerk
- **AI Integration:** Vercel AI SDK + Groq

## Getting Started

Follow these steps to set up the project locally on your machine.

### Prerequisites

- **Node.js** v18 or higher
- **pnpm** (recommended) or npm
- **PostgreSQL database** (see options below)
- **Clerk account** (free at [clerk.com](https://clerk.com))
- **Groq API key** (free at [console.groq.com](https://console.groq.com))

### Quick Start

1. **Clone the repository:**

   ```bash
   git clone https://github.com/NetworklyINC/Networkly-Frontend.git
   cd Networkly-Frontend
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Set up environment variables:**

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

4. **Set up the database:**

   ```bash
   # Generate Prisma client
   pnpm db:generate

   # Push the schema to your database
   pnpm db:push

   # (Optional) Seed with sample data
   pnpm db:seed
   ```

5. **Start the development server:**

   ```bash
   pnpm dev
   ```

6. **Open the app:**

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
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Prisma Studio (database GUI) |

## Project Structure

```
├── app/           # Next.js app router pages and layouts
├── components/    # Reusable UI components
├── lib/           # Utility functions and configurations
├── prisma/        # Database schema and migrations
├── public/        # Static assets
├── styles/        # Global styles and CSS variables
├── hooks/         # Custom React hooks
├── types/         # TypeScript type definitions
└── __tests__/     # Test files
```

## Troubleshooting

### "Cannot find module '@prisma/client'"
Run `pnpm db:generate` to generate the Prisma client.

### "CLERK_SECRET_KEY is missing"
Make sure you've copied `.env.example` to `.env` and filled in your Clerk keys.

### "Connection refused" or database errors
1. Check that your DATABASE_URL is correct
2. Make sure your database server is running
3. Run `pnpm db:push` to create the database tables

### "Invalid API key" errors
Double-check your GROQ_API_KEY in the `.env` file.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.
