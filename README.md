# GroupPlan

AI-powered group event planning. Hosts create beautiful shareable invitations, guests submit preferences, and the AI proposes restaurant options the whole group will love.

## How it works

1. Host creates an event and sends invitation links
2. Guests RSVP and submit dietary, cuisine, budget, and vibe preferences
3. Once all RSVPs are in, AI synthesizes constraints and proposes 3 concrete restaurant options
4. Group votes ranked-choice, winner is announced, everyone exports to calendar

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Database / Auth | Supabase (PostgreSQL + RLS + Realtime) |
| File storage | Firebase Storage |
| Push notifications | Firebase Cloud Messaging |
| AI synthesis | Claude Haiku (Anthropic) |
| Restaurant data | Yelp Fusion API |
| Email | SendGrid |
| Hosting | AWS Amplify |

## Project structure

```
groupplan/
├── apps/
│   └── web/              # Next.js frontend
├── packages/
│   ├── types/            # Shared TypeScript types + Zod schemas
│   ├── db/               # Supabase client + typed query helpers
│   ├── ai/               # AI provider interface + Claude adapter
│   ├── venues/           # Venue provider interface + Yelp adapter
│   ├── notifications/    # Notification service + email/push adapters
│   └── calendar/         # Calendar export interface + .ics adapter
└── supabase/
    └── migrations/       # PostgreSQL schema migrations
```

Business logic, API types, and adapters live in `packages/` so a future React Native app can import them without duplicating code.

## Getting started

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### 1. Clone and install

```bash
git clone https://github.com/andersonmcalpine/groupplan.git
cd groupplan
pnpm install
```

### 2. Configure environment

```bash
cp .env.example apps/web/.env.local
```

Fill in all values in `apps/web/.env.local`. See `.env.example` for required keys.

### 3. Start Supabase locally

```bash
supabase start
supabase db push
```

### 4. Run the dev server

```bash
pnpm dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for all required variables. The following services need accounts:

- **Supabase** — database, auth, realtime ([supabase.com](https://supabase.com))
- **Firebase** — storage + push notifications ([firebase.google.com](https://firebase.google.com))
- **Anthropic** — AI synthesis ([console.anthropic.com](https://console.anthropic.com))
- **Yelp** — restaurant data ([fusion.yelp.com](https://fusion.yelp.com))
- **SendGrid** — transactional email ([sendgrid.com](https://sendgrid.com))

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Each PR should be focused and include a clear description of the change and why it was made.

## License

MIT
