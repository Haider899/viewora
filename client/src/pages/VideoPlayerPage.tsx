import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Video } from '../types/index.js';
import { useToast } from '../components/ToastProvider.js';
import { formatDurationMMSS, formatUSD } from '../utils/formatters.js';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Lock,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Play,
  Wallet,
} from 'lucide-react';
import { getYouTubeEmbedUrl } from '../utils/youtube.js';

interface VideoPlayerProps {
  videoId: string;
  navigate: (route: string) => void;
}

export const VideoPlayerPage: React.FC<VideoPlayerProps> = ({ videoId, navigate }) => {
  const { user, wallet, refreshWallet } = useAuth();
  const { showToast } = useToast();

  const [video, setVideo] = useState<Video | null>(null);
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoBuffering, setVideoBuffering] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsUserStart, setNeedsUserStart] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const claimLockRef = useRef(false);
  const maxWatchedRef = useRef(0);
  const startedSessionForRef = useRef<string | null>(null);
  const autoPlayedVideoRef = useRef<string | null>(null);

  const targetDuration = Math.max(1, actualDuration || video?.durationSeconds || 30);
  const progressPct = Math.min(100, Math.round((watchSeconds / targetDuration) * 100));

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await api.getVideo(videoId);
        if (res.success && res.data) {
          setVideo(res.data);
          setHasClaimed(res.data.hasClaimedReward || false);
        } else {
          setErrorMsg(res.error?.message || 'Unable to load this video campaign.');
        }
      } catch {
        setErrorMsg('Network error loading video campaign.');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [videoId]);

  // Start playback session ONCE per video mount (never reset by background refreshUser() polling!)
  useEffect(() => {
    if (!video?.id || !user?.id || !video.hasAccess) return;
    if (startedSessionForRef.current === video.id) return;
    startedSessionForRef.current = video.id;

    const initSession = async () => {
      try {
        const res = await api.startVideoSession(video.id);
        if (res.success && res.data) {
          setSessionToken(res.data.sessionToken);
          setIsPlaying(true);
        } else {
          startedSessionForRef.current = null;
          setErrorMsg(res.error?.message || 'Access restricted. Upgrade your plan to watch.');
        }
      } catch {
        startedSessionForRef.current = null;
        setErrorMsg('Unable to start verified playback session.');
      }
    };
    initSession();
  }, [video?.id, user?.id, video?.hasAccess]);

  // Block pause/seek shortcuts during verified playback
  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      const blocked = [' ', 'k', 'K', 'ArrowLeft', 'ArrowRight', 'j', 'J', 'l', 'L', 'MediaPlayPause'];
      if (blocked.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockKeys, true);
    return () => window.removeEventListener('keydown', blockKeys, true);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video?.id || !video.hasAccess) return;
    if (autoPlayedVideoRef.current === video.id) return;
    autoPlayedVideoRef.current = video.id;
    el.muted = isMuted;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        el.muted = true;
        setIsMuted(true);
        el.play().catch(() => {
          setNeedsUserStart(true);
          setVideoBuffering(false);
          setIsPlaying(false);
        });
      });
    }
  }, [video?.id, video?.hasAccess]);

  const triggerAutomaticReward = async (finalSec?: number) => {
    if (claimLockRef.current || !sessionToken || hasClaimed || claiming) return;
    claimLockRef.current = true;
    setClaiming(true);
    setErrorMsg(null);
    try {
      const secToReport = Math.max(finalSec ?? watchSeconds, targetDuration);
      await api
        .sendVideoHeartbeat(videoId, sessionToken, secToReport, actualDuration ?? undefined)
        .catch(() => {});

      const res = await api.claimVideoReward(videoId, sessionToken);
      if (res.success) {
        setHasClaimed(true);
        const rewardFormatted = formatUSD(video?.rewardAmountCents ?? 0);
        setClaimSuccessMsg(
          `${rewardFormatted} has been automatically credited to your Video Rewards wallet.`
        );
        await refreshWallet();
        showToast(`+${rewardFormatted} credited to Video Rewards!`, 'success');
      } else {
        const errCode = res.error?.code || '';
        const errMessage = res.error?.message || '';
        if (errCode === 'ALREADY_CLAIMED' || errMessage.toLowerCase().includes('already claimed')) {
          setHasClaimed(true);
          setClaimSuccessMsg('Reward was already credited once for this campaign.');
        } else {
          setErrorMsg(errMessage || 'Reward verification is still processing.');
        }
      }
    } catch {
      setErrorMsg('Network issue verifying reward. Please refresh your wallet.');
    } finally {
      setClaiming(false);
    }
  };

  useEffect(() => {
    if (!sessionToken || !isPlaying || isCompleted) return;
    const interval = setInterval(() => {
      setWatchSeconds((prev) => {
        const nextSec = prev + 1;
        maxWatchedRef.current = Math.max(maxWatchedRef.current, nextSec);
        if (nextSec % 5 === 0) {
          api
            .sendVideoHeartbeat(videoId, sessionToken, nextSec, actualDuration ?? undefined)
            .then((res) => {
              if (res.success && res.data?.completed) setIsCompleted(true);
            })
            .catch(() => {});
        }
        if (nextSec >= targetDuration) setIsCompleted(true);
        return nextSec;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionToken, isPlaying, videoId, isCompleted, targetDuration, actualDuration]);

  useEffect(() => {
    if (isCompleted && !hasClaimed && !claimLockRef.current && sessionToken && video?.rewardEligible) {
      triggerAutomaticReward(Math.max(watchSeconds, targetDuration));
    }
  }, [isCompleted, hasClaimed, sessionToken, video]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) videoRef.current.muted = nextMuted;
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: nextMuted ? 'mute' : 'unMute', args: '' }),
        '*'
      );
    }
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) container.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  };

  const handleManualStartIfBlocked = () => {
    setNeedsUserStart(false);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.play().catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-44 rounded-xl skeleton-shimmer" />
        <div className="aspect-video w-full rounded-2xl skeleton-shimmer" />
      </div>
    );
  }

  if ((errorMsg && !video) || (video && !video.hasAccess)) {
    return (
      <div className="max-w-xl mx-auto card-white p-8 text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-slate-900">
            {video ? `Requires ${video.minPackageTier} Plan` : 'Campaign Unavailable'}
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {errorMsg || 'Upgrade to an eligible USD plan to watch this campaign and earn automatic rewards.'}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => navigate('videos')} className="btn-secondary">
            Back to Videos
          </button>
          <button type="button" onClick={() => navigate('packages')} className="btn-primary">
            View Packages
          </button>
        </div>
      </div>
    );
  }

  const baseYtUrl = getYouTubeEmbedUrl(video?.videoUrl);
  const restrictedYtUrl = baseYtUrl
    ? `${baseYtUrl}${baseYtUrl.includes('?') ? '&' : '?'}autoplay=1&controls=0&disablekb=1&rel=0&modestbranding=1&fs=0&enablejsapi=1`
    : null;

  const rewardFormatted = formatUSD(video?.rewardAmountCents ?? 0);
  const videoWalletFormatted = formatUSD(wallet?.USD?.videoRewardsCents ?? 0);

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('videos')}
          className="btn-secondary !h-9"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Videos</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          Verified full-watch playback
        </span>
      </div>

      {/* Main Split: Player + Dedicated Reward Status Panel (eliminates empty space below) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Player Container */}
        <div className="lg:col-span-8 space-y-4">
          <div
            ref={playerContainerRef}
            className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-lg relative select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="relative aspect-video bg-slate-950">
              {/* Poster & Shimmer while loading (never a dead black box!) */}
              {videoBuffering && !restrictedYtUrl && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900">
                  {video?.thumbnailUrl && (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-2.5 bg-slate-950/75 px-5 py-3.5 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold text-white">Preparing campaign stream…</span>
                  </div>
                </div>
              )}

              {restrictedYtUrl ? (
                <>
                  <iframe
                    ref={iframeRef}
                    src={restrictedYtUrl}
                    title={video?.title || 'U-Ads Video Player'}
                    className="w-full h-full border-0 pointer-events-none"
                    onLoad={() => setVideoBuffering(false)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  <div className="absolute inset-0 z-10 bg-transparent cursor-not-allowed" />
                </>
              ) : (
                <video
                  ref={videoRef}
                  src={video?.videoUrl}
                  poster={video?.thumbnailUrl}
                  autoPlay
                  playsInline
                  disablePictureInPicture
                  controlsList="nodownload noplaybackrate nofullscreen"
                  onLoadedData={() => setVideoBuffering(false)}
                  onCanPlay={() => setVideoBuffering(false)}
                  onLoadedMetadata={(e) => {
                    const dur = Math.floor(e.currentTarget.duration);
                    if (dur > 0 && Number.isFinite(dur)) setActualDuration(dur);
                  }}
                  onTimeUpdate={(e) => {
                    const current = Math.floor(e.currentTarget.currentTime);
                    const dur = Math.floor(e.currentTarget.duration || targetDuration);
                    if (current > maxWatchedRef.current) {
                      maxWatchedRef.current = current;
                      setWatchSeconds(current);
                    }
                    if (dur > 0 && e.currentTarget.currentTime >= e.currentTarget.duration - 0.35 && !isCompleted) {
                      setWatchSeconds(targetDuration);
                      setIsCompleted(true);
                    }
                  }}
                  onPlay={() => {
                    setIsPlaying(true);
                    setNeedsUserStart(false);
                    setVideoBuffering(false);
                  }}
                  onPause={(e) => {
                    if (!e.currentTarget.ended && !isCompleted) {
                      e.currentTarget.play().catch(() => {});
                    }
                  }}
                  onRateChange={(e) => {
                    if (e.currentTarget.playbackRate !== 1) e.currentTarget.playbackRate = 1;
                  }}
                  onSeeking={() => {
                    if (videoRef.current && videoRef.current.currentTime > maxWatchedRef.current + 1) {
                      videoRef.current.currentTime = maxWatchedRef.current;
                    }
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    setWatchSeconds(targetDuration);
                    maxWatchedRef.current = targetDuration;
                    setIsCompleted(true);
                    if (!hasClaimed) {
                      triggerAutomaticReward(targetDuration);
                    } else {
                      setClaimSuccessMsg('Replay complete. Reward was already credited once for this campaign.');
                    }
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}

              {/* Center Play Overlay when browser blocks autoplay */}
              {needsUserStart && (
                <div className="absolute inset-0 z-20 bg-slate-950/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-4 text-center">
                  <button
                    type="button"
                    onClick={handleManualStartIfBlocked}
                    className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl transition-transform hover:scale-105 cursor-pointer"
                    aria-label="Start campaign playback"
                  >
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  </button>
                  <div className="text-sm font-bold text-white">Click to start verified playback</div>
                  <div className="text-xs text-slate-300">
                    Plays continuously to the end for automatic reward credit
                  </div>
                </div>
              )}
            </div>

            {/* Clear Visible Progress Bar */}
            <div className="px-4 pt-3 pb-2 bg-slate-900 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 tabular-nums">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {formatDurationMMSS(Math.min(watchSeconds, targetDuration))} / {formatDurationMMSS(targetDuration)}
                </span>
                <span>{progressPct}% watched</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Controls Bar (Sound + Fullscreen) */}
            <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 text-xs text-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Seeking is locked during verification
              </span>
            </div>
          </div>

          {/* Campaign Details */}
          <div className="card-white p-5 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {video?.category}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {video?.minPackageTier} Plan
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 tabular-nums">
                Duration: {formatDurationMMSS(targetDuration)}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">{video?.title}</h2>
            <p className="text-xs text-slate-600 leading-relaxed">{video?.description}</p>
          </div>
        </div>

        {/* Dedicated Reward Panel (Flips cleanly to Success State with New Balance) */}
        <div className="lg:col-span-4 space-y-4">
          <div
            className={`card-white p-5 space-y-4 transition-all duration-300 ${
              hasClaimed || claimSuccessMsg
                ? 'border-emerald-300 bg-emerald-50/40'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  hasClaimed || claimSuccessMsg
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}
              >
                {hasClaimed || claimSuccessMsg ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  {hasClaimed || claimSuccessMsg ? 'Reward Credited' : 'Campaign Reward'}
                </div>
                <div className="text-xl font-extrabold text-slate-900 tabular-nums">
                  +{rewardFormatted} USD
                </div>
              </div>
            </div>

            {hasClaimed || claimSuccessMsg ? (
              <div className="space-y-3">
                <p className="text-xs text-emerald-900 leading-relaxed">
                  {claimSuccessMsg || 'This campaign reward has been credited to your Video Rewards wallet.'}
                </p>
                <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                    Video Rewards Balance
                  </span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {videoWalletFormatted}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('videos')}
                  className="btn-primary w-full"
                >
                  Watch Another Campaign
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Watch to the end — <strong className="text-slate-900">{rewardFormatted}</strong> is credited automatically to your Video Rewards wallet as soon as playback finishes.
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">
                      {claiming ? 'Verifying completion…' : 'Verification progress'}
                    </span>
                    <span className="text-emerald-700 tabular-nums">{progressPct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
