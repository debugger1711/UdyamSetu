import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { readPublicSupabaseConfig } from "../lib/supabase/env";
import { checkDatabaseConnection, healthHttpStatus } from "../lib/supabase/health";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const ORIGINAL_ENV = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));
const ORIGINAL_FETCH = globalThis.fetch;

const TEST_URL = "https://udyamsetu-phase0.supabase.co";
const TEST_ANON_KEY = "phase0-test-anon-key-not-a-secret";

function setPublicEnv(url: string | undefined, anonKey: string | undefined) {
  if (url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = url;

  if (anonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    const previous = ORIGINAL_ENV.get(key);
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("health HTTP status", () => {
  it("returns 200 when the database is reachable", () => {
    assert.equal(healthHttpStatus(true), 200);
  });

  it("returns 503 when the database is unavailable", () => {
    assert.equal(healthHttpStatus(false), 503);
  });
});

describe("database connection probe", () => {
  it("returns false when Supabase is not configured", async () => {
    setPublicEnv(undefined, undefined);
    assert.equal(await checkDatabaseConnection(), false);
  });

  it("returns false for example placeholders", async () => {
    setPublicEnv("https://your-project.supabase.co", "your-supabase-anon-key");
    assert.equal(readPublicSupabaseConfig(), null);
    assert.equal(await checkDatabaseConnection(), false);
  });

  it("returns true when health_check responds with 1", async () => {
    setPublicEnv(TEST_URL, TEST_ANON_KEY);
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      assert.match(requestUrl(input), /\/rest\/v1\/rpc\/health_check$/);
      return new Response("1", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    assert.equal(await checkDatabaseConnection(), true);
  });

  it("returns false when the database responds with an error", async () => {
    setPublicEnv(TEST_URL, TEST_ANON_KEY);
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ message: "unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    assert.equal(await checkDatabaseConnection(), false);
  });

  it("returns false when the network request fails", async () => {
    setPublicEnv(TEST_URL, TEST_ANON_KEY);
    globalThis.fetch = (async () => {
      throw new Error("connect ECONNREFUSED");
    }) as typeof fetch;

    assert.equal(await checkDatabaseConnection(), false);
  });
});
