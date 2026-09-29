import { isLocalOfficerAutoActivationEnabled } from "../lib/auth/officer-auto-activation.ts";
import assert from "node:assert/strict";

console.log("==================================================");
console.log("TESTING PRODUCTION AUTHORIZATION PROTECTION");
console.log("==================================================");

// Test 1: In production mode, auto-activation is unconditionally false
process.env.NODE_ENV = "production";
delete process.env.LOCAL_DEMO_AUTO_ACTIVATE;

const isEnabledInProd = isLocalOfficerAutoActivationEnabled();
console.log(`1. isLocalOfficerAutoActivationEnabled() with NODE_ENV='production': ${isEnabledInProd}`);
assert.equal(isEnabledInProd, false, "Must return false in production configuration!");

// Test 2: Even with remote Supabase URL, auto-activation is false
process.env.NODE_ENV = "development";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://production-project.supabase.co";

const isEnabledRemote = isLocalOfficerAutoActivationEnabled();
console.log(`2. isLocalOfficerAutoActivationEnabled() with remote production URL: ${isEnabledRemote}`);
assert.equal(isEnabledRemote, false, "Must return false for non-local Supabase URLs!");

// Test 3: Only local development with local URL returns true
process.env.NODE_ENV = "development";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";

const isEnabledDev = isLocalOfficerAutoActivationEnabled();
console.log(`3. isLocalOfficerAutoActivationEnabled() with local development: ${isEnabledDev}`);
assert.equal(isEnabledDev, true, "Must return true ONLY in local development with local Supabase!");

console.log("\n✔ Production authorization protection verified 100%!");
