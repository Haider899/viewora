import React from 'react';
import { ShieldCheck, FileText, Lock, AlertTriangle } from 'lucide-react';

interface TermsProps {
  navigate: (route: string) => void;
}

export const TermsPage: React.FC<TermsProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="space-y-3 pb-6 border-b border-slate-200">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">
          Legal & Compliance
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Terms of Service & Disclosures</h1>
        <p className="text-xs text-slate-500">
          Last revised: October 10, 2026. Please review these operational terms carefully.
        </p>
      </div>

      <div className="space-y-8 text-xs text-slate-600 leading-relaxed">
        {/* Compliance Warning */}
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
          <div className="flex items-center gap-2 font-bold text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            Important Financial Disclosure & No-Investment Warranty
          </div>
          <p className="text-amber-900">
            U-Ads operates strictly as a digital educational media streaming platform. U-Ads is not a licensed bank, investment fund, broker-dealer, or high-yield investment program (HYIP).
          </p>
          <p className="text-amber-800">
            Depositing funds onto U-Ads does not yield guaranteed passive interest or risk-free returns. Any rewards distributed through the platform represent promotional engagement rewards subject to active session verification.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">1. Package Access & Non-Speculative Use</h2>
          <p>
            Subscribers purchase access to specific masterclass catalog tiers (Starter, Basic, Premium, or VIP). Purchases grant non-exclusive, non-transferable access to the designated video limits for the duration of the account in good standing.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">2. USD Ledgering & Mathematical Balancing</h2>
          <p>
            U-Ads maintains ledger accounts for United States Dollars (USD). All internal credits, debits, and transfers are posted through double-entry accounting where total debits strictly equal total credits. Balances cannot be modified outside authorized double-entry transactions.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">3. Manual Payment Verification Policy</h2>
          <p>
            Payments submitted via USDT or Bank Wire are placed in a verification queue and typically verified within 10–30 minutes. Official bank confirmation or blockchain network transaction hashes are required. Submitting fabricated or duplicate transaction references constitutes fraud and will result in immediate account termination.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">4. Withdrawal Processing & Hold Reserves</h2>
          <p>
            Upon submitting a withdrawal request, the requested amount is immediately placed on a ledger hold (reserved balance) to prevent concurrent double-spending. Payouts are finalized once authorized finance personnel record an authentic external payout reference.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2">
          <h2 className="text-base font-bold text-slate-900">5. Refund & Cancellation Policy</h2>
          <p>
            Subscription deposits are used solely to activate or upgrade lifetime U-Ads membership packages and are non-withdrawable. Only earned money — including Video Ad Rewards, Referral Commissions, and Bonuses — may be withdrawn subject to standard verification. Package subscription purchases are deemed fulfilled upon access unlocking.
          </p>
        </section>
      </div>
    </div>
  );
};
