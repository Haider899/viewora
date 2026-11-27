import { execFile } from 'child_process';
import { promisify } from 'util';
import { extractYouTubeId } from './youtube.js';

const execFileAsync = promisify(execFile);

/**
 * Reads an MP4 container's `mvhd` atom duration in pure JS from a buffer.
 */
function parseMp4MvhdDuration(buf: Buffer): number | null {
  const mvhdIdx = buf.indexOf(Buffer.from('mvhd', 'ascii'));
  if (mvhdIdx === -1 || mvhdIdx + 28 > buf.length) return null;

  const version = buf[mvhdIdx + 4];
  if (version === 0) {
    if (mvhdIdx + 24 > buf.length) return null;
    const timescale = buf.readUInt32BE(mvhdIdx + 16);
    const duration = buf.readUInt32BE(mvhdIdx + 20);
    if (timescale > 0 && duration > 0) {
      return Math.round(duration / timescale);
    }
  } else if (version === 1) {
    if (mvhdIdx + 36 > buf.length) return null;
    const timescale = buf.readUInt32BE(mvhdIdx + 24);
    const durHigh = buf.readUInt32BE(mvhdIdx + 28);
    const durLow = buf.readUInt32BE(mvhdIdx + 32);
    const duration = durHigh * 0x100000000 + durLow;
    if (timescale > 0 && duration > 0) {
      return Math.round(duration / timescale);
    }
  }
  return null;
}

/**
 * Reads WebM/MKV EBML Segment Info Duration (ID 0x4489) + TimecodeScale (default 1,000,000 ns = 1 ms).
 */
function parseWebmDuration(buf: Buffer): number | null {
  // Look for EBML Duration element: 0x44 0x89 followed by size byte 0x84 (4-byte float) or 0x88 (8-byte double)
  for (let i = 0; i < buf.length - 12; i++) {
    if (buf[i] === 0x44 && buf[i + 1] === 0x89) {
      const sizeByte = buf[i + 2];
      let durationMs = 0;
      if (sizeByte === 0x84) {
        durationMs = buf.readFloatBE(i + 3);
      } else if (sizeByte === 0x88) {
        durationMs = buf.readDoubleBE(i + 3);
      }
      if (Number.isFinite(durationMs) && durationMs > 1000) {
        const secs = Math.round(durationMs / 1000);
        if (secs >= 2 && secs <= 14400) return secs;
      }
    }
  }
  return null;
}

/**
 * Optional ffprobe fallback when installed on the server (Linux Lightsail / Docker).
 */
async function probeViaFfprobe(videoUrl: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoUrl,
      ],
      { timeout: 7000 }
    );
    const val = parseFloat(stdout.trim());
    if (Number.isFinite(val) && val >= 2 && val <= 14400) {
      return Math.round(val);
    }
  } catch {
    // ffprobe not installed or remote rejected — fall through to pure-JS parsers
  }
  return null;
}

/**
 * Probes the real duration (in integer seconds) of a video URL (MP4, WebM, YouTube, or ffprobe-supported stream).
 * Returns null if duration cannot be genuinely verified from the source.
 */
export async function probeVideoDurationSeconds(videoUrl: string): Promise<number | null> {
  if (!videoUrl || typeof videoUrl !== 'string') return null;
  const trimmed = videoUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    // 1. YouTube URL: read lengthSeconds from watch page HTML
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      const resp = await fetch(`https://www.youtube.com/watch?v=${ytId}`, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (resp.ok) {
        const html = await resp.text();
        const lenMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
        if (lenMatch) {
          const sec = parseInt(lenMatch[1], 10);
          if (sec >= 2 && sec <= 14400) return sec;
        }
        const isoMatch = html.match(/itemprop="duration"\s+content="PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/);
        if (isoMatch) {
          const total =
            parseInt(isoMatch[1] || '0', 10) * 3600 +
            parseInt(isoMatch[2] || '0', 10) * 60 +
            parseInt(isoMatch[3] || '0', 10);
          if (total >= 2 && total <= 14400) return total;
        }
      }
      return null;
    }

    // 2. Direct media URL: read first 1 MB via Range request (catches fast-start MP4 & WebM)
    const headChunk = await fetch(trimmed, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Range: 'bytes=0-1048575',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    if (headChunk.ok || headChunk.status === 206) {
      const buf = Buffer.from(await headChunk.arrayBuffer());
      const mp4Head = parseMp4MvhdDuration(buf);
      if (mp4Head && mp4Head >= 2 && mp4Head <= 14400) return mp4Head;

      const webmHead = parseWebmDuration(buf);
      if (webmHead && webmHead >= 2 && webmHead <= 14400) return webmHead;

      // 3. If moov atom is at the tail of the MP4, fetch last 1 MB using Content-Range total size
      const contentRange = headChunk.headers.get('content-range');
      const totalMatch = contentRange?.match(/\/(\d+)$/);
      const totalSize = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      if (totalSize > 1048576) {
        const tailStart = Math.max(0, totalSize - 1048576);
        const tailChunk = await fetch(trimmed, {
          signal: controller.signal,
          redirect: 'follow',
          headers: {
            Range: `bytes=${tailStart}-${totalSize - 1}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        if (tailChunk.ok || tailChunk.status === 206) {
          const tailBuf = Buffer.from(await tailChunk.arrayBuffer());
          const tailDuration = parseMp4MvhdDuration(tailBuf);
          if (tailDuration && tailDuration >= 2 && tailDuration <= 14400) {
            return tailDuration;
          }
        }
      }
    }

    // 4. Fallback to ffprobe if available on server
    return await probeViaFfprobe(trimmed);
  } catch {
    return await probeViaFfprobe(trimmed);
  } finally {
    clearTimeout(timeout);
  }
}
