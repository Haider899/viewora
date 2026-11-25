import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { PaymentMethod, DepositRequest } from '../types/index.js';
import {
  ArrowDownLeft,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Copy,
  Clock,
  ShieldCheck,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface DepositProps {
  navigate?: (route: string) => void;
}

export const DepositPage: React.FC<DepositProps> = ({ navigate }) => {
  const { user, refreshWallet } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(true);
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

  const fetchDepositData = async (clearMessages = false) => {
    setLoadingMethods(true);
    if (clearMessages) {
      setSuccessMsg(null);
      setErrorMsg(null);
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
    } catch (err) {
      console.error('Failed to load deposit methods:', err);
      setErrorMsg('Unable to load deposit channels. Please refresh the page.');
    } finally {
      setLoadingMethods(false);
    }
  };

  useEffect(() => {
    fetchDepositData();
  }, []);

  const handleCopyAccount = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 5 MB.');
      return;
    }

    setErrorMsg(null);
    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedMethod) {
      setErrorMsg(
        methods.length === 0
          ? 'No active USD payment channels are currently configured. Please contact U-Ads support.'
          : 'Please select a verified USD payment channel on the left before submitting.'
      );
      return;
    }

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid USD deposit amount.');
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    if (amountCents < selectedMethod.minAmountCents || amountCents > selectedMethod.maxAmountCents) {
      setErrorMsg(
        `Amount must be between $${(selectedMethod.minAmountCents / 100).toFixed(2)} and $${(
          selectedMethod.maxAmountCents / 100
        ).toFixed(2)} USD.`
      );
      return;
    }

    if (!txRefInput.trim()) {
      setErrorMsg('Please provide your authentic transaction ID, wire reference, or blockchain TxHash.');
      return;
    }

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
          'Deposit submitted successfully! Status is Pending Verification (typical verification time: 10–30 minutes). Your Main Account Credits will update automatically once approved by Admin.'
        );
        setAmountInput('');
        setTxRefInput('');
        setProofImage('');
        setProofFileName('');
        await fetchDepositData();
        await refreshWallet();
      } else {
        setErrorMsg(res.error?.message || 'Submission failed. Please check your details and try again.');
      }
    } catch {
      setErrorMsg('Network error submitting deposit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Deposit USD Credits</h2>
          <p className="text-xs text-slate-500">
            Send USD to an active U-Ads treasury channel and submit your transaction reference. Verification typically takes 10–30 minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchDepositData(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          {navigate && (
            <button
              onClick={() => navigate('wallet')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 px-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Wallet
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Payment Method Selection & Instructions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Select Verified USD Channel
          </div>

          {loadingMethods ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 text-center">
              Loading active USD payment channels...
            </div>
          ) : methods.length === 0 ? (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                No Active USD Deposit Channels Available
              </div>
              <p className="text-rose-700 leading-relaxed">
                Payment channels are currently being updated by our Finance Desk. Please click Refresh or contact U-Ads Live Support.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {methods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(method);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    selectedMethod?.id === method.id
                      ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {method.name}
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        USD
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Min: ${(method.minAmountCents / 100).toLocaleString()} USD • Max: ${(method.maxAmountCents / 100).toLocaleString()} USD
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedMethod?.id === method.id
                        ? 'border-emerald-600 bg-emerald-600'
                        : 'border-slate-400'
                    }`}
                  >
                    {selectedMethod?.id === method.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Treasury Account Details Box */}
          {selectedMethod && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified U-Ads Treasury Recipient
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Account Title:</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedMethod.accountTitle}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Wallet Address / Account Number:</span>
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold text-slate-900 mt-1">
                    <span className="break-all">{selectedMethod.accountNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAccount(selectedMethod.accountNumber)}
                      className="p-1 rounded text-slate-500 hover:text-slate-900 shrink-0"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {copied && (
                    <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
                      Copied to clipboard!
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">Instructions: </span>
                  {selectedMethod.instructions}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Submission Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            2. Submit Payment Details
          </div>

          <form
            onSubmit={handleSubmitDeposit}
            className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-5"
          >
            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Deposit Amount (USD)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                placeholder="e.g. 50.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                required
              />
            </div>

            {/* Transaction Ref */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Transaction ID / Blockchain TxHash / Wire Reference
              </label>
              <input
                type="text"
                placeholder="e.g. TRC-20 TxHash or International Wire Reference Number"
                value={txRefInput}
                onChange={(e) => setTxRefInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Must match your official receipt. Duplicate transaction references are automatically rejected.
              </span>
            </div>

            {/* Sender Name & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sender Full Name
                </label>
                <input
                  type="text"
                  placeholder="Account holder name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sender Wallet / Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sender TRC-20 address or phone"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Payment Receipt / Screenshot Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Receipt Screenshot / Slip
              </label>

              {!proofImage ? (
                <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-emerald-50/30 transition-all text-center group">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 transition-colors">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">
                      Click to upload payment receipt / screenshot
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG, JPEG, WEBP up to 5MB (USDT confirmation or bank wire receipt)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={proofImage}
                      alt="Receipt preview"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {proofFileName || 'Receipt Slip Attached'}
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready for submission
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProofImage('');
                      setProofFileName('');
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    title="Remove receipt"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white transition-all flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              {submitting ? 'Submitting Request...' : 'Submit Deposit for Verification'}
            </button>
          </form>

          {/* Past Deposits Status Table */}
          <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Your Deposit Requests History
            </h3>

            {deposits.length === 0 ? (
              <p className="text-xs text-slate-400">No deposit requests submitted yet.</p>
            ) : (
              <div className="space-y-2.5">
                {deposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">
                          ${(dep.amountCents / 100).toFixed(2)} USD
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          Ref: {dep.transactionRef} • {new Date(dep.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {dep.proofImageUrl && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3 text-emerald-600" />
                            Slip
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            dep.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : dep.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {dep.status === 'PENDING' ? 'Pending Verification (10–30 min)' : dep.status}
                        </span>
                      </div>
                    </div>
                    {dep.rejectionReason && (
                      <div className="text-[11px] text-rose-600 pt-1 border-t border-slate-200">
                        Rejection Reason: {dep.rejectionReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
