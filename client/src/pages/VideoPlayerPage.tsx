import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Video } from '../types/index.js';
import {
  ArrowLeft,
  Play,
  Pause,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

import { extractYouTubeId, getYouTubeEmbedUrl } from '../utils/youtube.js';

interface VideoPlayerProps {
  videoId: string;
  navigate: (route: string) => void;
}

export const VideoPlayerPage: React.FC<VideoPlayerProps> = ({ videoId, navigate }) => {
  const { user, refreshWallet } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Fetch Video Metadata
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await api.getVideo(videoId);
        if (res.success && res.data) {
          setVideo(res.data);
          setHasClaimed(res.data.hasClaimedReward || false);
        } else {
          setErrorMsg(res.error?.message || 'Failed to load masterclass.');
        }
      } catch (err: any) {
        setErrorMsg('Network error loading video.');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [videoId]);

  // 2. Start Secure Telemetry Session
  useEffect(() => {
    if (!video || !user) return;

    const initSession = async () => {
      try {
        const res = await api.startVideoSession(videoId);
        if (res.success && res.data) {
          setSessionToken(res.data.sessionToken);
          // For YouTube videos, mark as active so telemetry starts running
          if (extractYouTubeId(video.videoUrl)) {
            setIsPlaying(true);
          }
        } else {
          setErrorMsg(res.error?.message || 'Access restricted. Please upgrade tier.');
        }
      } catch (err: any) {
        setErrorMsg('Unable to initialize playback session.');
      }
    };
    initSession();
  }, [video, user]);

  // 3. Periodic Session Heartbeat & Progress Tracking
  useEffect(() => {
    if (!sessionToken || !isPlaying) return;

    const interval = setInterval(() => {
      setWatchSeconds((prev) => {
        const nextSec = prev + 1;

        // Dispatch heartbeat every 10 seconds
        if (nextSec % 10 === 0) {
          api
            .sendVideoHeartbeat(videoId, sessionToken, nextSec)
            .then((res) => {
              if (res.success && res.data?.completed) {
                setIsCompleted(true);
              }
            })
            .catch((err) => console.error('Heartbeat error:', err));
        }

        // Auto-complete locally if watched >= 80% or 60s
        if (video && (nextSec >= video.durationSeconds * 0.8 || nextSec >= 60)) {
          setIsCompleted(true);
        }

        return nextSec;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionToken, isPlaying, videoId, video]);

  // Claim Engagement Reward
  const handleClaimReward = async () => {
    if (!sessionToken) return;
    setClaiming(true);
    setErrorMsg(null);
    try {
      const res = await api.claimVideoReward(videoId, sessionToken);
      if (res.success) {
        setHasClaimed(true);
        setClaimSuccessMsg('Reward successfully verified and credited to your available balance!');
        await refreshWallet();
      } else {
        setErrorMsg(res.error?.message || 'Failed to claim reward.');
      }
    } catch (err: any) {
      setErrorMsg('Error processing reward claim.');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Authenticating playback session...</p>
      </div>
    );
  }

  if (errorMsg && !video) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xs">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-600">{errorMsg}</p>
        <button
          onClick={() => navigate('packages')}
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
        >
          View Eligible Packages
        </button>
      </div>
    );
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(video?.videoUrl);
  const isAssigned = video?.isAssignedToUser || (user && video?.assignedUserId === user.id);

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <button
          onClick={() => navigate('videos')}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {isAssigned && (
            <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Assigned Directly to You by Admin
            </span>
          )}
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
            Session: {sessionToken ? sessionToken.slice(0, 10) + '...' : 'Connecting...'}
          </span>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Telemetry Guard Active
          </span>
        </div>
      </div>

      {/* Embedded Player Card */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl relative">
        <div className="relative aspect-video bg-black">
          {youtubeEmbedUrl ? (
            <iframe
              src={youtubeEmbedUrl}
              title={video?.title || 'YouTube Video Player'}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={video?.videoUrl}
              poster={video?.thumbnailUrl}
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Telemetry Status Strip */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Watched: {watchSeconds}s</span>
              <span className="text-slate-500">/ {video?.durationSeconds}s</span>
            </div>
            {isCompleted && (
              <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Session Engagement Verified
              </span>
            )}
            {youtubeEmbedUrl && !isPlaying && (
              <button
                onClick={() => setIsPlaying(true)}
                className="text-[10px] font-semibold text-emerald-400 underline"
              >
                Start Telemetry Tracking
              </button>
            )}
          </div>

          {/* Reward Claim Button */}
          {video?.rewardEligible && (
            <div>
              {hasClaimed ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  Completion Reward Claimed (${(video.rewardAmountCents / 100).toFixed(2)})
                </div>
              ) : isCompleted ? (
                <button
                  onClick={handleClaimReward}
                  disabled={claiming}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Award className="w-4 h-4" />
                  {claiming ? 'Verifying Claim...' : `Claim $${(video.rewardAmountCents / 100).toFixed(2)} Reward`}
                </button>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Stream 80% to qualify for ${(video.rewardAmountCents / 100).toFixed(2)} reward
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Claim notifications */}
      {claimSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{claimSuccessMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Video Details & Curriculum */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            {video?.category}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {video?.minPackageTier} Tier
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">{video?.title}</h1>
        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">{video?.description}</p>
      </div>
    </div>
  );
};
