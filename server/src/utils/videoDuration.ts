import { extractYouTubeId } from './youtube.js';

/**
 * Reads an MP4 container's `mvhd` atom duration in pure JS from a buffer (works with both
 * fast-start MP4s where `moov` is at the beginning and standard MP4s where `moov` is at the end).
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
 * Probes the real duration (in integer seconds) of a video URL (MP4 or YouTube) from the server.
 * Returns null if the URL cannot be probed within the timeout.
 */
export async function probeVideoDurationSeconds(videoUrl: string): Promise<number | null> {
  if (!videoUrl || typeof videoUrl !== 'string') return null;
  const trimmed = videoUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    // 1. YouTube URL: read lengthSeconds from watch page HTML
    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      const resp = await fetch(`https://www.youtube.com/watch?v=${ytId}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (resp.ok) {
        const html = await resp.text();
        const m =
          html.match(/"lengthSeconds"\s*:\s*"(\d+)"/) ||
          html.match(/itemprop="duration"\s+content="PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/);
        if (m) {
          if (m[1] && !m[2] && !m[3] && html.includes('"lengthSeconds"')) {
            const sec = parseInt(m[1], 10);
            if (sec >= 3 && sec <= 14400) return sec;
          } else {
            const hrs = parseInt(m[1] || '0', 10);
            const mins = parseInt(m[2] || '0', 10);
            const secs = parseInt(m[3] || '0', 10);
            const total = hrs * 3600 + mins * 60 + secs;
            if (total >= 3 && total <= 14400) return total;
          }
        }
      }
      return null;
    }

    // 2. Direct MP4 / media URL: read first 512 KB via Range request (catches fast-start moov)
    const headChunk = await fetch(trimmed, {
      signal: controller.signal,
      headers: { Range: 'bytes=0-524287' },
    });
    if (headChunk.ok || headChunk.status === 206) {
      const arrBuf = await headChunk.arrayBuffer();
      const firstDuration = parseMp4MvhdDuration(Buffer.from(arrBuf));
      if (firstDuration && firstDuration >= 3 && firstDuration <= 14400) {
        return firstDuration;
      }

      // 3. If moov atom is at the tail of the MP4, fetch last 512 KB using Content-Range total size
      const contentRange = headChunk.headers.get('content-range');
      const totalMatch = contentRange?.match(/\/(\d+)$/);
      const totalSize = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      if (totalSize > 524288) {
        const tailStart = Math.max(0, totalSize - 524288);
        const tailChunk = await fetch(trimmed, {
          signal: controller.signal,
          headers: { Range: `bytes=${tailStart}-${totalSize - 1}` },
        });
        if (tailChunk.ok || tailChunk.status === 206) {
          const tailArrBuf = await tailChunk.arrayBuffer();
          const tailDuration = parseMp4MvhdDuration(Buffer.from(tailArrBuf));
          if (tailDuration && tailDuration >= 3 && tailDuration <= 14400) {
            return tailDuration;
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
