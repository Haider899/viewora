import React, { useEffect, useState } from 'react';
import api from '../services/api.js';
import { CompanyDocument } from '../types/index.js';
import {
  ShieldCheck,
  FileCheck2,
  X,
  ExternalLink,
  Award,
  Sparkles,
  CheckCircle2,
  Eye,
} from 'lucide-react';

export const HALAL_AD_SHARE_STATEMENT =
  'You earn money by watching ads. Advertisers pay U-Ads to show their ads to our members. 95% of the money advertisers pay is shared with the members who watch those ads — that is where your earnings come from, and that is what makes them halal. The bigger your package, the bigger your share of every ad you watch. Your package is a lifetime subscription: watch ads, and keep earning.';

interface CompanyInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export const CompanyInfoModal: React.FC<CompanyInfoModalProps> = ({ open, onClose }) => {
  const [docs, setDocs] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CompanyDocument | null>(null);

  // Part 16 (d): Preload official documents so modal opens with real content (never "(0)" or empty flash!)
  useEffect(() => {
    let active = true;
    api
      .getPublicDocuments()
      .then((res) => {
        if (active && res.success && Array.isArray(res.data)) {
          setDocs(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoading(false);
          setLoadedOnce(true);
        }
      });
    return () => {
      active = false;
    };
  }, [open]);

  if (!open) return null;

  const openDocumentFile = (doc: CompanyDocument) => {
    if (!doc.fileUrl) return;
    if (doc.fileUrl.startsWith('data:image/') || /\.(png|jpe?g|webp|gif)$/i.test(doc.fileUrl)) {
      setPreviewDoc(doc);
      return;
    }
    if (doc.fileUrl.startsWith('data:')) {
      try {
        const arr = doc.fileUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1]);
        const u8arr = new Uint8Array(bstr.length);
        for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
        const blobUrl = URL.createObjectURL(new Blob([u8arr], { type: mime }));
        window.open(blobUrl, '_blank');
        return;
      } catch {
        // fallback below
      }
    }
    window.open(doc.fileUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-orange-200/80 shadow-2xl overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-orange-50 via-amber-50/70 to-white border-b border-orange-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                U-ADS Company Information &amp; Licensing
              </h2>
              <p className="text-xs text-slate-500">
                Verified credentials, business model, and official licenses
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-orange-100/70 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Halal 95% Ad-Share Statement (Part 1 #2) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50/50 border border-orange-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-orange-700">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>How Your Earnings Work (95% Advertiser Revenue Share)</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
              {HALAL_AD_SHARE_STATEMENT}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-orange-200 text-[11px] font-bold text-orange-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> 95% Ad Revenue Shared
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-[11px] font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Halal Ad-Watching Earnings
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Lifetime Package Subscription
              </span>
            </div>
          </div>

          {/* Official Licenses & Documents Uploaded by Admin */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-orange-600" />
                Official Licenses &amp; Registrations
                {loadedOnce && docs.length > 0 ? ` (${docs.length})` : ''}
              </h3>
            </div>

            {loading && !loadedOnce ? (
              <div className="py-10 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-2.5 text-xs text-slate-500">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading verified company licenses…</span>
              </div>
            ) : docs.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                Official company licenses and registration documents will appear here as published by Administration.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {docs.map((doc) => {
                  const isImage =
                    doc.fileUrl?.startsWith('data:image/') ||
                    /\.(png|jpe?g|webp|gif)$/i.test(doc.fileUrl || '');
                  return (
                    <div
                      key={doc.id}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:border-orange-300 transition-all flex flex-col justify-between"
                    >
                      {isImage && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className="h-32 w-full bg-slate-100 overflow-hidden relative group cursor-pointer"
                        >
                          <img
                            src={doc.fileUrl}
                            alt={doc.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-950/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                            <Eye className="w-4 h-4" /> View License
                          </div>
                        </button>
                      )}
                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <FileCheck2 className="w-4 h-4 text-orange-600 shrink-0" />
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700">
                              {(doc.documentType || 'LICENSE').replace(/_/g, ' ')}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-slate-900 line-clamp-2">
                            {doc.title}
                          </h4>
                          {doc.issuingAuthority && (
                            <p className="text-[11px] text-slate-500">
                              Issuer: {doc.issuingAuthority}
                            </p>
                          )}
                          {doc.licenseNumber && (
                            <p className="text-[10px] font-mono text-slate-600">
                              No: {doc.licenseNumber}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openDocumentFile(doc)}
                          className="w-full py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Inspect License / Certificate</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            U-ADS — A secure and reliable platform for your financial growth and success.
          </span>
          <button type="button" onClick={onClose} className="btn-secondary !h-9">
            Close
          </button>
        </div>
      </div>

      {/* License Fullscreen Image Lightbox */}
      {previewDoc && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/85 flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold truncate">{previewDoc.title}</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-slate-100 max-h-[80vh] overflow-auto flex justify-center">
              <img
                src={previewDoc.fileUrl}
                alt={previewDoc.title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
