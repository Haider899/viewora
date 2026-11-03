import React from 'react';
import { ShieldCheck, FileText, Lock, AlertTriangle } from 'lucide-react';

interface TermsProps {
  navigate: (route: string) => void;
}

export const TermsPage: React.FC<TermsProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="space-y-3 pb-6 border-b border-slate-800">
        <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">
          Legal & Compliance
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Terms of Service & Disclosures</h1>
        <p className="text-xs text-slate-400">
          Last revised: October 10, 2026. Please review these operational terms carefully.
        </p>
      </div>

      <div className="space-y-8 text-xs text-slate-300 leading-relaxed">
        {/* Compliance Warning */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            Important Financial Disclosure & No-Investment Warranty
          </div>
          <p className="text-slate-300">
            VistaraX operates strictly as a digital educational media streaming platform. VistaraX is not a licensed bank, investment fund, broker-dealer, or high-yield investment program (HYIP).
          </p>
          <p className="text-slate-400">
            Depositing funds onto VistaraX does not yield guaranteed passive interest or risk-free returns. Any rewards distributed through the platform represent promotional engagement rewards subject to active session verification.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Package Access & Non-Speculative Use</h2>
          <p>
            Subscribers purchase access to specific masterclass catalog tiers (Starter, Basic, Premium, or VIP). Purchases grant non-exclusive, non-transferable access to the designated video limits for the duration of the account in good standing.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Dual-Currency Ledgering & Mathematical Balancing</h2>
          <p>
            VistaraX maintains separate ledger accounts for United States Dollars (USD) and Pakistani Rupees (PKR). All internal credits, debits, and transfers are posted through double-entry accounting where total debits strictly equal total credits. Balances cannot be modified outside authorized double-entry transactions.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Manual Payment Verification Policy</h2>
          <p>
            Payments submitted via EasyPaisa, JazzCash, USDT, or Bank Wire are placed in a verification queue. Official bank confirmation or blockchain network transaction hashes are required. Submitting fabricated or duplicate transaction references constitutes fraud and will result in immediate account termination.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Withdrawal Processing & Hold Reserves</h2>
          <p>
            Upon submitting a withdrawal request, the requested amount is immediately placed on a ledger hold (reserved balance) to prevent concurrent double-spending. Payouts are finalized once authorized finance personnel record an authentic external payout reference.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">5. Refund & Cancellation Policy</h2>
          <p>
            Unused wallet balances may be requested for withdrawal subject to standard verification. Package subscription purchases are deemed fulfilled upon access unlocking. In the event of platform downtime, users are credited with equivalent platform vouchers or extensions.
          </p>
        </section>
      </div>
    </div>
  );
};
