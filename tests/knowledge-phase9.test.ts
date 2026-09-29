import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { acceptModelSummary, buildGroundedAnswer } from "../lib/knowledge/answer";
import { chunkText } from "../lib/knowledge/chunk";
import { embeddingLiteral, normalizeEmbedding } from "../lib/knowledge/embedding";

const ROOT = path.resolve(import.meta.dirname, "..");
const migration = readFileSync(
  path.join(ROOT, "supabase/migrations/20260928250000_phase9_knowledge.sql"),
  "utf8",
);

describe("knowledge chunking and embeddings", () => {
  it("splits text with overlap and rejects an empty source", () => {
    assert.deepEqual(chunkText("   "), []);
    const text = "a".repeat(2500);
    const chunks = chunkText(text, 1200, 200);
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0].length, 1200);
    assert.equal(chunks[1].slice(0, 200), chunks[0].slice(1000));
  });

  it("accepts only a 768-value embedding", () => {
    assert.equal(normalizeEmbedding([1, 2]), null);
    const values = Array.from({ length: 768 }, () => 0.1);
    assert.equal(normalizeEmbedding(values)?.length, 768);
    assert.equal(embeddingLiteral(values)?.startsWith("[0.1,"), true);
  });
});

describe("grounded answers", () => {
  const citation = {
    chunkId: "chunk-1",
    documentId: "doc-1",
    title: "Stored source",
    sourceLabel: "Recorded authority",
    sourceUri: "https://example.gov/source",
    excerpt: "The stored excerpt mentions section 4 only.",
  };

  it("does not answer when no source was retrieved", () => {
    const answer = buildGroundedAnswer({
      citations: [],
      context: {
        projectLabel: "Recorded project",
        location: null,
        applicationStatus: "submitted",
        approvals: ["Fire NOC"],
        documents: [{ name: "Layout.pdf", status: "uploaded" }],
        workflows: [],
      },
      modelSummary: "The fee is ₹50,000 and the SLA is 15 days.",
    });
    assert.match(answer.headline, /No regulatory source is recorded/);
    assert.equal(answer.atAGlance.applicationFee, "Not recorded");
    assert.equal(answer.timeAndDependencies.sla, "Not recorded");
    assert.equal(answer.requiredDocs[0]?.note.includes("uploaded"), true);
    assert.equal(answer.requiredDocs[0]?.status, "Needs attention");
  });

  it("rejects a model summary that adds a number the excerpt does not contain", () => {
    assert.equal(acceptModelSummary("The fee is 50000.", [citation.excerpt]), null);
    assert.equal(acceptModelSummary("The excerpt mentions section 4.", [citation.excerpt]), "The excerpt mentions section 4.");
    const answer = buildGroundedAnswer({
      citations: [citation],
      context: {
        projectLabel: null,
        location: null,
        applicationStatus: null,
        approvals: [],
        documents: [],
        workflows: ["MPCB: submitted"],
      },
      modelSummary: "Consent costs 50000.",
    });
    assert.match(answer.headline, /do not state a conclusion/);
    assert.equal(answer.authority.name, "Recorded authority");
    assert.equal(answer.officialReference.gazette, "Stored source");
    assert.equal(answer.citations.length, 1);
  });
});

describe("phase 9 migration and screens", () => {
  it("stores knowledge without seeding a corpus", () => {
    assert.match(migration, /create extension if not exists vector/);
    assert.match(migration, /create table if not exists public\.knowledge_documents/);
    assert.match(migration, /create table if not exists public\.knowledge_chunks/);
    assert.match(migration, /extensions\.vector\(768\)/);
    assert.match(migration, /knowledge_documents_select_ready/);
    assert.match(migration, /knowledge_chunks_select_ready/);
    assert.match(migration, /ingest_knowledge_document/);
    assert.match(migration, /search_knowledge_chunks/);
    assert.match(migration, /search_knowledge_text/);
    assert.match(migration, /current_user_role\(\) not in \('officer', 'admin'\)/);
    assert.match(migration, /knowledge document already stored/);
    assert.doesNotMatch(migration, /^insert into public\.knowledge_/m);
    assert.doesNotMatch(migration, /Sharma|EcoFab|US-MH|gazette|15 working days/i);
  });

  it("does not serve the preset regulatory answers", () => {
    const page = readFileSync(path.join(ROOT, "app/(applicant)/regulatory-knowledge/page.tsx"), "utf8");
    const ask = readFileSync(path.join(ROOT, "app/api/ai/ask/route.ts"), "utf8");
    const assistant = readFileSync(path.join(ROOT, "app/api/regulatory-assistant/route.ts"), "utf8");
    assert.doesNotMatch(page, /useDemo|PRESET_ANSWERS|Sharma|US-MH-CTE/);
    assert.match(page, /EMPTY_REGULATORY_ANSWER/);
    assert.match(ask, /askGroundedQuestion/);
    assert.match(assistant, /askGroundedQuestion/);
    assert.doesNotMatch(ask, /Sharma|deterministic|15 working days/);
    assert.doesNotMatch(assistant, /Sharma|deterministic|15 working days/);
  });
});
