import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { PaymentMethod, DepositRequest } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import { formatDateTime, formatUSD } from '../utils/formatters.js';
import {
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  UploadCloud,
  Trash2,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';

interface DepositProps {
  navigate?: (route: string) => void;
}

export const DepositPage: React.FC<DepositProps> = () => {
  const { user, refreshWallet } = useAuth();
  const { showToast } = useToast();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);

  const [amountInput, setAmountInput] = useState('');
  const [txRefInput, setTxRefInput] = useState('');
  const [senderName, setSenderName] = useState(user?.fullName || '');
  const [senderPhone, setSenderPhone] = useState('');
  const [proofImage, setProofImage] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ amount?: string; txRef?: string; proof?: string }>({});
  const [viewingSlipUrl, setViewingSlipUrl] = useState<string | null>(null);

  const fetchDepositData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
      setSuccessMsg(null);
      setErrorMsg(null);
    } else {
      setLoadingMethods(true);
    }
    try {
      const [methodsRes, myDepositsRes] = await Promise.all([
        api.getPaymentMethods(),
        api.getMyDeposits(),
      ]);

      if (methodsRes.success && Array.isArray(methodsRes.data)) {
        const usdMethods = methodsRes.data.filter(
          (m: PaymentMethod) => m.currency === 'USD' && m.isActive
        );
        setMethods(usdMethods);
        if (usdMethods.length > 0) {
          setSelectedMethod((prev) =>
            prev && usdMethods.some((m: PaymentMethod) => m.id === prev.id) ? prev : usdMethods[0]
          );
        } else {
          setSelectedMethod(null);
        }
      }
      if (myDepositsRes.success && myDepositsRes.data) {
        setDeposits(myDepositsRes.data);
      }
      if (isManualRefresh) {
        showToast('Deposit channels and history refreshed.', 'success');
      }
    } catch (err) {
      console.error('Failed to load deposit methods:', err);
      setErrorMsg('Unable to load deposit channels. Please refresh.');
    } finally {
      setLoadingMethods(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepositData(false);
  }, []);

  const handleCopyAccount = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Recipient address copied to clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (PNG, JPG, or WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Receipt image must be smaller than 5 MB.');
      return;
    }
    setErrorMsg(null);
    setFieldErrors((f) => ({ ...f, proof: undefined }));
    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setProofImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const nextFieldErrors: { amount?: string; txRef?: string; proof?: string } = {};

    if (!selectedMethod) {
      setErrorMsg('Please select a payment channel on the left before submitting.');
      return;
    }

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      nextFieldErrors.amount = 'Enter a valid USD amount.';
    } else {
      const amountCents = Math.round(parsedAmount * 100);
      if (amountCents < selectedMethod.minAmountCents || amountCents > selectedMethod.maxAmountCents) {
        nextFieldErrors.amount = `Amount must be between ${formatUSD(selectedMethod.minAmountCents)} and ${formatUSD(
          selectedMethod.maxAmountCents
        )}.`;
      }
    }

    if (!txRefInput.trim()) {
      nextFieldErrors.txRef = 'Enter your transaction ID, TxHash, or wire reference.';
    }

    // Issue #3: Payment receipt screenshot is strictly required
    if (!proofImage) {
      nextFieldErrors.proof = 'Please upload your payment receipt screenshot before submitting.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }
    setFieldErrors({});

    const amountCents = Math.round(parsedAmount * 100);
    setSubmitting(true);
    try {
      const res = await api.createDepositRequest({
        paymentMethodId: selectedMethod.id,
        amountCents,
        currency: 'USD',
        transactionRef: txRefInput.trim(),
        senderName: senderName.trim() || undefined,
        senderPhone: senderPhone.trim() || undefined,
        proofImageUrl: proofImage || undefined,
      });

      if (res.success) {
        setSuccessMsg(
          `Deposit of ${formatUSD(amountCents)} submitted. Verification normally takes 10–30 minutes.`
        );
        showToast('Deposit submitted for verification.', 'success');
        setAmountInput('');
        setTxRefInput('');
        setProofImage('');
        setProofFileName('');
        await fetchDepositData(false);
        await refreshWallet();
      } else {
        setErrorMsg(res.error?.message || 'Submission failed. Please check your details.');
      }
    } catch {
      setErrorMsg('Network error submitting deposit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step 1: Select Channel & Recipient Details */}
        <div className="lg:col-span-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Step 1 · Choose USD Channel
            </h3>
            <button
              type="button"
              onClick={() => fetchDepositData(true)}
              disabled={refreshing}
              className="btn-secondary !h-8 !px-3"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>

          {loadingMethods ? (
            <div className="space-y-2.5">
              <div className="h-20 rounded-2xl skeleton-shimmer" />
              <div className="h-20 rounded-2xl skeleton-shimmer" />
            </div>
          ) : methods.length === 0 ? (
            <div className="card-white p-5 border-rose-200 bg-rose-50/40 text-xs text-rose-800 space-y-1.5">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                No active USD channels right now
              </div>
              <p className="text-rose-700">
                Please refresh shortly or reach out to Support for assistance.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {methods.map((method) => {
                const isSelected = selectedMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(method);
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setFieldErrors({});
                    }}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-slate-900">{method.name}</div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        {formatUSD(method.minAmountCents)} min · {formatUSD(method.maxAmountCents)} max
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedMethod && (
            <div className="card-white p-5 space-y-4">
              <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Recipient Details
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-slate-500">Account Name</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedMethod.accountTitle}
                  </div>
                </div>

                <div>
                  <div className="text-slate-500">Wallet Address / Account Number</div>
                  <div className="mt-1 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900">
                    <span className="break-all text-xs">{selectedMethod.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(selectedMethod.accountNumber)}
                      className="btn-secondary !h-8 !px-2.5 shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  {selectedMethod.instructions}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Submit Payment Proof & History */}
        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Step 2 · Submit Transfer Details
          </h3>

          <form onSubmit={handleSubmitDeposit} noValidate className="card-white p-6 space-y-5">
            {/* Expected Verification Time Info */}
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Typical verification time: 10–30 minutes.</span> Once approved, your Main Account balance updates automatically and you receive a notification.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Deposit Amount (USD) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="50.00"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  setFieldErrors((f) => ({ ...f, amount: undefined }));
                }}
                className={`w-full h-11 rounded-[10px] px-3.5 text-sm font-bold tabular-nums bg-slate-50 border text-slate-900 placeholder-slate-400 ${
                  fieldErrors.amount ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              {fieldErrors.amount && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.amount}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Transaction ID / TxHash / Wire Reference <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Paste your exact transaction reference"
                value={txRefInput}
                onChange={(e) => {
                  setTxRefInput(e.target.value);
                  setFieldErrors((f) => ({ ...f, txRef: undefined }));
                }}
                className={`w-full h-11 rounded-[10px] px-3.5 text-sm font-mono bg-slate-50 border text-slate-900 placeholder-slate-400 ${
                  fieldErrors.txRef ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
              {fieldErrors.txRef ? (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.txRef}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">
                  Must match your payment receipt. Each reference can only be used once.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Sender Name</label>
                <input
                  type="text"
                  placeholder="Account holder name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full h-10 rounded-[10px] px-3.5 text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sender Wallet or Phone
                </label>
                <input
                  type="text"
                  placeholder="Optional sender address or phone"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full h-10 rounded-[10px] px-3.5 text-xs bg-slate-50 border border-slate-200 text-slate-900 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Receipt Upload (Required — Issue #3) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Receipt Screenshot <span className="text-rose-600">*</span>
              </label>
              {!proofImage ? (
                <label
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center ${
                    fieldErrors.proof
                      ? 'border-rose-400 bg-rose-50/40'
                      : 'border-slate-200 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/30'
                  }`}
                >
                  <UploadCloud className={`w-5 h-5 ${fieldErrors.proof ? 'text-rose-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-700">Upload receipt image (required)</span>
                  <span className="text-[11px] text-slate-400">PNG, JPG, or WEBP up to 5 MB</span>
                  <input type="file" accept="image/*" onChange={handleReceiptFileChange} className="hidden" />
                </label>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={proofImage}
                      alt="Receipt preview"
                      className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {proofFileName || 'Receipt attached'}
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready to submit
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProofImage('');
                      setProofFileName('');
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove receipt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              {fieldErrors.proof && (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.proof}
                </p>
              )}
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full !h-11">
              <ArrowDownLeft className="w-4 h-4" />
              <span>{submitting ? 'Submitting…' : 'Submit Deposit for Verification'}</span>
            </button>
          </form>

          {/* Deposit History */}
          <div className="card-white p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Your Deposit History</h3>
            {deposits.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No deposit requests yet. Submit your first transfer above to fund your Main Account.
              </p>
            ) : (
              <div className="space-y-2.5">
                {deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm tabular-nums">
                          {formatUSD(dep.amountCents)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono">{dep.transactionRef}</span> · {formatDateTime(dep.createdAt)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {dep.proofImageUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingSlipUrl(dep.proofImageUrl || null)}
                            className="btn-secondary !h-8 !px-2.5 text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View slip</span>
                          </button>
                        )}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            dep.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : dep.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {dep.status === 'PENDING'
                            ? 'Pending'
                            : dep.status === 'APPROVED'
                            ? 'Completed'
                            : 'Rejected'}
                        </span>
                      </div>
                    </div>
                    {dep.rejectionReason && (
                      <div className="text-xs text-rose-700 pt-1.5 border-t border-slate-200">
                        Reason: {dep.rejectionReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Slip Modal */}
      {viewingSlipUrl && (
        <div
          onClick={() => setViewingSlipUrl(null)}
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-3 shadow-2xl relative animate-modal-in"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">Payment Receipt</span>
              <button
                type="button"
                onClick={() => setViewingSlipUrl(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                aria-label="Close receipt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={viewingSlipUrl}
              alt="Payment receipt"
              className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>
        </div>
      )}
    </div>
  );
};
