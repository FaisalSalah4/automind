# CLAUDE.md — AutoMind: Smart Car Maintenance Tracker

## Project Overview

**AutoMind** is a cross-platform car maintenance tracker with an AI assistant that understands your car's full history. Users log maintenance, track fuel costs, upload invoices, and get mileage-based service predictions. The AI chat feature lets users ask natural language questions about their car data.

**Web:** Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui  
**Mobile:** Expo (React Native) + TypeScript + NativeWind  
**Backend/DB:** Supabase (Postgres + Auth + Storage)  
**AI:** Anthropic Claude API (claude-sonnet-4-20250514)  
**Deployment:** Vercel (web) + Expo Go / EAS Build (mobile)

---

## Monorepo Structure

```
automind/
├── apps/
│   ├── web/                        # Next.js app
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx                # Dashboard home
│   │   │   │   ├── cars/
│   │   │   │   │   ├── page.tsx            # Car list
│   │   │   │   │   ├── [id]/page.tsx       # Car detail
│   │   │   │   │   └── new/page.tsx        # Add car
│   │   │   │   ├── maintenance/
│   │   │   │   │   ├── page.tsx            # Maintenance log
│   │   │   │   │   └── new/page.tsx        # Log maintenance
│   │   │   │   ├── accidents/
│   │   │   │   │   ├── page.tsx            # Accident history
│   │   │   │   │   └── new/page.tsx        # Log accident

│   │   │   │   ├── expenses/page.tsx       # Expense dashboard
│   │   │   │   └── chat/page.tsx           # AI assistant
│   │   │   └── api/
│   │   │       ├── chat/route.ts           # AI chat endpoint
│   │   │       └── predict/route.ts        # Maintenance prediction
│   │   └── components/
│   │       ├── cars/
│   │       ├── maintenance/
│   │       ├── fuel/
│   │       ├── expenses/
│   │       └── chat/
│   └── mobile/                     # Expo app
│       ├── app/
│       │   ├── (tabs)/
│       │   │   ├── index.tsx           # Dashboard
│       │   │   ├── cars.tsx
│       │   │   ├── maintenance.tsx
│       │   │   ├── fuel.tsx
│       │   │   └── chat.tsx
│       │   └── _layout.tsx
│       └── components/
├── packages/
│   ├── shared/                     # Shared types, utils, API client
│   │   ├── types.ts
│   │   ├── supabase.ts
│   │   └── predictions.ts
├── supabase/
│   └── migrations/                 # SQL migrations
├── CLAUDE.md
├── package.json                    # Turborepo root
└── turbo.json
```

---

## Database Schema

```sql
create table cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  make text not null,
  model text not null,
  year int not null,
  license_plate text,
  current_mileage int not null,
  purchase_date date,
  created_at timestamptz default now()
);

create table maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars not null,
  user_id uuid references auth.users not null,
  type text not null,               -- 'oil_change' | 'tire_rotation' | 'inspection' | 'repair' | 'other'
  title text not null,
  description text,
  mileage_at_service int not null,
  cost numeric(10,2),
  service_date date not null,
  next_service_mileage int,
  invoice_url text,                 -- Supabase Storage URL
  created_at timestamptz default now()
);

create table fuel_logs (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars not null,
  user_id uuid references auth.users not null,
  date date not null,
  liters numeric(6,2) not null,
  cost_per_liter numeric(6,3) not null,
  total_cost numeric(8,2) not null,
  mileage int not null,
  full_tank boolean default true,
  notes text,
  created_at timestamptz default now()
);

create table reminders (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars not null,
  user_id uuid references auth.users not null,
  type text not null,               -- 'mileage' | 'date'
  title text not null,
  due_mileage int,
  due_date date,
  is_done boolean default false,
  created_at timestamptz default now()
);

create table accident_logs (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars not null,
  user_id uuid references auth.users not null,
  date date not null,
  title text not null,                          -- short summary, e.g. "Rear-end collision"
  description text,                             -- full incident description
  location text,                                -- where it happened
  mileage_at_accident int,
  at_fault boolean,                             -- was the user at fault?
  third_party_involved boolean default false,
  police_report_number text,
  insurance_claim_number text,
  total_repair_cost numeric(10,2),
  insurance_covered numeric(10,2),              -- amount covered by insurance
  out_of_pocket numeric(10,2),                  -- computed: total - covered
  status text default 'open',                   -- 'open' | 'in_repair' | 'settled' | 'closed'
  damaged_parts text[],                         -- array: ['front_bumper', 'hood', 'headlight_left', ...]
  photo_urls text[],                            -- Supabase Storage URLs for accident photos
  created_at timestamptz default now()
);

-- RLS
alter table cars enable row level security;
alter table maintenance_logs enable row level security;
alter table fuel_logs enable row level security;
alter table reminders enable row level security;

create policy "own cars" on cars for all using (auth.uid() = user_id);
create policy "own maintenance" on maintenance_logs for all using (auth.uid() = user_id);
create policy "own fuel" on fuel_logs for all using (auth.uid() = user_id);
create policy "own reminders" on reminders for all using (auth.uid() = user_id);
alter table accident_logs enable row level security;
create policy "own accidents" on accident_logs for all using (auth.uid() = user_id);
```

