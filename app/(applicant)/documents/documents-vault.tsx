"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  Upload,
  Sparkles,
  Download,
  Eye,
  X,
} from "lucide-react";
import { VaultDocument } from "@/lib/documents/present";

type DocumentsVaultProps = {
  documents: VaultDocument[];
  applicationId: string | null;
};

export default function DocumentsVault({ documents, applicationId }: DocumentsVaultProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<VaultDocument | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalCategory, setModalCategory] = useState("Environmental");
  const [modalAuthority, setModalAuthority] = useState("Maharashtra Pollution Control Board");
  const [isUploading, setIsUploading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (!selectedDocForPreview) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(`/api/documents/${selectedDocForPreview.id}/file`)
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setPreviewBlobUrl(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedDocForPreview]);

  const verifiedCount = 0;

  const needsAttentionCount = 0;
  const missingCount = 0;

  // Handle direct file upload (e.g. from hidden file input)
  const handleDirectFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndSaveDocument(file, file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "), "Environmental", "Maharashtra Pollution Control Board");
    }
  };

  // Handle file selection inside upload modal
  const handleModalFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModalFile(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      if (!modalTitle) {
        setModalTitle(cleanName);
      }
    }
  };

  const processAndSaveDocument = async (
    file: File,
    title: string,
    category: string,
    authority: string
  ) => {
    if (!applicationId) {
      showToast("Create an application before uploading a document.");
      return;
    }

    const body = new FormData();
    body.set("file", file);
    body.set("name", title || file.name);
    body.set("category", category);
    body.set("authority", authority);
    const response = await fetch(`/api/applications/${applicationId}/documents`, {
      method: "POST",
      body,
    });
    if (!response.ok) {
      showToast("The document was not stored.");
      return;
    }
    showToast(`Uploaded ${file.name}. Stored for this application. Not verified.`);
    router.refresh();
  };

  // Submit from upload modal
  const handleUploadModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFile) {
      showToast("Please choose a PDF or DOCX file to upload.");
      return;
    }

    setIsUploading(true);
    processAndSaveDocument(modalFile, modalTitle, modalCategory, modalAuthority).finally(() => {
      setIsUploading(false);
      setIsUploadModalOpen(false);
      setModalFile(null);
      setModalTitle("");
    });
  };

  return (
    <div className="space-y-4">
      {/* Hidden fallback file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDirectFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx"
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 rounded-xl border border-teal-500/40 bg-[#091a2e] text-white px-4 py-2.5 shadow-2xl animate-in slide-in-from-top-4 duration-200 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
            Enterprise Document Vault
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            Documents & Pre-Validation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Repository of files stored for this application. Upload does not verify a document.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#0b1d35] hover:bg-[#122e50] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5 text-teal-400" />
            <span>Upload new document</span>
          </button>
        </div>
      </div>

      {/* Smart Submission Assistant Spotlight Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                Smart Submission Assistant
              </span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                Not verified
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 mt-0.5">
              Upload stores the file. It does not verify it.
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              A stored document is not department acceptance and does not complete an approval.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto" />
      </div>

      {/* Documents Grid Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Uploaded Documents</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {documents.length} total
            </span>
          </div>
          <span className="text-xs text-slate-400">
            {verifiedCount} Verified · {needsAttentionCount} Needs Attention · {missingCount} Missing
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {documents.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">No documents stored for this application.</div>
          ) : null}
          {documents.map((doc) => {
            const isVerified = false;
            const isUploaded = doc.status === "Uploaded";
            const isNeedsAttention = false;
            const isProcessing = false;

            return (
              <div
                key={doc.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isUploaded
                        ? "bg-slate-100 text-slate-600"
                        : isVerified
                        ? "bg-emerald-50 text-emerald-600"
                        : isNeedsAttention
                        ? "bg-amber-50 text-amber-600"
                        : isProcessing
                        ? "bg-teal-50 text-teal-600 animate-pulse"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 truncate">{doc.name}</span>
                      <span className="text-[10px] text-slate-400 shrink-0">({doc.category})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-slate-600">{doc.fileName || doc.file || doc.name}</span>
                      <span>•</span>
                      <span>{doc.size || "2.4 MB"}</span>
                      <span>•</span>
                      <span>{doc.authority || "Regulatory Department"}</span>
                      {doc.uploadDate && doc.uploadDate !== "—" && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">{doc.uploadDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                      isUploaded
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : isVerified
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : isNeedsAttention
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : isProcessing
                        ? "bg-teal-50 text-teal-700 border-teal-200 animate-pulse"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {doc.status}
                  </span>

                  <button
                    data-testid="view-document-btn"
                    onClick={() => {
                      console.log("[DOCUMENTS] VIEW CLICKED FOR DOC:", doc.id, doc.name);
                      setPreviewBlobUrl(null);
                      setSelectedDocForPreview(doc);
                    }}
                    className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Eye className="h-3 w-3 text-slate-400" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* UPLOAD NEW DOCUMENT DIALOG MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-teal-600" />
                  <span>Upload New Document</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Attach statutory clearance, layout drawings, or compliance certificates
                </p>
              </div>
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setModalFile(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer p-1"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUploadModalSubmit} className="space-y-4">
              {/* Hidden file input for modal */}
              <input
                type="file"
                ref={modalFileInputRef}
                onChange={handleModalFileSelected}
                className="hidden"
                accept=".pdf,.doc,.docx"
              />

              {/* File Dropzone / Picker */}
              {!modalFile ? (
                <div
                  onClick={() => modalFileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-teal-500/40 hover:border-teal-600 bg-teal-50/20 p-6 text-center cursor-pointer transition-colors"
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 mb-2">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Click to select PDF or DOCX file
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Supported formats: PDF, DOCX, DOC (up to 25 MB)
                  </span>
                </div>
              ) : (
                /* Selected File Card */
                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-xs">
                      {modalFile.name.split(".").pop()?.toUpperCase() || "PDF"}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 block truncate">
                        {modalFile.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {(modalFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to upload
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="text-[11px] text-teal-800 font-semibold hover:underline shrink-0"
                  >
                    Change file
                  </button>
                </div>
              )}

              {/* Document Title Input */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Document Title / Description
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="e.g. Hazardous Waste Management Plan"
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              {/* Category Selector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Document Category
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value="Environmental">Environmental</option>
                    <option value="Entity Identity">Entity Identity</option>
                    <option value="Land & Site">Land & Site</option>
                    <option value="Civil Architecture">Civil Architecture</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Safety & Fire">Safety & Fire</option>
                    <option value="Financial & Technical">Financial & Technical</option>
                    <option value="Labour & Welfare">Labour & Welfare</option>
                    <option value="General Compliance">General Compliance</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Issuing Authority
                  </label>
                  <input
                    type="text"
                    value={modalAuthority}
                    onChange={(e) => setModalAuthority(e.target.value)}
                    placeholder="e.g. Directorate of Industrial Safety"
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setModalFile(null);
                  }}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modalFile || isUploading}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    !modalFile || isUploading
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-[#0b1d35] hover:bg-[#122e50]"
                  }`}
                >
                  {isUploading ? (
                    <span>Uploading...</span>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 text-teal-400" />
                      <span>Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedDocForPreview.name}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Document Vault Reference #{selectedDocForPreview.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Dynamic Content: In-app preview (if PDF) */}
            {selectedDocForPreview.type === "PDF" && previewBlobUrl && (
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 mb-3">
                <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-700 flex items-center justify-between border-b border-slate-200">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-teal-600" />
                    <span>In-App PDF Document Viewer</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {selectedDocForPreview.fileName || selectedDocForPreview.file}
                  </span>
                </div>
                <object
                  data={previewBlobUrl}
                  type="application/pdf"
                  className="w-full h-44 rounded-b-xl"
                >
                  <div className="p-4 text-center text-xs text-slate-500">
                    PDF document ready in Document Vault. Click Download to save local copy.
                  </div>
                </object>
              </div>
            )}

            <div className="space-y-3 text-xs mb-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Filename</span>
                  <span className="font-mono text-slate-800 font-semibold block truncate">
                    {selectedDocForPreview.fileName || selectedDocForPreview.file || selectedDocForPreview.name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">File Size & Format</span>
                  <span className="font-semibold text-slate-800 block">
                    {selectedDocForPreview.size} · {selectedDocForPreview.type}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Processing Status</span>
                  <span className="font-semibold text-slate-800 block capitalize">
                    {selectedDocForPreview.processingStatus || "Processed"}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] text-slate-400 block font-semibold">Validation Status</span>
                  <span className={`font-bold block ${
                    selectedDocForPreview.status === "Uploaded"
                      ? "text-slate-700"
                      : selectedDocForPreview.status === "Needs attention"
                      ? "text-amber-700"
                      : "text-rose-700"
                  }`}>
                    {selectedDocForPreview.status}
                  </span>
                </div>
              </div>

              {/* EXTRACTED INFORMATION (Prompt Sections 11, 16) */}
              <div className="p-3 rounded-xl border border-teal-100 bg-teal-50/30 space-y-1.5">
                <span className="text-[10px] text-teal-800 uppercase tracking-wider block font-bold">
                  Extracted Document Information (AI & Zero-Entry Scrutiny)
                </span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Enterprise Name</span>
                    <strong className="text-slate-900">
                      {selectedDocForPreview.extractedData?.enterpriseName || "Not found in document"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Project Name</span>
                    <strong className="text-slate-900">
                      {selectedDocForPreview.extractedData?.projectName || "Not found in document"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Investment Amount</span>
                    <strong className="text-slate-900">
                      {selectedDocForPreview.extractedData?.investmentAmount || "Not found in document"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Location</span>
                    <strong className="text-slate-900">
                      {selectedDocForPreview.extractedData?.location || "Not found in document"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Proposed Capacity</span>
                    <strong className="text-slate-900">
                      {selectedDocForPreview.extractedData?.proposedCapacity || "Not found in document"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Registration / Document ID</span>
                    <strong className="font-mono text-slate-900">
                      {selectedDocForPreview.extractedData?.registrationNumber || selectedDocForPreview.id}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Document Type</span>
                    <strong className="text-slate-900">
                      {selectedDocForPreview.extractedData?.documentType || selectedDocForPreview.documentType || "Not found in document"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Issuing Authority</span>
                    <strong className="text-slate-900">
                      {selectedDocForPreview.extractedData?.issuingAuthority || selectedDocForPreview.authority || "Not available"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Statutory Metadata */}
              <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">
                  Statutory Metadata & Audit
                </span>
                <div className="text-[11px] text-slate-600 space-y-1">
                  <div>Issuing Authority: <strong>{selectedDocForPreview.authority || "Regulatory Department"}</strong></div>
                  <div>Application: <strong>{selectedDocForPreview.applicationId}</strong></div>
                  <div>Stored: <strong>{selectedDocForPreview.uploadedAt || selectedDocForPreview.uploadDate}</strong></div>
                  <div>Notes: <em>{selectedDocForPreview.notes}</em></div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  if (!selectedDocForPreview) return;
                  setIsDownloading(true);
                  try {
                    const response = await fetch(`/api/documents/${selectedDocForPreview.id}/file`);
                    if (!response.ok) {
                      showToast("Download failed. Please try again.");
                      return;
                    }
                    const blob = await response.blob();
                    const filename = selectedDocForPreview.fileName || selectedDocForPreview.name;

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast(`Downloaded stored copy: ${filename}`);
                  } catch {
                    showToast("Download failed. Please try again.");
                  } finally {
                    setIsDownloading(false);
                    setSelectedDocForPreview(null);
                  }
                }}
                disabled={isDownloading}
                className="rounded-lg bg-[#0b1d35] hover:bg-[#122e50] text-white px-4 py-1.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-teal-400" />
                <span>{isDownloading ? "Downloading..." : "Download Vault Copy"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
