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
  X,
  ArrowUpRight,
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
  const [lockedVideoModal, setLockedVideoModal] = useState<Video | null>(null);

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
      console.error('Failed to fetch videos:', err);
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
      {/* Search & Wrapping Category Filters (never clips or overflows!) */}
      <div className="card-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Available Campaigns ({videos.length})
            </h2>
            <p className="text-xs text-slate-500">
              Watch unlocked campaigns to completion for automatic USD Video Rewards.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto md:min-w-[300px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-[10px] pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500"
              />
            </div>
            <button type="submit" className="btn-secondary">
              Search
            </button>
          </form>
        </div>

        {/* Clean Wrapping Category Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Directly Assigned Campaigns */}
      {videos.some((v) => v.isAssignedToUser) && (
        <div className="card-white p-5 border-emerald-200 bg-emerald-50/40 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Assigned Directly to You</h3>
              <p className="text-xs text-slate-600">
                Special campaigns unlocked specifically for your account.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {videos
              .filter((v) => v.isAssignedToUser)
              .map((assignedVid) => (
                <div
                  key={assignedVid.id}
                  className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs"
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
                  <button
                    type="button"
                    onClick={() => navigate('player', { videoId: assignedVid.id })}
                    className="btn-primary !h-9 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Video Grid */}
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
          <h3 className="text-sm font-bold text-slate-900">No campaigns match your filter</h3>
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
            const isUnlocked = video.hasAccess;

            return (
              <div
                key={video.id}
                className="group card-white card-hover overflow-hidden flex flex-col justify-between"
              >
                {/* Poster / Thumbnail */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isUnlocked ? 'group-hover:scale-105 opacity-95' : 'opacity-50 scale-[1.01]'
                    }`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-white/95 text-slate-900 shadow-xs">
                      {video.isAssignedToUser ? 'Assigned' : `${video.minPackageTier} Plan`}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-950/80 text-white flex items-center gap-1 tabular-nums">
                      <Clock className="w-3 h-3" />
                      {formatDurationMMSS(video.durationSeconds)}
                    </span>
                  </div>

                  {/* Center Overlay */}
                  {isUnlocked ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => navigate('player', { videoId: video.id })}
                        className="w-12 h-12 rounded-full bg-emerald-600/95 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-105 cursor-pointer"
                        aria-label={`Play ${video.title}`}
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLockedVideoModal(video)}
                      className="absolute inset-0 bg-slate-950/70 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-4 text-center space-y-2 cursor-pointer w-full"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 text-white flex items-center justify-center">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white">
                          Locked · {video.minPackageTier} Plan
                        </div>
                        <div className="text-[11px] text-slate-200">
                          Click to see how to unlock this video
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Completed Pill */}
                  {video.isWatched && (
                    <div className="absolute bottom-2.5 left-3 text-[11px] font-bold text-white flex items-center gap-1 bg-emerald-600 px-2.5 py-0.5 rounded-md shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Completed
                    </div>
                  )}

                  {/* Reward Pill */}
                  {video.rewardEligible && (
                    <div className="absolute bottom-2.5 right-3 text-[11px] font-bold text-white bg-slate-900/90 border border-white/15 px-2.5 py-0.5 rounded-md tabular-nums">
                      {video.rewardPercentageBps && video.rewardPercentageBps > 0
                        ? `${(video.rewardPercentageBps / 100).toFixed(2)}%`
                        : `+${formatUSD(video.rewardAmountCents)}`}
                    </div>
                  )}
                </div>

                {/* Details + Unified Action Button */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-emerald-700">{video.category}</div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{video.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  </div>

                  {isUnlocked ? (
                    <button
                      type="button"
                      onClick={() => navigate('player', { videoId: video.id })}
                      className="btn-primary w-full"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{video.isWatched ? 'Watch Again' : 'Watch Campaign'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLockedVideoModal(video)}
                      className="btn-secondary w-full"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Unlock ({video.minPackageTier})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LOCKED VIDEO — INCREASE YOUR ACCOUNT LEVEL MODAL */}
      {lockedVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setLockedVideoModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Increase Your Account Level
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    This video is beyond your current account level video limit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLockedVideoModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="font-bold text-slate-900">{lockedVideoModal.title}</div>
              <div className="text-slate-500">
                Required Tier: <strong className="text-slate-800">{lockedVideoModal.minPackageTier} Plan</strong>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                Upgrade your plan or increase your account level to unlock more daily campaign videos and higher rewards.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLockedVideoModal(null)}
                className="btn-secondary flex-1"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setLockedVideoModal(null);
                  navigate('packages');
                }}
                className="btn-primary flex-1"
              >
                <span>Upgrade Plan</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