---

## Core Features

### 1. Car Profile
- Add/edit/delete cars with: name, make, model, year, license plate, current mileage, purchase date
- Multiple cars per user; car selector in nav

### 2. Maintenance Log
- Log any service: oil change, tire rotation, inspection, repair, custom
- Fields: mileage, cost, date, description
- Upload invoice/receipt → Supabase Storage bucket `invoices`, path `{user_id}/{car_id}/{timestamp}.jpg`
- Auto-suggest next service mileage based on type

### 3. Fuel Tracker
- Log fill-ups: liters, cost/liter, odometer
- Auto-calculate L/100km between consecutive fill-ups
- Monthly fuel cost chart

### 4. Expense Dashboard
- Total by category (fuel, oil, tires, repairs)
- Monthly + yearly breakdown, cost-per-km over time
- Recharts (web) / Victory Native (mobile)

### 5. Maintenance Predictions (`packages/shared/predictions.ts`)
```ts
const SERVICE_INTERVALS_KM: Record<string, number> = {
  oil_change: 5000,
  tire_rotation: 10000,
  air_filter: 20000,
  brake_inspection: 30000,
}
// Returns list of upcoming services with km remaining and urgency level
```

### 6. Reminders
- By mileage ("at 85,000 km") or date ("in 3 months")
- Overdue badge on dashboard
- Expo push notifications (mobile)

### 8. Accident Log
Full accident tracking per car with the following fields:

**Form fields:**
- `title` — short label (e.g. "Rear-end on Highway 15")
- `date` — date of accident
- `location` — text field (street, city, or GPS description)
- `mileage_at_accident` — odometer reading
- `at_fault` — yes / no toggle
- `third_party_involved` — yes / no toggle
- `police_report_number` — optional text
- `insurance_claim_number` — optional text
- `description` — free-text incident description
- `damaged_parts` — multi-select checklist from a predefined list (see below)
- `total_repair_cost` — numeric
- `insurance_covered` — numeric (out-of-pocket auto-computed = total − covered)
- `status` — dropdown: Open / In Repair / Settled / Closed
- `photos` — upload 1–5 photos → Supabase Storage bucket `accident-photos`, path `{user_id}/{car_id}/{accident_id}/{n}.jpg`

**Damaged parts checklist (predefined options):**
```
Front Bumper, Rear Bumper, Hood, Trunk, Roof,
Windshield, Rear Window, Left Front Door, Right Front Door,
Left Rear Door, Right Rear Door, Left Headlight, Right Headlight,
Left Tail Light, Right Tail Light, Left Front Wheel, Right Front Wheel,
Left Rear Wheel, Right Rear Wheel, Engine, Airbags, Frame/Chassis, Other
```

**Accident list page:**
- Cards sorted by date desc
- Status badge (color-coded: open = red, in_repair = yellow, settled = blue, closed = grey)
- Summary: date, title, total cost, out-of-pocket, status
- Click to expand full detail view
- Total accident cost stat at top of page

**Detail view:**
- All fields displayed cleanly
- Photo gallery (thumbnail grid → lightbox on click)
- Damaged parts shown as visual badges
- Edit and delete buttons

**Dashboard widget:**
- Show count of open/in-repair accidents with a warning icon
- Link to accidents page

