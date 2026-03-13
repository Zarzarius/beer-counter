# Beer Tab

Track drinks and settle your bar tab. A small web app built with [Astro](https://astro.build) and [Supabase](https://supabase.com).

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

## Commands

| Command           | Action                                      |
| ----------------- | ------------------------------------------- |
| `pnpm install`    | Install dependencies                        |
| `pnpm dev`        | Start dev server at `localhost:4321`        |
| `pnpm build`      | Build for production to `./dist/`           |
| `pnpm preview`    | Preview the production build locally        |
| `pnpm astro ...`  | Run Astro CLI (e.g. `astro add`, `astro check`) |

## Project structure

```text
/
├── public/           # Static assets (favicon, logo)
├── src/
│   ├── layouts/     # Layout.astro
│   ├── lib/         # Supabase client (supabase.ts)
│   ├── pages/       # Routes
│   │   ├── index.astro   # Home / welcome
│   │   ├── login.astro   # Login
│   │   ├── customer.astro
│   │   ├── manager.astro
│   │   └── scan.astro
│   └── styles/      # global.css
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Routes are defined by `.astro` (and `.md`) files in `src/pages/`.

## License

MIT
