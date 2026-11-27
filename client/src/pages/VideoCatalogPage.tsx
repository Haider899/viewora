import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api.js';
import { Video } from '../types/index.js';
import { formatDurationMMSS, formatUSD } from '../utils/formatters.js';
import {
  Play,
  Lock,
  Search,
  Clock,
  CheckCircle2,
  Sparkles,
  PlaySquare,
} from 'lucide-react';

interface VideoCatalogProps {
  navigate: (route: string, state?: any) => void;
}

export const VideoCatalogPage: React.FC<VideoCatalogProps> = ({ navigate }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>(['All']);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getVideos(params);
      if (res.success && Array.isArray(res.data)) {
        setVideos(res.data);
        if (selectedCategory === 'All' && !searchQuery.trim()) {
          const cats = Array.from(
            new Set(res.data.map((v: Video) => v.category).filter(Boolean))
          ) as string[];
          setAllCategories(['All', ...cats]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch ads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVideos();
  };

  const categories = useMemo(
    () => (allCategories.length > 1 ? allCategories : ['All']),
    [allCategories]
  );

  return (
    <div className="space-y-6">
      {/* Search & Wrapping Category Filters */}
      <div className="card-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Available Ads ({videos.length})
            </h2>
            <p className="text-xs text-slate-500">
              Watch unlocked ads to earn 1 reward per ad per 24-hour cycle (8:00 PM – 7:59:59 PM). Unclaimed rewards expire at 7:59:59 PM.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto md:min-w-[300px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-[10px] pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-orange-500"
              />
            </div>
            <button type="submit" className="btn-secondary">
              Search
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-orange-50 hover:text-orange-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Directly Assigned Ads */}
      {videos.some((v) => v.isAssignedToUser) && (
        <div className="card-white p-5 border-orange-200 bg-orange-50/40 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assigned Directly to You</h3>
              <p className="text-xs text-slate-600">
                Special ads unlocked specifically for your account.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {videos
              .filter((v) => v.isAssignedToUser)
              .map((assignedVid) => {
                const claimed = Boolean(assignedVid.hasClaimedReward);
                return (
                  <div
                    key={assignedVid.id}
                    className="p-3.5 rounded-xl bg-white border border-orange-200 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={assignedVid.thumbnailUrl}
                        alt={assignedVid.title}
                        className="w-20 h-13 rounded-lg object-cover shrink-0 bg-slate-900"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{assignedVid.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          {formatDurationMMSS(assignedVid.durationSeconds)} · {formatUSD(assignedVid.rewardAmountCents)} reward
                        </p>
                      </div>
                    </div>
                    {claimed ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 h-9 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold shrink-0 cursor-not-allowed"
                      >
                        Claimed
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('player', { videoId: assignedVid.id })}
                        className="btn-primary !h-9 shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Watch Ads</span>
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* All Ads Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 rounded-2xl skeleton-shimmer border border-slate-200" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="card-white py-16 px-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <PlaySquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No ads match your filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try switching back to All categories or clearing your search query.
          </p>
          {(selectedCategory !== 'All' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="btn-secondary"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((video) => {
            const isUnlocked = Boolean(video.hasAccess);
            const isClaimedThisCycle = Boolean(video.hasClaimedReward);

            if (!isUnlocked) {
              // Rule 6 & Rule 9: Whole locked card is DARK GREY & DIMMED, names unlocking package/level, clicks DIRECTLY to buy that package!
              return (
                <div
                  key={video.id}
                  onClick={() => navigate('packages', { autoSelectTier: video.minPackageTier })}
                  className="rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex flex-col justify-between opacity-85 hover:opacity-100 transition-all cursor-pointer"
                >
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover grayscale opacity-35"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-white/95 text-slate-900 shadow-xs">
                        {video.minPackageTier} Plan · {(video.minAccountLevel || 'LEVEL_1').replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-950/85 text-white flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3" />
                        {formatDurationMMSS(video.durationSeconds)}
                      </span>
                    </div>

                    <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-700/90 border border-slate-500 text-slate-200 flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-extrabold text-white">
                          Locked — Requires {video.minPackageTier} Plan
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Click to upgrade to {video.minPackageTier} &amp; earn {formatUSD(video.rewardAmountCents)}/ad
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-4 bg-slate-800 text-slate-200">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-400">{video.category}</div>
                      <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{video.title}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('packages', { autoSelectTier: video.minPackageTier });
                      }}
                      className="w-full h-10 rounded-xl bg-slate-700 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Upgrade to {video.minPackageTier} Plan</span>
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={video.id}
                className="group card-white card-hover overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isClaimedThisCycle ? 'opacity-65 grayscale-[40%]' : 'group-hover:scale-105 opacity-95'
                    }`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-white/95 text-slate-900 shadow-xs">
                      {(video.minAccountLevel || 'LEVEL_1').replace('_', ' ')} · {video.isAssignedToUser ? 'Assigned' : `${video.minPackageTier} Plan`}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-950/80 text-white flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />
                      {formatDurationMMSS(video.durationSeconds)}
                    </span>
                  </div>

                  {!isClaimedThisCycle && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => navigate('player', { videoId: video.id })}
                        className="w-12 h-12 rounded-full bg-orange-600/95 hover:bg-orange-500 text-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-105 cursor-pointer"
                        aria-label={`Watch Ads: ${video.title}`}
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>
                  )}

                  {isClaimedThisCycle && (
                    <div className="absolute bottom-2.5 left-3 text-[11px] font-bold text-white flex items-center gap-1 bg-emerald-600 px-2.5 py-0.5 rounded-md shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Claimed Today
                    </div>
                  )}

                  {video.rewardEligible && (
                    <div className="absolute bottom-2.5 right-3 text-[11px] font-extrabold text-white bg-orange-600 px-2.5 py-0.5 rounded-md tabular-nums shadow-xs">
                      +{formatUSD(video.rewardAmountCents)}
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-orange-600">{video.category}</div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{video.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  </div>

                  {isClaimedThisCycle ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-10 rounded-xl bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Claimed (Resets at 8:00 PM)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate('player', { videoId: video.id })}
                      className="btn-primary w-full"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Ads</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
