# Beer Tab

Track drinks and settle your bar tab. A small web app built with [Astro](https://astro.build) and [Supabase](https://supabase.com).

## Features

- **Customer tab** — Add drinks with search over the beer catalog (name, brewery, style, year) or enter a custom beer name; view and navigate your tab by day.
- **Manager dashboard** — View active customers, unpaid drinks, and today’s totals; edit or delete drinks; manage **beer stock** (list of beers available for search).
- **Beer catalog** — Static catalog in code plus optional Supabase-backed `beer_stock` table. Search is scored (exact match, prefix, contains) with debounced or immediate updates; results are escaped for safe display.
- **Supabase** — Auth, customer tabs, and optional beer stock table with migration script to seed from the in-app catalog.

## Requirements

- **Node.js** ≥ 22.12.0  
- **pnpm** 9.x (see [pnpm install](https://pnpm.io/installation))

## Setup

1. **Clone and install**

   ```sh
   git clone git@github.com:Zarzarius/beer-counter.git
   cd beer-counter
   pnpm install
   ```

2. **Environment variables**

   Create a `.env` file in the project root with your Supabase credentials:

   ```env
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   ```

   Use your project URL and the **anon** (public) key from the Supabase dashboard.

3. **Run the app**

   ```sh
   pnpm dev
   ```

   Open [http://localhost:4321](http://localhost:4321).

## Guest Access

- The login screen includes a **Continue as guest** option. It creates a **one-time email/password** Supabase user with a random address like `guest-<uuid>@guest.local` and a random password (you do not need to remember them; the session is kept by the Supabase client like any other login).
- Guest users get a `profiles` row as `customer` and can use the normal customer tab flow (including editing their display name).
- **Email confirmation:** Guest sign-in needs an immediate session. In Supabase **Authentication → Providers → Email**, disable **Confirm email** (or otherwise allow automatic confirmation for new users). If confirmation stays required, guest sign-up will fail with a clear in-app message.
- For users without a stored email (edge cases), the UI may still show a stable synthetic guest email in the profile.
- Manager access still requires a profile with `role = manager`.

## Commands

| Command           | Action                                      |
| ----------------- | ------------------------------------------- |
| `pnpm install`    | Install dependencies                        |
| `pnpm dev`        | Start dev server at `localhost:4321`        |
| `pnpm build`      | Build for production to `./dist/`           |
| `pnpm preview`    | Preview the production build locally        |
| `pnpm test`       | Run the Vitest suite                        |
| `pnpm astro ...`  | Run Astro CLI (e.g. `astro add`, `astro check`) |

## Project structure

```text
/
├── public/           # Static assets (favicon, logo)
├── scripts/         # One-off scripts (e.g. migrateBeerCatalogToSupabase.ts)
├── src/
│   ├── data/        # Beer catalog (beerCatalog.ts)
│   ├── layouts/     # Layout.astro
│   ├── lib/         # Shared logic
│   │   ├── supabase.ts
│   │   ├── beerCatalogSearch.ts, beerCatalogResults.ts, beerCatalogInputMode.ts
│   │   └── escapeHtml.ts
│   ├── pages/       # Routes
│   │   ├── index.astro   # Home / welcome
│   │   ├── login.astro   # Login
│   │   ├── customer.astro # Customer tab + beer search
│   │   ├── manager.astro  # Manager dashboard + beer stock
│   │   └── scan.astro
│   └── styles/      # global.css
├── supabase/
│   ├── beer_stock_schema.sql   # beer_stock table + beer_stock_available view
│   └── data.csv                # Optional CSV for stock data
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Routes are defined by `.astro` (and `.md`) files in `src/pages/`.

### Beer stock (Supabase, optional)

To back the beer catalog with Supabase:

1. Run `beer_stock_schema.sql` in the Supabase SQL editor to create the `beer_stock` table and `beer_stock_available` view.
2. Seed from the in-app catalog (requires service role key):

   ```sh
   SUPABASE_URL=https://your-project.supabase.co SUPABASE_SERVICE_ROLE_KEY=your-service-role-key pnpm exec ts-node scripts/migrateBeerCatalogToSupabase.ts
   ```

   **Do not** expose the service role key in the browser or frontend.

## License

MIT
