import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  filterShellSearch,
  presentSidebarProject,
  profileInitials,
  settingsFields,
  unreadFromRows,
} from "../lib/shell/present";

const ROOT = path.resolve(import.meta.dirname, "..");

function source(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("shell presenter", () => {
  it("uses the newest supplied project and does not invent a location or time saved", () => {
    const card = presentSidebarProject([
      { id: "p1", name: "North Loom", entity_name: "North Loom Works", location: "Pune industrial area" },
    ]);
    assert.equal(card.name, "North Loom Works");
    assert.equal(card.detail, "Pune industrial area");
    const empty = presentSidebarProject([]);
    assert.equal(empty.name, "No project is recorded");
    assert.equal(empty.detail, "Not recorded");
    assert.doesNotMatch(JSON.stringify(empty), /Sharma|19 days/);
  });

  it("shows the signed-in name, email, and role labels without stored phone or tax ids", () => {
    const fields = settingsFields({ fullName: "Asha Kulkarni", email: "asha@example.com" });
    assert.equal(fields.representative, "Asha Kulkarni");
    assert.equal(fields.email, "asha@example.com");
    assert.equal(fields.mobile, "Not recorded");
    assert.equal(fields.taxIdentity, "Not recorded");
    assert.equal(profileInitials("Asha Kulkarni"), "AK");
    assert.equal(profileInitials(null), "—");
  });

  it("counts only notifications that have no read timestamp", () => {
    assert.equal(unreadFromRows([
      { readAt: null },
      { readAt: "2026-09-28T00:00:00.000Z" },
      { readAt: null },
    ]), 2);
    assert.equal(unreadFromRows([]), 0);
  });

  it("searches owned projects and the approval catalog without demo application ids", () => {
    const results = filterShellSearch("loom", [
      { title: "North Loom Works", category: "Project", url: "/projects/p1", description: "Not recorded" },
      { title: "Consent to Establish (CTE)", category: "Approval", url: "/approvals", description: "MPCB" },
    ]);
    assert.equal(results.length, 1);
    assert.equal(results[0]?.title, "North Loom Works");
    assert.doesNotMatch(JSON.stringify(results), /US-MH-CTE-2025-01842|EcoFab|Chakan/);
  });
});

describe("sidebar, navbar, and settings sources", () => {
  const sidebar = source("components/layout/app-sidebar.tsx");
  const navbar = source("components/layout/top-navbar.tsx");
  const settings = source("app/(applicant)/settings/page.tsx");
  const combined = `${sidebar}\n${navbar}\n${settings}`;

  it("does not depend on demo state, demo identity, or a client-supplied user id", () => {
    assert.doesNotMatch(combined, /useDemo|DemoProvider|DEMO_USER|DEMO_PROJECT|INITIAL_|localStorage|sessionStorage|udyamsetu_demo_state_v2/);
    assert.doesNotMatch(combined, /Sharma|Arjun|Rahul|EcoFab|US-MH-CTE-2025-01842|19 days|Reset Demo|resetDemoState|setRole\(/);
    assert.match(source("lib/shell/load.ts"), /listOwnedProjects/);
    assert.match(navbar, /\/api\/auth\/session/);
    assert.match(navbar, /\/api\/notifications/);
    assert.match(settings, /getCurrentProfile\(/);
    assert.doesNotMatch(combined, /searchParams|userId/);
  });
});
