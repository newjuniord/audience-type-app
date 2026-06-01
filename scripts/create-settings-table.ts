import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log("Creating settings table...");

    const sql = `
        CREATE TABLE IF NOT EXISTS public.settings (
            id TEXT PRIMARY KEY,
            value JSONB NOT NULL DEFAULT '{}'::jsonb
        );
        GRANT ALL PRIVILEGES ON TABLE public.settings TO service_role;
    `;

    // Wait, to execute raw SQL from supabase-js, we need an RPC function or we can just use the Postgres REST API? No, supabase-js doesn't support arbitrary DDL out of the box unless we call `rpc`.
    console.log("SQL to run in Supabase dashboard (or using psql):");
    console.log(sql);
}

main().catch(console.error);
