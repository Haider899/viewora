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
  CreditCard,
  QrCode,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Eye,
} from 'lucide-react';

interface DepositProps {
  navigate?: (route: string) => void;
}

export const DepositPage: React.FC<DepositProps> = ({ navigate }) => {
  const { user, refreshWallet } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
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

  const fetchDepositData = async () => {
    try {
      const [methodsRes, myDepositsRes] = await Promise.all([
        api.getPaymentMethods(),
        api.getMyDeposits(),
      ]);

      if (methodsRes.success && methodsRes.data) {
        setMethods(methodsRes.data);
        if (methodsRes.data.length > 0 && !selectedMethod) {
          setSelectedMethod(methodsRes.data[0]);
        }
      }
      if (myDepositsRes.success && myDepositsRes.data) {
        setDeposits(myDepositsRes.data);
      }
    } catch (err) {
      console.error('Failed to load deposit methods:', err);
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

    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid monetary amount.');
      return;
    }

    const amountCents = Math.round(parsedAmount * 100);

    if (amountCents < selectedMethod.minAmountCents || amountCents > selectedMethod.maxAmountCents) {
      setErrorMsg(
        `Amount must be between ${(selectedMethod.minAmountCents / 100).toFixed(2)} and ${(
          selectedMethod.maxAmountCents / 100
        ).toFixed(2)} ${selectedMethod.currency}.`
      );
      return;
    }

    if (!txRefInput.trim()) {
      setErrorMsg('Please provide your authentic transaction ID, reference number, or TxHash.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createDepositRequest({
        paymentMethodId: selectedMethod.id,
        amountCents,
        currency: selectedMethod.currency,
        transactionRef: txRefInput.trim(),
        senderName: senderName.trim(),
        senderPhone: senderPhone.trim(),
        proofImageUrl: proofImage || undefined,
      });

      if (res.success) {
        setSuccessMsg(
          'Deposit request submitted successfully! Your payment slip has been attached for finance audit.'
        );
        setAmountInput('');
        setTxRefInput('');
        setProofImage('');
        setProofFileName('');
        await fetchDepositData();
        await refreshWallet();
      } else {
        setErrorMsg(res.error?.message || 'Submission failed.');
      }
    } catch (err: any) {
      setErrorMsg('Network error submitting deposit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Deposit & Top-Up Portal</h2>
          <p className="text-xs text-slate-500">
            Send payment to the verified treasury account and submit your authentic transaction reference code.
          </p>
        </div>
        {navigate && (
          <button
            onClick={() => navigate('wallet')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Wallet
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Payment Method Selection & Instructions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            1. Select Verified Channel
          </div>

          <div className="space-y-2.5">
            {methods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                  selectedMethod?.id === method.id
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {method.name}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {method.currency}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Min: {(method.minAmountCents / 100).toLocaleString()} {method.currency}
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
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

          {/* Treasury Account Details Box */}
          {selectedMethod && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-4">
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified Treasury Recipient
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Account Title:</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {selectedMethod.accountTitle}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-medium">Account Number / Wallet:</span>
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
                Deposit Amount ({selectedMethod?.currency})
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                required
              />
            </div>

            {/* Transaction Ref */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Transaction ID / Reference Code / TxID
              </label>
              <input
                type="text"
                placeholder="e.g. 3737 SMS ID, JazzCash TID, or Blockchain TxHash"
                value={txRefInput}
                onChange={(e) => setTxRefInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Must match the official receipt generated by your banking app or network provider.
              </span>
            </div>

            {/* Sender Name & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sender Full Name
                </label>
                <input
                  type="text"
                  placeholder="Your account title"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Sender Phone / Wallet
                </label>
                <input
                  type="text"
                  placeholder="e.g. 03451234567"
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
                      Click to upload payment receipt / slip
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      PNG, JPG, JPEG, WEBP up to 5MB (Bank slip, EasyPaisa/JazzCash confirmation)
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
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 shadow-sm text-sm"
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
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {(dep.amountCents / 100).toFixed(2)} {dep.currency}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        Ref: {dep.transactionRef}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dep.proofImageUrl && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-emerald-600" />
                          Slip
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          dep.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : dep.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {dep.status}
                      </span>
                    </div>
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
