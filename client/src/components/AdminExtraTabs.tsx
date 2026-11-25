import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
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
  Power,
  CheckCircle2,
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
                  title="Deactivate / Delete"
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
   2. REFERRALS & RANKS CONFIG TAB (Unified with Documented §7-§8 Schema — F3)
   ========================================================================= */
const DEFAULT_DOC_REFERRAL_CFG = {
  minQualifyingUSD: 20,
  commissionRates: {
    pos1: 5,
    pos2: 7,
    pos3: 10,
    pos4: 12,
    pos5: 15,
    range6to10: 15,
    range11to100: 15,
    range101to500: 15,
    range501Plus: 15,
  },
  ranks: [
    { key: 'NEW', name: 'New', minQualified: 0, maxQualified: 0, milestoneAt: 0, milestoneRewardUSD: 0 },
    { key: 'GOLD', name: 'Gold', minQualified: 1, maxQualified: 5, milestoneAt: 5, milestoneRewardUSD: 20 },
    { key: 'PLATINUM', name: 'Platinum', minQualified: 6, maxQualified: 10, milestoneAt: 10, milestoneRewardUSD: 100 },
    { key: 'DIAMOND', name: 'Diamond', minQualified: 11, maxQualified: 100, milestoneAt: 100, milestoneRewardUSD: 500 },
    { key: 'RANK_4', name: 'Rank 4', minQualified: 101, maxQualified: 500, milestoneAt: 500, milestoneRewardUSD: 1000 },
    { key: 'RANK_5', name: 'Rank 5', minQualified: 501, maxQualified: 10000, milestoneAt: 1000, milestoneRewardUSD: 2500 },
  ],
};

