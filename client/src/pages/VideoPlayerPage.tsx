import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { Video } from '../types/index.js';
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
} from 'lucide-react';
import { getYouTubeEmbedUrl } from '../utils/youtube.js';

interface VideoPlayerProps {
  videoId: string;
  navigate: (route: string) => void;
}

export const VideoPlayerPage: React.FC<VideoPlayerProps> = ({ videoId, navigate }) => {
  const { user, refreshWallet } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Full actual video duration (auto-detected from metadata; falls back to backend durationSeconds)
  const targetDuration = Math.max(1, actualDuration || video?.durationSeconds || 30);
  const progressPct = Math.min(100, Math.round((watchSeconds / targetDuration) * 100));

  // 1. Fetch Video Metadata
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await api.getVideo(videoId);
        if (res.success && res.data) {
          setVideo(res.data);
          setHasClaimed(res.data.hasClaimedReward || false);
        } else {
          setErrorMsg(res.error?.message || 'Failed to load video.');
        }
      } catch {
        setErrorMsg('Network error loading video.');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [videoId]);

  // 2. Start Secure Telemetry Session
  useEffect(() => {
    if (!video || !user || !video.hasAccess) return;

    const initSession = async () => {
      try {
        const res = await api.startVideoSession(videoId);
        if (res.success && res.data) {
          setSessionToken(res.data.sessionToken);
          setIsPlaying(true);
        } else {
          setErrorMsg(res.error?.message || 'Access restricted. Please upgrade tier.');
        }
      } catch {
        setErrorMsg('Unable to initialize playback session.');
      }
    };
    initSession();
  }, [video, user, videoId]);

  // Disable pause/seek keyboard shortcuts while player is mounted
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

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Attempt autoplay for HTML5 video; fallback to muted autoplay or click-to-play overlay
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video || !video.hasAccess) return;
    el.muted = isMuted;
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Browser blocked unmuted autoplay -> try muted autoplay so video runs seamlessly
        el.muted = true;
        setIsMuted(true);
        el.play().catch(() => {
          setNeedsUserStart(true);
          setIsPlaying(false);
        });
      });
    }
  }, [video]);

  // Auto-Credit Engagement Reward (NO manual claim button)
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
        setClaimSuccessMsg(
          `Video Completed! $${((video?.rewardAmountCents ?? 0) / 100).toFixed(
            2
          )} USD has been automatically credited to your Video Rewards Wallet.`
        );
        await refreshWallet();
      } else {
        const errCode = res.error?.code || '';
        const errMessage = res.error?.message || '';
        if (errCode === 'ALREADY_CLAIMED' || errMessage.toLowerCase().includes('already claimed')) {
          setHasClaimed(true);
          setClaimSuccessMsg('Reward has already been credited to your Video Rewards Wallet for this video.');
        } else {
          setErrorMsg(errMessage || 'Automatic reward verification pending.');
        }
      }
    } catch {
      setErrorMsg('Network issue verifying reward. Please refresh your wallet.');
    } finally {
      setClaiming(false);
    }
  };

  // 3. Periodic Session Heartbeat & Anti-Skip Watch Progress
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
              if (res.success && res.data?.completed) {
                setIsCompleted(true);
              }
            })
            .catch(() => {});
        }

        if (nextSec >= targetDuration) {
          setIsCompleted(true);
        }
        return nextSec;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionToken, isPlaying, videoId, isCompleted, targetDuration, actualDuration]);

  // 4. Trigger automatic credit the instant full watch completes
  useEffect(() => {
    if (isCompleted && !hasClaimed && !claimLockRef.current && sessionToken && video?.rewardEligible) {
      triggerAutomaticReward(Math.max(watchSeconds, targetDuration));
    }
  }, [isCompleted, hasClaimed, sessionToken, video]);

  // Sound toggle (ONLY allowed playback control besides Fullscreen)
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: nextMuted ? 'mute' : 'unMute', args: '' }),
        '*'
      );
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
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
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Authenticating U-Ads playback session...</p>
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

  if (video && !video.hasAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6 bg-white p-8 rounded-3xl border border-rose-200 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-rose-600" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Video Campaign Locked</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            This video requires an active U-Ads package or qualifying USD Account Level. Deposit USD or select a package to unlock full access.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('packages')}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all cursor-pointer"
          >
            View Packages
          </button>
          <button
            onClick={() => navigate('videos')}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  const baseYtUrl = getYouTubeEmbedUrl(video?.videoUrl);
  const restrictedYtUrl = baseYtUrl
    ? `${baseYtUrl}${baseYtUrl.includes('?') ? '&' : '?'}autoplay=1&controls=0&disablekb=1&rel=0&modestbranding=1&fs=0&enablejsapi=1`
    : null;
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
          Back to Video Catalog
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {isAssigned && (
            <span className="text-[11px] font-bold px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Assigned Directly to You
            </span>
          )}
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Anti-Skip Full-Duration Verification Active
          </span>
        </div>
      </div>

      {/* Controlled Embedded Player (NO pause / NO seek / ONLY Sound + Fullscreen) */}
      <div
        ref={playerContainerRef}
        className="rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-xl relative select-none"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="relative aspect-video bg-black">
          {restrictedYtUrl ? (
            <>
              <iframe
                ref={iframeRef}
                src={restrictedYtUrl}
                title={video?.title || 'U-Ads Video Player'}
                className="w-full h-full border-0 pointer-events-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
              {/* Interaction guard overlay prevents pausing or scrubbing inside YouTube iframe */}
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
              onLoadedMetadata={(e) => {
                const dur = Math.round(e.currentTarget.duration);
                if (dur > 0 && Number.isFinite(dur)) {
                  setActualDuration(dur);
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setNeedsUserStart(false);
              }}
              onPause={(e) => {
                // Strictly prevent user pausing while video is still playing
                if (!e.currentTarget.ended && !isCompleted) {
                  e.currentTarget.play().catch(() => {});
                }
              }}
              onRateChange={(e) => {
                if (e.currentTarget.playbackRate !== 1) {
                  e.currentTarget.playbackRate = 1;
                }
              }}
              onSeeking={() => {
                if (videoRef.current && videoRef.current.currentTime > maxWatchedRef.current + 1) {
                  videoRef.current.currentTime = maxWatchedRef.current;
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                setIsCompleted(true);
                triggerAutomaticReward(Math.max(watchSeconds, targetDuration));
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full object-contain pointer-events-none"
            />
          )}

          {/* Browser Autoplay Fallback Overlay (only if browser blocks autoplay) */}
          {needsUserStart && (
            <div className="absolute inset-0 z-20 bg-slate-950/75 flex flex-col items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleManualStartIfBlocked}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Verified Playback
              </button>
              <span className="text-[11px] text-slate-300">
                Video plays continuously without pause or skip until completion
              </span>
            </div>
          )}
        </div>

        {/* Non-interactive Read-only Progress Bar */}
        <div className="w-full h-1.5 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Custom Restricted Controls Bar: ONLY Sound On/Off & Fullscreen + Auto-Credit Status */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-white">
          <div className="flex items-center gap-3">
            {/* Sound On/Off */}
            <button
              type="button"
              onClick={toggleMute}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{isMuted ? 'Sound Off' : 'Sound On'}</span>
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-400" /> : <Maximize2 className="w-4 h-4 text-emerald-400" />}
              <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
            </button>

            <div className="flex items-center gap-1.5 font-medium text-slate-300 pl-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="font-mono">
                {Math.min(watchSeconds, targetDuration)}s / {targetDuration}s ({progressPct}%)
              </span>
            </div>
          </div>

          {/* Automatic Reward Status (No manual claim button) */}
          {video?.rewardEligible && (
            <div>
              {hasClaimed ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  Auto-Credited to Video Rewards Wallet (${(video.rewardAmountCents / 100).toFixed(2)} USD)
                </div>
              ) : isCompleted ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30 animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  {claiming ? 'Verifying & Auto-Crediting Reward...' : 'Completing Automatic Credit...'}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Watch 100% ({targetDuration}s) for automatic ${(video.rewardAmountCents / 100).toFixed(2)} USD credit
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Automatic Credit Notification */}
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

      {/* Video Details */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            {video?.category}
          </span>
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            {video?.minPackageTier} Tier
          </span>
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            Duration: {targetDuration}s (Auto-Detected)
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">{video?.title}</h1>
        <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">{video?.description}</p>
      </div>
    </div>
  );
};
