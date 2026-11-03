import React from 'react';
import { Lock, Shield } from 'lucide-react';

interface PrivacyProps {
  navigate: (route: string) => void;
}

export const PrivacyPage: React.FC<PrivacyProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
      <div className="space-y-3 pb-6 border-b border-slate-800">
        <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">
          Data Governance
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white">Privacy Policy</h1>
        <p className="text-xs text-slate-400">
          Last revised: October 10, 2026. How VistaraX protects your account and transaction data.
        </p>
      </div>

      <div className="space-y-8 text-xs text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Information Collection</h2>
          <p>
            VistaraX collects account identifiers (name, email address, phone number), session telemetry logs (playback time, device metadata, heartbeat verification), and transactional records (deposit references, withdrawal payout addresses).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Cryptographic Security & Passwords</h2>
          <p>
            Passwords are protected using industry-standard salted bcrypt hashing algorithms. At no time are plain-text passwords stored or logged. API communication is strictly secured over 256-bit TLS encrypted channels.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Financial Ledger Confidentiality</h2>
          <p>
            Financial ledger entries, account balances, and withdrawal accounts are isolated to your authenticated profile and accessible solely by certified Finance Administrators. VistaraX never sells or monetizes user telemetry or transaction history to third parties.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. User Rights & Data Deletion</h2>
          <p>
            Users may request copies of their transaction journal or request account closure. Immutable financial records required by financial audit regulations will be archived securely in accordance with applicable statutory requirements.
          </p>
        </section>
      </div>
    </div>
  );
};
