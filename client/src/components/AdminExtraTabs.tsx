import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Printer,
  Search,
  Wallet,
  Gift,
  Users,
  Layers,
  FileBarChart,
  Bell,
  Globe,
  Headphones,
  X,
  ShieldCheck,
} from 'lucide-react';

interface ExtraTabProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

/* =========================================================================
   1. PACKAGES & ACCESS MANAGEMENT TAB
   ========================================================================= */
export const AdminPackagesTab: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [priceUSD, setPriceUSD] = useState('20');
  const [videoLimit, setVideoLimit] = useState('2');
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetPackages();
      if (res.success && Array.isArray(res.data)) setPackages(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setPriceUSD('25');
    setVideoLimit('5');
    setBadge('');
    setDescription('');
    setFeaturesText('Curated USD video campaigns\nAutomatic Video Rewards Wallet credit\n24/7 Live Support');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (pkg: any) => {
    setEditing(pkg);
    setName(pkg.name || '');
    setPriceUSD(((pkg.priceCents || 0) / 100).toString());
    setVideoLimit((pkg.videoLimit || 1).toString());
    setBadge(pkg.badge || '');
    setDescription(pkg.description || '');
    try {
      const arr = JSON.parse(pkg.features || '[]');
      setFeaturesText(Array.isArray(arr) ? arr.join('\n') : '');
    } catch {
      setFeaturesText('');
    }
    setIsActive(Boolean(pkg.isActive));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        priceCents: Math.round(parseFloat(priceUSD) * 100),
        currency: 'USD',
        videoLimit: parseInt(videoLimit, 10) || 1,
        badge: badge.trim() || undefined,
        description: description.trim() || undefined,
        features: featuresText
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
        isActive,
      };
      const res = editing
        ? await api.adminUpdatePackage(editing.id, payload)
        : await api.adminCreatePackage(payload);
      if (res.success) {
        onSuccess(editing ? `Package "${name}" updated.` : `Package "${name}" created.`);
        setModalOpen(false);
        load();
      } else {
        onError(res.error?.message || 'Failed to save package.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pkg: any) => {
    if (!confirm(`Delete or deactivate package "${pkg.name}"?`)) return;
    const res = await api.adminDeletePackage(pkg.id);
    if (res.success) {
      onSuccess(`Package "${pkg.name}" removed/deactivated.`);
      load();
    } else {
      onError(res.error?.message || 'Failed to delete package.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Packages &amp; Access Tiers (USD Only)
          </h2>
          <p className="text-xs text-slate-500">Create, edit, or deactivate USD membership packages and video limits.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add USD Package
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400">Loading packages...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-base">{pkg.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      pkg.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {pkg.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-700">
                  ${((pkg.priceCents || 0) / 100).toFixed(2)} <span className="text-xs font-semibold text-slate-400">USD</span>
                </div>
                <div className="text-xs font-semibold text-slate-600">Video Limit: {pkg.videoLimit} videos</div>
                <p className="text-[11px] text-slate-500 line-clamp-2">{pkg.description}</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => openEdit(pkg)}
                  className="flex-1 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleDelete(pkg)}
                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                  title="Delete / Deactivate"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editing ? `Edit Package: ${editing.name}` : 'Create USD Package'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Package Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={priceUSD}
                  onChange={(e) => setPriceUSD(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Video Limit</label>
                <input
                  type="number"
                  min="1"
                  value={videoLimit}
                  onChange={(e) => setVideoLimit(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Badge (Optional)</label>
                <input
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. Most Popular"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Features (one per line)</label>
              <textarea
                rows={4}
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Package Active &amp; Visible to Users
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Package'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   2. REFERRALS & RANKS CONFIG TAB
   ========================================================================= */
export const AdminReferralsConfigTab: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [config, setConfig] = useState<any>({
    enabled: true,
    firstTransactionOnly: true,
    positionRates: [5, 7, 10, 12, 15],
    milestones: [
      { rankName: 'Bronze', qualifiedCount: 5, rewardUSD: 5 },
      { rankName: 'Gold', qualifiedCount: 15, rewardUSD: 25 },
      { rankName: 'Platinum', qualifiedCount: 30, rewardUSD: 75 },
      { rankName: 'Diamond', qualifiedCount: 50, rewardUSD: 200 },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getReferralConfig().then((res) => {
      if (res.success && res.data) {
        setConfig((prev: any) => ({ ...prev, ...res.data }));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateReferralConfig(config);
      if (res.success) onSuccess('Referral commission rates & rank milestones saved!');
      else onError(res.error?.message || 'Failed to save referral config.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-xs text-slate-400">Loading referral configuration...</div>;

  const rates: number[] = Array.isArray(config.positionRates) ? config.positionRates : [5, 7, 10, 12, 15];
  const milestones: any[] = Array.isArray(config.milestones) ? config.milestones : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Referrals, Position Rates &amp; Rank Milestones
          </h2>
          <p className="text-xs text-slate-500">
            Configure direct referral percentages (first qualifying transaction only) and rank milestone USD rewards.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Referral Rules'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Program Controls &amp; Position Rates (%)</h3>
          <div className="flex flex-wrap gap-6 text-xs">
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.enabled !== false}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              />
              Referral Program Enabled
            </label>
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.firstTransactionOnly !== false}
                onChange={(e) => setConfig({ ...config, firstTransactionOnly: e.target.checked })}
              />
              First Qualifying Transaction Only
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {rates.map((r, idx) => (
              <div key={idx} className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  {idx === rates.length - 1 ? `${idx + 1}th+ (%)` : `Pos #${idx + 1} (%)`}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={r}
                  onChange={(e) => {
                    const next = [...rates];
                    next[idx] = parseFloat(e.target.value) || 0;
                    setConfig({ ...config, positionRates: next });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Rank Milestones &amp; USD Rewards</h3>
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  milestones: [...milestones, { rankName: 'New Rank', qualifiedCount: 10, rewardUSD: 15 }],
                })
              }
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Milestone
            </button>
          </div>
          <div className="space-y-2.5">
            {milestones.map((m, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={m.rankName || ''}
                  onChange={(e) => {
                    const next = [...milestones];
                    next[idx] = { ...next[idx], rankName: e.target.value };
                    setConfig({ ...config, milestones: next });
                  }}
                  placeholder="Rank"
                  className="col-span-4 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold"
                />
                <input
                  type="number"
                  min="1"
                  value={m.qualifiedCount ?? m.minReferrals ?? 5}
                  onChange={(e) => {
                    const next = [...milestones];
                    next[idx] = { ...next[idx], qualifiedCount: parseInt(e.target.value, 10) || 1 };
                    setConfig({ ...config, milestones: next });
                  }}
                  placeholder="Refs"
                  className="col-span-3 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
                />
                <input
                  type="number"
                  min="0"
                  value={m.rewardUSD ?? 0}
                  onChange={(e) => {
                    const next = [...milestones];
                    next[idx] = { ...next[idx], rewardUSD: parseFloat(e.target.value) || 0 };
                    setConfig({ ...config, milestones: next });
                  }}
                  placeholder="$ USD"
                  className="col-span-4 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() =>
                    setConfig({ ...config, milestones: milestones.filter((_, i) => i !== idx) })
                  }
                  className="col-span-1 text-rose-500 hover:text-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. REWARDS & BONUSES CONFIG TAB
   ========================================================================= */
export const AdminBonusesConfigTab: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [settings, setSettings] = useState<any>({
    videoBonus: { enabled: true, defaultRewardCents: 50 },
    dailyBonus: { enabled: true },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);

  useEffect(() => {
    api.getBonusSettings().then((res) => {
      if (res.success && res.data) setSettings((prev: any) => ({ ...prev, ...res.data }));
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateBonusSettings(settings);
      if (res.success) onSuccess('Rewards & bonus rules updated successfully!');
      else onError(res.error?.message || 'Failed to save bonus settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunDaily = async () => {
    setRunningBatch(true);
    try {
      const res = await api.triggerDailyBonusBatch();
      if (res.success) onSuccess(res.message || 'Daily Level Bonus batch executed successfully.');
      else onError(res.error?.message || 'Daily bonus batch failed.');
    } finally {
      setRunningBatch(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-xs text-slate-400">Loading bonus settings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-600" />
            Rewards &amp; Bonuses Engine
          </h2>
          <p className="text-xs text-slate-500">
            Control automatic Video Watch Rewards and Account Level Daily Bonuses.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Bonus Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Video Completion Rewards</h3>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={settings.videoBonus?.enabled !== false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  videoBonus: { ...settings.videoBonus, enabled: e.target.checked },
                })
              }
            />
            Enable Automatic Video Completion Credits (to Video Rewards Wallet)
          </label>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Default Video Reward (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={((settings.videoBonus?.defaultRewardCents ?? 50) / 100).toFixed(2)}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  videoBonus: {
                    ...settings.videoBonus,
                    defaultRewardCents: Math.round((parseFloat(e.target.value) || 0) * 100),
                  },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
            />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Daily Level Bonus Distribution</h3>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={settings.dailyBonus?.enabled !== false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  dailyBonus: { ...settings.dailyBonus, enabled: e.target.checked },
                })
              }
            />
            Enable Daily Account Level Bonus Distribution
          </label>
          <p className="text-xs text-slate-500">
            Manually execute today&apos;s idempotent daily level bonus batch for all eligible active Level 1–5 accounts.
          </p>
          <button
            type="button"
            onClick={handleRunDaily}
            disabled={runningBatch}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            {runningBatch ? 'Processing Daily Batch...' : 'Run Daily Bonus Batch Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. WALLET MANAGEMENT TAB (ADMIN CREDIT / DEBIT 4 CATEGORIES)
   ========================================================================= */
export const AdminWalletAdjustTab: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [walletCategory, setWalletCategory] = useState<
    'USER_AVAILABLE' | 'USER_REFERRAL' | 'USER_VIDEO_REWARDS' | 'USER_OTHER_REWARDS'
  >('USER_AVAILABLE');
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amountUSD, setAmountUSD] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = async () => {
    const res = await api.getAdminUsers({ search });
    if (res.success && res.data?.users) setUsers(res.data.users);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return onError('Please select a user.');
    const amt = Math.round(parseFloat(amountUSD) * 100);
    if (!amt || amt <= 0) return onError('Enter a valid USD amount.');
    if (!reason.trim()) return onError('An audit reason is required.');
    setSubmitting(true);
    try {
      const res = await api.adminAdjustWallet({
        userId,
        walletCategory,
        direction,
        amountCents: amt,
        reason: reason.trim(),
      });
      if (res.success) {
        onSuccess(`Wallet ${direction} of $${(amt / 100).toFixed(2)} USD posted & audited.`);
        setAmountUSD('');
        setReason('');
        loadUsers();
      } else {
        onError(res.error?.message || 'Wallet adjustment failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600" />
          Wallet Management (Audited Double-Entry Adjustments)
        </h2>
        <p className="text-xs text-slate-500">
          Manually credit or debit any member&apos;s USD wallet category with full immutable audit trail logging.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-2xl bg-white border border-slate-200 max-w-2xl space-y-4 shadow-xs"
      >
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter users by name, email, or Member ID..."
            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
          <button
            type="button"
            onClick={loadUsers}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            Find
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Member</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
          >
            <option value="">-- Choose Member --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.email}) {u.memberCode ? `[${u.memberCode}]` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Wallet Category</label>
            <select
              value={walletCategory}
              onChange={(e) => setWalletCategory(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold"
            >
              <option value="USER_AVAILABLE">Main Account Credits</option>
              <option value="USER_VIDEO_REWARDS">Video Rewards</option>
              <option value="USER_REFERRAL">Referral Rewards</option>
              <option value="USER_OTHER_REWARDS">Approved Other Rewards</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Action</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold"
            >
              <option value="CREDIT">CREDIT (+ Add USD)</option>
              <option value="DEBIT">DEBIT (- Deduct USD)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Amount (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amountUSD}
              onChange={(e) => setAmountUSD(e.target.value)}
              required
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Mandatory Audit Reason</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="e.g. Promotional adjustment / Manual correction ticket #104"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
        >
          {submitting ? 'Posting Ledger Entry...' : `Execute ${direction} Adjustment`}
        </button>
      </form>
    </div>
  );
};

/* =========================================================================
   5. REPORTS & IMMUTABLE AUDIT LOGS TAB
   ========================================================================= */
export const AdminReportsAuditTab: React.FC<ExtraTabProps> = () => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [repRes, logRes] = await Promise.all([
        api.getAdminReports(fromDate || undefined, toDate || undefined),
        api.getAuditLogs({ page: 1, pageSize: 60, search: logSearch || undefined }),
      ]);
      if (repRes.success && repRes.data) setReport(repRes.data);
      if (logRes.success && logRes.data) setLogs(logRes.data.logs || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const exportCsv = () => {
    const header = ['Timestamp', 'Actor', 'Action', 'Resource', 'Details'];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toISOString(),
      l.user?.email || 'SYSTEM',
      l.action,
      l.resourceType,
      (l.details || '').replace(/"/g, '""'),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `u-ads-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-emerald-600" />
            Financial Reports &amp; Immutable Audit Logs
          </h2>
          <p className="text-xs text-slate-500">Filter USD summaries by date range, export CSV, or inspect every administrative action.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Search Audit Logs</label>
          <input
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
            placeholder="Action, email, resource..."
            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
          />
        </div>
        <button
          onClick={loadAll}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" /> Apply
        </button>
      </div>

      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Approved Deposits</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              ${((report.approvedDepositsCents ?? 0) / 100).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">{report.approvedDepositsCount ?? 0} transactions</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Settled Withdrawals</div>
            <div className="text-2xl font-black text-rose-700 mt-1">
              ${((report.completedWithdrawalsCents ?? 0) / 100).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">{report.completedWithdrawalsCount ?? 0} payouts</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Video Rewards Paid</div>
            <div className="text-2xl font-black text-teal-700 mt-1">
              ${((report.videoRewardsCents ?? 0) / 100).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">{report.videoCompletionsCount ?? 0} completions</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Referral Commissions</div>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              ${((report.referralCommissionsCents ?? 0) / 100).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">{report.newUsersCount ?? 0} new registrations</div>
          </div>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Recent Immutable Audit Logs ({logs.length})</span>
          <button onClick={loadAll} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No audit entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Resource</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {l.user ? `${l.user.fullName} (${l.user.role})` : 'SYSTEM'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{l.resourceType}</td>
                    <td className="py-2.5 px-4 text-[11px] font-mono text-slate-500 max-w-md truncate">
                      {l.details || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================================
   6. LANDING CMS & NOTIFICATION SETTINGS PANEL (used inside Settings Tab)
   ========================================================================= */
export const AdminCmsAndNotificationsPanel: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [cms, setCms] = useState<any>({});
  const [notif, setNotif] = useState<any>({
    depositApproved: true,
    depositRejected: true,
    withdrawalApproved: true,
    withdrawalRejected: true,
    referralCommission: true,
    videoReward: true,
    systemAlert: true,
  });
  const [savingCms, setSavingCms] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    api.adminGetLandingContent().then((r) => {
      if (r.success && r.data) setCms(r.data);
    });
    api.getNotificationSettings().then((r) => {
      if (r.success && r.data) setNotif((p: any) => ({ ...p, ...r.data }));
    });
  }, []);

  const saveCms = async () => {
    setSavingCms(true);
    try {
      const res = await api.adminUpdateLandingContent(cms);
      if (res.success) onSuccess('Public Landing Page content updated!');
      else onError(res.error?.message || 'Failed to update landing content.');
    } finally {
      setSavingCms(false);
    }
  };

  const saveNotif = async () => {
    setSavingNotif(true);
    try {
      const res = await api.updateNotificationSettings(notif);
      if (res.success) onSuccess('Notification event settings updated!');
      else onError(res.error?.message || 'Failed to update notification settings.');
    } finally {
      setSavingNotif(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
      {/* Landing CMS */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            Landing Page CMS Content
          </h3>
          <button
            type="button"
            onClick={saveCms}
            disabled={savingCms}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
          >
            {savingCms ? 'Saving...' : 'Save Landing CMS'}
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Hero Headline</label>
            <input
              value={cms.heroTitle || ''}
              onChange={(e) => setCms({ ...cms, heroTitle: e.target.value })}
              placeholder="Watch Curated Video Campaigns & Earn Verified USD Rewards."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Hero Subtitle</label>
            <textarea
              rows={2}
              value={cms.heroSubtitle || ''}
              onChange={(e) => setCms({ ...cms, heroSubtitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
              <input
                value={cms.contactEmail || ''}
                onChange={(e) => setCms({ ...cms, contactEmail: e.target.value })}
                placeholder="support@u-ads.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                value={cms.contactPhone || ''}
                onChange={(e) => setCms({ ...cms, contactPhone: e.target.value })}
                placeholder="+1 (800) 555-0199"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Announcement Banner</label>
            <input
              value={cms.announcementBanner || ''}
              onChange={(e) => setCms({ ...cms, announcementBanner: e.target.value })}
              placeholder="Optional announcement displayed at top of homepage"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
            />
            <label className="flex items-center gap-2 mt-1.5 font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(cms.announcementEnabled)}
                onChange={(e) => setCms({ ...cms, announcementEnabled: e.target.checked })}
              />
              Show Announcement Banner on Landing Page
            </label>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            In-App Notification Triggers
          </h3>
          <button
            type="button"
            onClick={saveNotif}
            disabled={savingNotif}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
          >
            {savingNotif ? 'Saving...' : 'Save Triggers'}
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          {[
            ['depositApproved', 'Notify user when Deposit is Approved'],
            ['depositRejected', 'Notify user when Deposit is Rejected'],
            ['withdrawalApproved', 'Notify user on Withdrawal Status Updates'],
            ['withdrawalRejected', 'Notify user when Withdrawal is Rejected / Failed'],
            ['videoReward', 'Notify user on Automatic Video Reward Credit'],
            ['referralCommission', 'Notify referrer on Commission / Milestone Earned'],
            ['systemAlert', 'Notify user on Account Level & Admin Wallet Adjustments'],
          ].map(([key, label]) => (
            <label
              key={key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer"
            >
              <span className="font-semibold text-slate-700">{label}</span>
              <input
                type="checkbox"
                checked={notif[key] !== false}
                onChange={(e) => setNotif({ ...notif, [key]: e.target.checked })}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   7. SUPPORT AGENTS MANAGEMENT PANEL (Max 10 Agents)
   ========================================================================= */
export const AdminSupportAgentsPanel: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [agents, setAgents] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const res = await api.getSupportAgents();
    if (res.success && Array.isArray(res.data)) setAgents(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.createSupportAgent({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      if (res.success) {
        onSuccess(`Support Agent "${fullName}" created.`);
        setFullName('');
        setEmail('');
        setPassword('');
        load();
      } else {
        onError(res.error?.message || 'Failed to create agent.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (agent: any) => {
    if (!confirm(`Remove Support Agent "${agent.fullName}"?`)) return;
    const res = await api.deleteSupportAgent(agent.id);
    if (res.success) {
      onSuccess(`Support Agent "${agent.fullName}" removed.`);
      load();
    } else {
      onError(res.error?.message || 'Failed to remove agent.');
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Headphones className="w-4 h-4 text-purple-600" />
          Support Agents Roster ({agents.length} / 10 Max)
        </h3>
        <span className="text-[11px] font-semibold text-emerald-700">
          {agents.filter((a) => a.agentAvailability === 'ONLINE').length} Online
        </span>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Agent Full Name"
          required
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="agent@u-ads.com"
          required
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 chars)"
          minLength={8}
          required
          className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
        />
        <button
          type="submit"
          disabled={creating || agents.length >= 10}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-200 text-white text-xs font-bold cursor-pointer"
        >
          {creating ? 'Adding...' : '+ Add Agent'}
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {agents.map((a) => (
          <div
            key={a.id}
            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
          >
            <div className="min-w-0">
              <div className="font-bold text-slate-900 truncate">{a.fullName}</div>
              <div className="text-[10px] text-slate-500 truncate">{a.email}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  a.agentAvailability === 'ONLINE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : a.agentAvailability === 'BUSY'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {a.agentAvailability || 'OFFLINE'}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(a)}
                className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                title="Remove Agent"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