**AI Chat integration:**
- Inject last 10 accident logs into the AI system prompt context
- AI should answer questions like:
  - "How much have I spent on accident repairs?"
  - "What parts of my car have been damaged before?"
  - "Is my insurance claim still open?"

### 7. AI Chat Assistant ⭐
Full-page chat on both web and mobile. Before each message, fetch user's car data and inject as system context.

**API Route** (`apps/web/app/api/chat/route.ts`):
```ts
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const { messages, carId } = await req.json()

  // Fetch car context
  const [car, maintenance, fuel, reminders, accidents] = await Promise.all([...])

  const systemPrompt = `You are AutoMind, a smart car assistant. You have the user's complete car data below. Answer questions about maintenance history, costs, fuel consumption, and upcoming services. Be concise and specific.

CAR DATA:
${JSON.stringify({ car, maintenance, fuel, reminders })}

Today: ${new Date().toISOString().split('T')[0]}`

  const client = new Anthropic()
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  return stream.toReadableStream()
}
```

**Example queries it must handle:**
- "How much have I spent on my car this year?"
- "When was my last oil change and am I overdue?"
- "What's my average fuel consumption this month?"
- "What maintenance should I expect in the next 3 months?"

Use Vercel AI SDK `useChat` hook on the client for streaming.

---

## Shared Types (`packages/shared/types.ts`)

```ts
export type Car = {
  id: string; name: string; make: string; model: string
  year: number; license_plate?: string
  current_mileage: number; purchase_date?: string
}

export type MaintenanceLog = {
  id: string; car_id: string
  type: 'oil_change' | 'tire_rotation' | 'inspection' | 'repair' | 'other'
  title: string; description?: string
  mileage_at_service: number; cost?: number
  service_date: string; next_service_mileage?: number; invoice_url?: string
}

export type FuelLog = {
  id: string; car_id: string; date: string
  liters: number; cost_per_liter: number; total_cost: number
  mileage: number; full_tank: boolean
}

export type Reminder = {
  id: string; car_id: string
  type: 'mileage' | 'date'; title: string
  due_mileage?: number; due_date?: string; is_done: boolean
}

export type AccidentLog = {
  id: string; car_id: string
  date: string; title: string; description?: string; location?: string
  mileage_at_accident?: number
  at_fault: boolean; third_party_involved: boolean
  police_report_number?: string; insurance_claim_number?: string
  total_repair_cost?: number; insurance_covered?: number; out_of_pocket?: number
  status: 'open' | 'in_repair' | 'settled' | 'closed'
  damaged_parts: string[]
  photo_urls: string[]
}
```

---

## Key Implementation Rules

1. **Supabase RLS is non-negotiable** — never bypass row-level security.
2. **All types in `packages/shared/types.ts`** — never redefine per-app.
3. **Mobile uses NativeWind** — no `StyleSheet.create()` for layout.
4. **AI context limit** — inject max 20 records per table to stay within token limits.
5. **`ANTHROPIC_API_KEY` is server-only** — never expose to client bundle.
6. **Invoice URLs** — always use Supabase signed URLs (expire after 1 hour), never public URLs.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # Server-side only
ANTHROPIC_API_KEY=               # Server-side only, never expose to client
```

---

## Commands

```bash
npm install                         # From root
npm run dev --filter=web            # Web dev server
npm run dev --filter=mobile         # Expo Go
npm run dev                         # Both
npx supabase db push                # Apply migrations
```

---

## Definition of Done (MVP)

- [ ] Auth (login, register, logout) via Supabase Auth
- [ ] Add / edit / delete cars
- [ ] Log maintenance with invoice upload
- [ ] Log fuel fill-ups with auto L/100km calculation
- [ ] Expense dashboard with charts
- [ ] Mileage-based maintenance predictions
- [ ] Date + mileage reminders
- [ ] Accident log with damaged parts, photos, costs, insurance tracking
- [ ] AI chat with full car context + streaming responses
- [ ] Works on web (Vercel) + mobile (Expo Go)
- [ ] RLS enabled and tested on all tables

---

## Portfolio Notes

Demonstrates: full-stack monorepo architecture, cross-platform (web + mobile) from one codebase, context-aware AI assistant, real-world Supabase data modeling with RLS, and genuine product thinking.

**Demo script:** Add a car → log an oil change → log 3 fuel fill-ups → open AI chat → ask "am I due for an oil change?" and "how much have I spent on fuel this month?"
