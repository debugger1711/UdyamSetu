import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { createServerClient } from "@supabase/ssr";

import { createClient as createBrowserClient } from "../lib/supabase/client";
import { readPublicSupabaseConfig } from "../lib/supabase/env";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const ORIGINAL_ENV = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const ROOT = path.resolve(import.meta.dirname, "..");

const TEST_URL = "https://udyamsetu-phase0.supabase.co";
const TEST_ANON_KEY = "phase0-test-anon-key-not-a-secret";

function setPublicEnv(url: string | undefined, anonKey: string | undefined) {
  if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = url;

  if (anonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const previous = ORIGINAL_ENV.get(key);
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});

describe("Supabase public configuration", () => {
  it("does not treat missing values as configured", () => {
    setPublicEnv(undefined, undefined);
    assert.equal(readPublicSupabaseConfig(), null);
  });

  it("accepts a real-looking public URL and anon key", () => {
    setPublicEnv(TEST_URL, TEST_ANON_KEY);
    assert.deepEqual(readPublicSupabaseConfig(), {
      url: TEST_URL,
      anonKey: TEST_ANON_KEY,
    });
  });
});

describe("Supabase browser client", () => {
  it("creates a client when public configuration is present", () => {
    setPublicEnv(TEST_URL, TEST_ANON_KEY);
    const supabase = createBrowserClient();
    assert.equal(typeof supabase.auth.getClaims, "function");
    assert.equal(typeof supabase.from, "function");
  });

  it("refuses to create a client from placeholder configuration", () => {
    setPublicEnv("https://your-project.supabase.co", "your-supabase-anon-key");
    assert.throws(() => createBrowserClient(), /not configured/);
  });
});

describe("Supabase server client", () => {
  it("creates a cookie-bound client when public configuration is present", () => {
    const supabase = createServerClient(TEST_URL, TEST_ANON_KEY, {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          return undefined;
        },
      },
    });

    assert.equal(typeof supabase.auth.getClaims, "function");
    assert.equal(typeof supabase.rpc, "function");
  });
});
describe("session refresh foundation", () => {
  it("refreshes claims and applies the route decision from the proxy", () => {
    const proxySource = readFileSync(path.join(ROOT, "proxy.ts"), "utf8");
    const sessionSource = readFileSync(path.join(ROOT, "lib/supabase/middleware.ts"), "utf8");

    assert.match(proxySource, /updateSession/);
    assert.match(proxySource, /export async function proxy/);
    assert.doesNotMatch(proxySource, /export async function middleware/);
    assert.match(sessionSource, /getClaims\(/);
    assert.match(sessionSource, /decideRouteAccess/);
    assert.match(sessionSource, /NextResponse\.redirect/);
  });
});
