import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import { Video } from '../types/index.js';
import {
  Play,
  Lock,
  Search,
  Clock,
  CheckCircle,
  Filter,
  Sparkles,
  Layers,
} from 'lucide-react';

interface VideoCatalogProps {
  navigate: (route: string, state?: any) => void;
}

export const VideoCatalogPage: React.FC<VideoCatalogProps> = ({ navigate }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    'All',
    'AI & Systems Architecture',
    'Quantitative Finance & Ledgering',
    'Full-Stack Software Engineering',
    'Venture Creation & Scaling',
    'Cybersecurity & Cryptography',
    'Executive Leadership & Strategy',
  ];

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getVideos(params);
      if (res.success && res.data) {
        setVideos(res.data);
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
  };

  return (
    <div className="space-y-8">
      {/* Search & Category Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
            Curated Catalog
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">
            60 Masterclasses & Workshops
          </h2>
          <p className="text-slate-500 text-xs max-w-xl">
            Stream high-yield architectural masterclasses. Content tier access is authenticated against your active package limit.
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search masterclasses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Specially Assigned Videos Section */}
      {videos.some((v) => v.isAssignedToUser) && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-teal-500/10 border border-amber-500/30 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-sm">
              <Sparkles className="w-4 h-4 fill-white" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Exclusive Videos Assigned Directly to You
              </h3>
              <p className="text-[11px] text-slate-600">
                The platform administrator has granted you custom access to the following video modules.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videos
              .filter((v) => v.isAssignedToUser)
              .map((assignedVid) => (
                <div
                  key={assignedVid.id}
                  className="p-3.5 rounded-2xl bg-white/95 border border-amber-300 shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={assignedVid.thumbnailUrl}
                      alt={assignedVid.title}
                      className="w-20 h-14 rounded-xl object-cover shrink-0 bg-slate-900"
                    />
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                        Admin Assigned
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                        {assignedVid.title}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {formatDuration(assignedVid.durationSeconds)} • {assignedVid.category}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('player', { videoId: assignedVid.id })}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Now
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-72 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
          <Layers className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Masterclasses Found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search criteria or category filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => {
            const isUnlocked = video.hasAccess;

            return (
              <div
                key={video.id}
                className={`group rounded-2xl bg-white overflow-hidden shadow-xs card-hover flex flex-col justify-between border ${
                  video.isAssignedToUser ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200/90'
                }`}
              >
                {/* Thumbnail & Badges */}
                <div className="relative aspect-video bg-slate-900 overflow-hidden">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    {video.isAssignedToUser ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-sm flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-white" />
                        Assigned to You
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/95 text-slate-900 shadow-sm">
                        {video.minPackageTier} Tier
                      </span>
                    )}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/60 text-white flex items-center gap-1 backdrop-blur-md">
                      <Clock className="w-3 h-3" />
                      {formatDuration(video.durationSeconds)}
                    </span>
                  </div>

                  {/* Center Action Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isUnlocked ? (
                      <button
                        onClick={() => navigate('player', { videoId: video.id })}
                        className="w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-white/90 text-slate-500 flex items-center justify-center shadow-md">
                        <Lock className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Completion Status */}
                  {video.isWatched && (
                    <div className="absolute bottom-2.5 right-3 text-[10px] font-bold text-emerald-300 flex items-center gap-1 bg-slate-900/90 px-2 py-0.5 rounded border border-emerald-500/40">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      Watched
                    </div>
                  )}
                </div>

                {/* Video Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                      {video.category}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {video.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    {isUnlocked ? (
                      <button
                        onClick={() => navigate('player', { videoId: video.id })}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        Launch Player
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('packages')}
                        className="text-xs font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3 text-amber-500" />
                        Upgrade Tier
                      </button>
                    )}

                    {video.rewardEligible && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        +${(video.rewardAmountCents / 100).toFixed(2)} Reward
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
