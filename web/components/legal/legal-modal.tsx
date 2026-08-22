"use client";

import { X } from "lucide-react";
import LegalDocument from "./legal-document";
import { LegalDocument as LegalDocumentType } from "@/types/legal";

interface LegalModalProps {
  open: boolean;
  onClose: () => void;
  document: LegalDocumentType;
}

export default function LegalModal({
  open,
  onClose,
  document,
}: LegalModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-semibold text-[#0B2D54]">
            {document.title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition hover:bg-slate-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Scrollable document */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <LegalDocument document={document} />
        </div>

        {/* Footer */}
        <div className="border-t bg-white px-6 py-4">
          <p className="mb-4 text-sm text-slate-600">
            Please read this document before returning to complete your
            registration.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#0B2D54] py-3 font-semibold text-white transition hover:bg-[#082443]"
          >
            Continue to Registration
          </button>
        </div>
      </div>
    </div>
  );
}