# Environment Variables for Supabase Project

## Required Environment Variables

Create a `.env.local` file in your Next.js project root with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How to Get These Values

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **API**
   - Copy the **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - In the same **Settings** → **API** page
   - Copy the **anon/public** key under **Project API keys**
   - This is the public key that's safe to expose in client-side code

## Example .env.local file

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzODk2ODAwMCwiZXhwIjoxOTU0NTQ0MDAwfQ.example_key_here
```

## Important Notes

- The `NEXT_PUBLIC_` prefix is required for Next.js to expose these variables to the browser
- Never commit `.env.local` to version control (it should be in `.gitignore`)
- The `anon` key is safe for client-side use because RLS (Row Level Security) policies protect your data
- For server-side operations, you might also need the `service_role` key, but keep it server-side only and never expose it to the client

## Optional: Service Role Key (Server-Side Only)

If you need to perform admin operations on the server side, you can add:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

⚠️ **Warning**: Never expose the service role key in client-side code. Only use it in server-side API routes or server components.