export const AdminReferralsConfigTab: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [config, setConfig] = useState<any>(DEFAULT_DOC_REFERRAL_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getReferralConfig().then((res) => {
      if (res.success && res.data) {
        setConfig({
          ...DEFAULT_DOC_REFERRAL_CFG,
          ...res.data,
          commissionRates: {
            ...DEFAULT_DOC_REFERRAL_CFG.commissionRates,
            ...(res.data.commissionRates || {}),
          },
          ranks:
            Array.isArray(res.data.ranks) && res.data.ranks.length > 0
              ? res.data.ranks
              : DEFAULT_DOC_REFERRAL_CFG.ranks,
        });
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateReferralConfig(config);
      if (res.success) onSuccess('Referral commission rates & documented rank milestones saved!');
      else onError(res.error?.message || 'Failed to save referral config.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-xs text-slate-400">Loading referral configuration...</div>;

  const rates = config.commissionRates || DEFAULT_DOC_REFERRAL_CFG.commissionRates;
  const ranks: any[] = Array.isArray(config.ranks) ? config.ranks : DEFAULT_DOC_REFERRAL_CFG.ranks;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Referrals, Position Rates &amp; Rank Milestones (Unified §7–§8)
          </h2>
          <p className="text-xs text-slate-500">
            Single source of truth driving both Admin rules and Member Portal Ranks/Milestones (First Qualifying Transaction Only).
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Position Rates */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Commission Rates (First Transaction Only)</h3>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Minimum Qualifying Transaction (USD)
            </label>
            <input
              type="number"
              min="1"
              value={config.minQualifyingUSD ?? 20}
              onChange={(e) => setConfig({ ...config, minQualifyingUSD: parseFloat(e.target.value) || 20 })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              ['pos1', '1st Referral (%)'],
              ['pos2', '2nd Referral (%)'],
              ['pos3', '3rd Referral (%)'],
              ['pos4', '4th Referral (%)'],
              ['pos5', '5th Referral (%)'],
              ['range6to10', '6–10 Referrals (%)'],
              ['range11to100', '11–100 Referrals (%)'],
              ['range101to500', '101–500 (%)'],
              ['range501Plus', '501+ Referrals (%)'],
            ].map(([key, label]) => (
              <div key={key} className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500">{label}</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={rates[key] ?? 15}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      commissionRates: { ...rates, [key]: parseFloat(e.target.value) || 0 },
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Documented Rank Ranges & Milestones */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">
            Documented Referral Ranks &amp; One-Time Milestone Rewards
          </h3>
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-400 px-1">
            <span className="col-span-3">Rank Name</span>
            <span className="col-span-2">Min Qual.</span>
            <span className="col-span-2">Max Qual.</span>
            <span className="col-span-2">Milestone @</span>
            <span className="col-span-3">Bonus ($ USD)</span>
          </div>
          <div className="space-y-2">
            {ranks.map((rk, idx) => (
              <div key={rk.key || idx} className="grid grid-cols-12 gap-2 items-center">
                <input
                  value={rk.name}
                  onChange={(e) => {
                    const next = [...ranks];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setConfig({ ...config, ranks: next });
                  }}
                  className="col-span-3 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold"
                />
                <input
                  type="number"
                  min="0"
                  value={rk.minQualified}
                  onChange={(e) => {
                    const next = [...ranks];
                    next[idx] = { ...next[idx], minQualified: parseInt(e.target.value, 10) || 0 };
                    setConfig({ ...config, ranks: next });
                  }}
                  className="col-span-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
                />
                <input
                  type="number"
                  min="0"
                  value={rk.maxQualified}
                  onChange={(e) => {
                    const next = [...ranks];
                    next[idx] = { ...next[idx], maxQualified: parseInt(e.target.value, 10) || 0 };
                    setConfig({ ...config, ranks: next });
                  }}
                  className="col-span-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
                />
                <input
                  type="number"
                  min="0"
                  value={rk.milestoneAt}
                  onChange={(e) => {
                    const next = [...ranks];
                    next[idx] = { ...next[idx], milestoneAt: parseInt(e.target.value, 10) || 0 };
                    setConfig({ ...config, ranks: next });
                  }}
                  className="col-span-2 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
                />
                <input
                  type="number"
                  min="0"
                  value={rk.milestoneRewardUSD}
                  onChange={(e) => {
                    const next = [...ranks];
                    next[idx] = { ...next[idx], milestoneRewardUSD: parseFloat(e.target.value) || 0 };
                    setConfig({ ...config, ranks: next });
                  }}
                  className="col-span-3 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono font-bold text-emerald-800"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. REWARDS & BONUSES CONFIG TAB (3 Separate Categories + Batch Breakdown — F11)
   ========================================================================= */
export const AdminBonusesConfigTab: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [settings, setSettings] = useState<any>({
    accountLevelBonus: {
      enabled: true,
      rewardPoolUSD: 50000,
      creditTimeUTC: '15:00 UTC (8:00 PM PKT)',
      schedule: 'Daily Batch',
      eligibility: 'Active unlocked accounts at Level 1 or higher',
    },
    videoBonus: {
      enabled: true,
      defaultRewardCents: 50,
      rewardPoolUSD: 25000,
      levelWeightL1: 100,
      levelWeightL2: 120,
      levelWeightL3: 150,
      levelWeightL4: 180,
      levelWeightL5: 200,
    },
    referralBonus: {
      enabled: true,
      rewardPoolUSD: 50000,
      eligibility: 'First qualifying USD transaction only',
    },
  });
  const [batchHistory, setBatchHistory] = useState<{ batches: any[]; recentPayouts: any[] }>({
    batches: [],
    recentPayouts: [],
  });
  const [lastRunPayouts, setLastRunPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, bRes] = await Promise.all([api.getBonusSettings(), api.getDailyBonusBatches()]);
      if (sRes.success && sRes.data) {
        setSettings((prev: any) => ({
          accountLevelBonus: { ...prev.accountLevelBonus, ...(sRes.data.accountLevelBonus || {}) },
          videoBonus: { ...prev.videoBonus, ...(sRes.data.videoBonus || {}) },
          referralBonus: { ...prev.referralBonus, ...(sRes.data.referralBonus || {}) },
        }));
      }
      if (bRes.success && bRes.data) {
        setBatchHistory(bRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateBonusSettings(settings);
      if (res.success) onSuccess('All 3 Bonus Categories (Level, Video, Referral) saved!');
      else onError(res.error?.message || 'Failed to save bonus settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunDaily = async () => {
    setRunningBatch(true);
    try {
      const res = await api.triggerDailyBonusBatch();
      if (res.success) {
        const d = res.data || {};
        if (Array.isArray(d.payouts)) setLastRunPayouts(d.payouts);
        onSuccess(
          d.message ||
            `Daily Level Bonus batch completed: ${d.totalUsersPaid ?? 0} users credited ($${d.totalAmountUSD ?? '0.00'} USD).`
        );
        loadAll();
      } else {
        onError(res.error?.message || 'Daily bonus batch failed.');
      }
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
            Rewards &amp; Bonuses Engine (3 Configurable Categories)
          </h2>
          <p className="text-xs text-slate-500">
            Separately configure Account/Level Daily Bonuses, Video Completion Rewards &amp; Pool Weights, and Referral Bonus Rules.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save All Bonus Rules'}
        </button>
      </div>

      {/* 3 Separate Bonus Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category 1: Account Level Daily Bonus */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 text-xs">
          <h3 className="text-sm font-bold text-slate-900">1. Account Level Daily Bonus</h3>
          <label className="flex items-center gap-2 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={settings.accountLevelBonus?.enabled !== false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  accountLevelBonus: { ...settings.accountLevelBonus, enabled: e.target.checked },
                })
              }
            />
            Enable Daily Level Bonus
          </label>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Daily Credit Time (Editable)</label>
            <input
              value={settings.accountLevelBonus?.creditTimeUTC || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  accountLevelBonus: { ...settings.accountLevelBonus, creditTimeUTC: e.target.value },
                })
              }
              placeholder="e.g. 15:00 UTC (8:00 PM PKT)"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Approved Level Bonus Pool (USD)</label>
            <input
              type="number"
              value={settings.accountLevelBonus?.rewardPoolUSD ?? 50000}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  accountLevelBonus: {
                    ...settings.accountLevelBonus,
                    rewardPoolUSD: parseFloat(e.target.value) || 0,
                  },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
            />
          </div>
          <button
            type="button"
            onClick={handleRunDaily}
            disabled={runningBatch}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
          >
            {runningBatch ? 'Processing Daily Batch...' : 'Run Daily Bonus Batch Now'}
          </button>
        </div>

        {/* Category 2: Video Completion Rewards & Pool */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 text-xs">
          <h3 className="text-sm font-bold text-slate-900">2. Video Completion Rewards</h3>
          <label className="flex items-center gap-2 font-semibold text-slate-700">
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
            Auto-Credit on 100% Playback
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Default Reward ($)</label>
              <input
                type="number"
                step="0.01"
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
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-600 mb-1">Video Pool ($ USD)</label>
              <input
                type="number"
                value={settings.videoBonus?.rewardPoolUSD ?? 25000}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    videoBonus: { ...settings.videoBonus, rewardPoolUSD: parseFloat(e.target.value) || 0 },
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Level Distribution Weights (%)</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['levelWeightL1', 'levelWeightL2', 'levelWeightL3', 'levelWeightL4', 'levelWeightL5'] as const).map(
                (wk, i) => (
                  <div key={wk} className="text-center">
                    <span className="text-[9px] font-bold text-slate-400">L{i + 1}</span>
                    <input
                      type="number"
                      value={settings.videoBonus?.[wk] ?? 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          videoBonus: { ...settings.videoBonus, [wk]: parseInt(e.target.value, 10) || 100 },
                        })
                      }
                      className="w-full px-1.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-center font-mono text-[11px]"
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Category 3: Referral Bonus Policy */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5 text-xs">
          <h3 className="text-sm font-bold text-slate-900">3. Referral Commission &amp; Milestones</h3>
          <label className="flex items-center gap-2 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={settings.referralBonus?.enabled !== false}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  referralBonus: { ...settings.referralBonus, enabled: e.target.checked },
                })
              }
            />
            Enable Referral Commissions &amp; Milestones
          </label>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Referral Bonus Pool ($ USD)</label>
            <input
              type="number"
              value={settings.referralBonus?.rewardPoolUSD ?? 50000}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  referralBonus: { ...settings.referralBonus, rewardPoolUSD: parseFloat(e.target.value) || 0 },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Eligibility Policy</label>
            <input
              value={settings.referralBonus?.eligibility || 'First qualifying USD transaction only'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  referralBonus: { ...settings.referralBonus, eligibility: e.target.value },
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Per-User Daily Bonus Payout Breakdown */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">
            Per-User Daily Bonus Payout Breakdown ({(lastRunPayouts.length || batchHistory.recentPayouts.length)} records)
          </span>
          <span className="text-[11px] text-slate-500">
            Total Batches Run: {batchHistory.batches.length}
          </span>
        </div>
        {lastRunPayouts.length === 0 && batchHistory.recentPayouts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No daily bonus payouts executed yet. Click &ldquo;Run Daily Bonus Batch Now&rdquo; to distribute eligible level bonuses.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Member</th>
                  <th className="py-2.5 px-4">Reference / Description</th>
                  <th className="py-2.5 px-4 text-right">Credited USD</th>
                  <th className="py-2.5 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(lastRunPayouts.length > 0 ? lastRunPayouts : batchHistory.recentPayouts).map((p: any, i: number) => (
                  <tr key={p.id || p.reference || i}>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {p.fullName || p.user?.fullName || 'Member'}{' '}
                      <span className="text-[10px] font-normal text-slate-400">
                        ({p.email || p.user?.email || ''})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                      {p.description || `${p.accountLevel || ''} • ${p.reference}`}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                      +${p.bonusUSD || p.amountUSD} USD
                    </td>
                    <td className="py-2.5 px-4 text-right text-[10px] text-slate-400">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : 'Just now'}
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
   5. REPORTS, RECONCILIATION, BONUS HISTORY & AUDIT LOGS TAB (F10)
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

  const totals = report?.totals || {};
  const recon = report?.reconciliation || null;
  const bonusHistory: any[] = report?.bonusHistory || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-emerald-600" />
            Financial Reports, Payment Reconciliation &amp; Audit Logs
          </h2>
          <p className="text-xs text-slate-500">Live USD totals, payment reconciliation, per-user bonus ledger, and immutable audit logs.</p>
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

      {/* Summary Cards (Fixed: reads report.totals.* accurately even without date filter!) */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Approved Deposits</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              ${Number(totals.approvedDepositsUSD ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">{totals.approvedDepositsCount ?? 0} verified deposits</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Settled Withdrawals</div>
            <div className="text-2xl font-black text-rose-700 mt-1">
              ${Number(totals.completedWithdrawalsUSD ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">{totals.completedWithdrawalsCount ?? 0} settled payouts</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Video Rewards Paid</div>
            <div className="text-2xl font-black text-teal-700 mt-1">
              ${Number(totals.videoRewardsPaidUSD ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">{totals.videoRewardsCount ?? 0} verified claims</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-slate-200">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Referral Commissions</div>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              ${Number(totals.referralCommissionsUSD ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">
              {totals.referralCommissionsCount ?? 0} events • Package Rev: ${Number(totals.packageRevenueUSD ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Payment & Ledger Reconciliation Report */}
      {recon && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Payment &amp; Wallet Liability Reconciliation</h3>
            </div>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                recon.ledgerBalanced
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {recon.ledgerBalanced ? '✓ DOUBLE-ENTRY 100% BALANCED' : `⚠ ${recon.anomaliesCount} ANOMALIES`}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold">Net Cash Flow</div>
              <div className="font-mono font-black text-slate-900 mt-0.5">${Number(recon.netCashFlowUSD).toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold">Total User Liability</div>
              <div className="font-mono font-black text-indigo-700 mt-0.5">${Number(recon.totalUserLiabilityUSD).toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold">Main Wallets</div>
              <div className="font-mono font-bold text-slate-800 mt-0.5">${Number(recon.mainWalletsUSD).toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold">Video Wallets</div>
              <div className="font-mono font-bold text-teal-700 mt-0.5">${Number(recon.videoRewardsWalletsUSD).toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold">Referral Wallets</div>
              <div className="font-mono font-bold text-indigo-700 mt-0.5">${Number(recon.referralWalletsUSD).toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] text-slate-400 font-bold">Reserved Holds</div>
              <div className="font-mono font-bold text-amber-700 mt-0.5">${Number(recon.reservedHoldsUSD).toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Per-User Bonus History Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-900">
            Per-User Bonus &amp; Reward History ({bonusHistory.length} recent records)
          </span>
        </div>
        {bonusHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">No bonus records in selected range.</div>
        ) : (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Member</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Description</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bonusHistory.slice(0, 40).map((b: any, i: number) => (
                  <tr key={b.id || i} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-bold text-slate-900">
                      {b.userName} <span className="text-[10px] font-normal text-slate-400">({b.userEmail})</span>
                    </td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                        {b.category}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-slate-600">{b.description}</td>
                    <td className="py-2 px-4 text-right font-mono font-bold text-emerald-700">
                      +${Number(b.amountUSD).toFixed(2)} USD
                    </td>
                    <td className="py-2 px-4 text-right text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900">Recent Immutable Audit Logs ({logs.length})</span>
          <button onClick={loadAll} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer">
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
   6. FULL LANDING CMS & NOTIFICATION SETTINGS PANEL (F14)
   ========================================================================= */
export const AdminCmsAndNotificationsPanel: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [cms, setCms] = useState<any>({});
  const [notif, setNotif] = useState<any>({
    depositApproved: true,
    depositRejected: true,
    withdrawalLifecycle: true,
    videoCompleted: true,
    rewardCredited: true,
    referralQualified: true,
    rankMilestone: true,
    supportReplies: true,
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
      if (res.success) onSuccess('Full Public Landing Page CMS content updated!');
      else onError(res.error?.message || 'Failed to update landing content.');
    } finally {
      setSavingCms(false);
    }
  };

  const saveNotif = async () => {
    setSavingNotif(true);
    try {
      const res = await api.updateNotificationSettings(notif);
      if (res.success) onSuccess('Notification event triggers updated!');
      else onError(res.error?.message || 'Failed to update notification settings.');
    } finally {
      setSavingNotif(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
      {/* Full Landing CMS */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            Full Landing Page CMS Editor
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

        <div className="space-y-2.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Top Hero Badge</label>
            <input
              value={cms.badgeText || ''}
              onChange={(e) => setCms({ ...cms, badgeText: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hero Title</label>
              <input
                value={cms.heroTitle || ''}
                onChange={(e) => setCms({ ...cms, heroTitle: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Hero Highlight Phrase</label>
              <input
                value={cms.heroHighlight || ''}
                onChange={(e) => setCms({ ...cms, heroHighlight: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Hero Subtitle</label>
            <textarea
              rows={2}
              value={cms.heroSubtitle || ''}
              onChange={(e) => setCms({ ...cms, heroSubtitle: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Video Preview Heading</label>
              <input
                value={cms.videoPreviewHeading || ''}
                onChange={(e) => setCms({ ...cms, videoPreviewHeading: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Rewards Section Heading</label>
              <input
                value={cms.rewardsHeading || ''}
                onChange={(e) => setCms({ ...cms, rewardsHeading: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Packages Section Heading</label>
              <input
                value={cms.packagesTitle || ''}
                onChange={(e) => setCms({ ...cms, packagesTitle: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Section Heading</label>
              <input
                value={cms.contactHeading || ''}
                onChange={(e) => setCms({ ...cms, contactHeading: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Email</label>
              <input
                value={cms.contactEmail || ''}
                onChange={(e) => setCms({ ...cms, contactEmail: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
              <input
                value={cms.contactPhone || ''}
                onChange={(e) => setCms({ ...cms, contactPhone: e.target.value })}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Support Hours / Turnaround</label>
            <input
              value={cms.contactHours || ''}
              onChange={(e) => setCms({ ...cms, contactHours: e.target.value })}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Announcement Banner</label>
            <input
              value={cms.announcementBanner || ''}
              onChange={(e) => setCms({ ...cms, announcementBanner: e.target.value })}
              placeholder="Optional announcement displayed at top of homepage"
              className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200"
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
            ['depositRejected', 'Notify user when Deposit is Rejected (includes reason)'],
            ['withdrawalLifecycle', 'Notify user on Withdrawal Status Updates & Rejection'],
            ['videoCompleted', 'Notify user on Video Completion'],
            ['rewardCredited', 'Notify user on Automatic Video & Wallet Reward Credits'],
            ['referralQualified', 'Notify referrer when Referral Qualifies'],
            ['rankMilestone', 'Notify user when Rank Milestone Bonus Unlocks'],
            ['supportReplies', 'Notify user on Support Agent Replies'],
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
   7. SUPPORT AGENTS MANAGEMENT PANEL (Inline Remove, Activate/Deactivate, Performance — F5)
   ========================================================================= */
export const AdminSupportAgentsPanel: React.FC<ExtraTabProps> = ({ onSuccess, onError }) => {
  const [agents, setAgents] = useState<any[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);

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

  const handleToggleStatus = async (agent: any) => {
    const nextStatus = agent.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setBusyAgentId(agent.id);
    try {
      const res = await api.toggleSupportAgentStatus(agent.id, nextStatus);
      if (res.success) {
        onSuccess(`Support Agent "${agent.fullName}" ${nextStatus === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
        load();
      } else {
        onError(res.error?.message || 'Failed to update agent status.');
      }
    } finally {
      setBusyAgentId(null);
    }
  };

  const handleRemoveConfirmed = async (agent: any) => {
    setBusyAgentId(agent.id);
    try {
      const res = await api.deleteSupportAgent(agent.id);
      if (res.success) {
        onSuccess(`Support Agent "${agent.fullName}" removed from Support Roster.`);
        setConfirmRemoveId(null);
        load();
      } else {
        onError(res.error?.message || 'Failed to remove agent.');
      }
    } finally {
      setBusyAgentId(null);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Headphones className="w-4 h-4 text-purple-600" />
          Support Agents Roster &amp; Performance ({agents.length} / 10 Max)
        </h3>
        <span className="text-[11px] font-semibold text-emerald-700">
          {agents.filter((a) => a.status === 'ACTIVE' && a.agentAvailability === 'ONLINE').length} Online •{' '}
          {agents.filter((a) => a.status === 'ACTIVE').length} Active
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((a) => {
          const perf = a.performance || { totalAssigned: 0, activeTickets: 0, resolvedTickets: 0, totalReplies: 0 };
          const isActive = a.status === 'ACTIVE';
          return (
            <div
              key={a.id}
              className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">{a.fullName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{a.email}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      !isActive
                        ? 'bg-rose-100 text-rose-700'
                        : a.agentAvailability === 'ONLINE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : a.agentAvailability === 'BUSY'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {!isActive ? 'INACTIVE' : a.agentAvailability || 'OFFLINE'}
                  </span>
                </div>
              </div>

              {/* Agent Performance Strip */}
              <div className="grid grid-cols-4 gap-1 text-center bg-white rounded-lg p-1.5 border border-slate-200 text-[10px]">
                <div>
                  <div className="font-black text-slate-800">{perf.totalAssigned}</div>
                  <div className="text-slate-400">Assigned</div>
                </div>
                <div>
                  <div className="font-black text-amber-600">{perf.activeTickets}</div>
                  <div className="text-slate-400">Active</div>
                </div>
                <div>
                  <div className="font-black text-emerald-600">{perf.resolvedTickets}</div>
                  <div className="text-slate-400">Resolved</div>
                </div>
                <div>
                  <div className="font-black text-indigo-600">{perf.totalReplies}</div>
                  <div className="text-slate-400">Replies</div>
                </div>
              </div>

              {/* Actions: Activate/Deactivate + Reliable Inline Confirm Remove */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  disabled={busyAgentId === a.id}
                  onClick={() => handleToggleStatus(a)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer border ${
                    isActive
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  {isActive ? 'Deactivate' : 'Activate'}
                </button>

                {confirmRemoveId === a.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busyAgentId === a.id}
                      onClick={() => handleRemoveConfirmed(a)}
                      className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busyAgentId === a.id}
                    onClick={() => setConfirmRemoveId(a.id)}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
