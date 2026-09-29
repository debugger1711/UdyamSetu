import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import { toVaultDocument } from "../lib/documents/present";
import {
  documentStoragePath,
  sanitizeFileName,
  validateDocumentUpload,
} from "../lib/documents/validate-upload";

const ROOT = path.resolve(import.meta.dirname, "..");

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const DOCX = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const DOC = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]);
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);

describe("document upload validation", () => {
  it("accepts a PDF whose bytes match the extension", () => {
    const result = validateDocumentUpload({
      fileName: "site-plan.pdf",
      mimeType: "application/pdf",
      bytes: PDF,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.safeFileName, "site-plan.pdf");
  });

  it("rejects an unsupported extension, a mismatched MIME type, an empty file, and an unsafe name", () => {
    assert.equal(validateDocumentUpload({
      fileName: "notes.txt",
      mimeType: "text/plain",
      bytes: new Uint8Array([1, 2, 3, 4]),
    }).ok, false);
    assert.equal(validateDocumentUpload({
      fileName: "site-plan.pdf",
      mimeType: "application/x-msdownload",
      bytes: PDF,
    }).ok, false);
    assert.equal(validateDocumentUpload({
      fileName: "site-plan.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(),
    }).ok, false);
    assert.equal(sanitizeFileName("../secret.pdf"), null);
    assert.equal(sanitizeFileName("C:\\Windows\\file.pdf"), null);
    const oversized = validateDocumentUpload({
      fileName: "site-plan.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(25 * 1024 * 1024 + 1),
    });
    assert.equal(oversized.ok, false);
    if (!oversized.ok) assert.equal(oversized.reason, "too_large");
  });

  it("rejects a renamed executable and accepts doc and docx signatures", () => {
    const renamed = validateDocumentUpload({
      fileName: "payload.pdf",
      mimeType: "application/pdf",
      bytes: EXE,
    });
    assert.equal(renamed.ok, false);
    if (!renamed.ok) assert.equal(renamed.reason, "content");
    assert.equal(validateDocumentUpload({
      fileName: "letter.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: DOCX,
    }).ok, true);
    assert.equal(validateDocumentUpload({
      fileName: "letter.doc",
      mimeType: "application/msword",
      bytes: DOC,
    }).ok, true);
  });
});

describe("document storage path and status", () => {
  it("builds the path on the server and does not keep a caller-supplied path", () => {
    const storagePath = documentStoragePath(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "site-plan.pdf",
    );
    assert.equal(
      storagePath,
      "application/11111111-1111-4111-8111-111111111111/documents/22222222-2222-4222-8222-222222222222/site-plan.pdf",
    );
    assert.equal(storagePath.includes(".."), false);
  });

  it("shows an uploaded document as stored, not verified", () => {
    const view = toVaultDocument({
      id: "22222222-2222-4222-8222-222222222222",
      application_id: "11111111-1111-4111-8111-111111111111",
      application_approval_id: "33333333-3333-4333-8333-333333333333",
      name: "Site plan",
      file_name: "site-plan.pdf",
      mime_type: "application/pdf",
      file_size: 2048,
      status: "uploaded",
      category: "Land & Site",
      authority: null,
      analysis: null,
      uploaded_at: "2026-09-28T12:00:00.000Z",
    });
    assert.equal(view.status, "Uploaded");
    assert.equal(view.validationStatus, "pending");
    assert.equal(view.approvalId, "33333333-3333-4333-8333-333333333333");
    assert.match(view.notes, /Not verified/);
  });
});

describe("phase 4 migration and screens", () => {
  it("creates a private document record without demo rows", () => {
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260928210000_phase4_documents.sql"),
      "utf8",
    );
    assert.match(migration, /create table if not exists public\.documents/);
    assert.match(migration, /status in \('uploaded'\)/);
    assert.match(migration, /application-documents', false/);
    assert.match(migration, /documents_select_own/);
    assert.match(migration, /register_uploaded_document/);
    assert.match(migration, /insert into public\.documents/);
    assert.doesNotMatch(migration, /insert into public\.applications/i);
    assert.doesNotMatch(migration, /grant insert on public\.documents/i);
    assert.doesNotMatch(migration, /sharma|ecofab|US-MH-CTE-2025-01842/i);
  });

  it("accepts only an owned application and an approval on that application", () => {
    const records = readFileSync(path.join(ROOT, "lib/documents/records.ts"), "utf8");
    const upload = readFileSync(
      path.join(ROOT, "app/api/applications/[applicationId]/documents/route.ts"),
      "utf8",
    );
    const file = readFileSync(
      path.join(ROOT, "app/api/documents/[documentId]/file/route.ts"),
      "utf8",
    );
    const analyze = readFileSync(path.join(ROOT, "app/api/documents/analyze/route.ts"), "utf8");
    const migration = readFileSync(
      path.join(ROOT, "supabase/migrations/20260928210000_phase4_documents.sql"),
      "utf8",
    );

    assert.match(records, /getOwnedApplication\(input\.applicationId\)/);
    assert.match(records, /if \(!application\.data\) return \{ status: 404 \}/);
    assert.match(records, /approval\.application_id !== input\.applicationId/);
    assert.match(records, /documentStoragePath\(input\.applicationId, documentId, checked\.safeFileName\)/);
    assert.doesNotMatch(upload, /form\.get\("storagePath"\)|form\.get\("userId"\)|form\.get\("projectId"\)/);
    assert.match(records, /applications\.data\.some/);
    assert.match(file, /getOwnedDocument/);
    assert.match(analyze, /getOwnedDocument/);
    assert.match(migration, /owner is distinct from auth\.uid\(\)/);
    assert.match(migration, /approval does not belong to this application/);
    assert.match(migration, /'uploaded'/);
    assert.doesNotMatch(migration, /verified|officer_verified/i);
  });

  it("does not load demo documents on the applicant documents page", () => {
    const page = readFileSync(path.join(ROOT, "app/(applicant)/documents/page.tsx"), "utf8");
    const vault = readFileSync(path.join(ROOT, "app/(applicant)/documents/documents-vault.tsx"), "utf8");
    for (const source of [page, vault]) {
      assert.doesNotMatch(source, /useDemo|IndexedDB|udyamsetu_vault_db|INITIAL_18_APPROVALS/);
      assert.doesNotMatch(source, /Sharma|EcoFab/);
    }
    assert.match(page, /listOwnedDocuments/);
    assert.match(vault, /\/api\/applications\/\$\{applicationId\}\/documents/);
  });
});
