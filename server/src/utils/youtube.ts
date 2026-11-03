export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match ? match[1] : null;
}

export function formatVideoEmbed(url: string) {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      isYouTube: true,
      youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=0&enablejsapi=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }
  return {
    isYouTube: false,
    youtubeId: null,
    embedUrl: url,
    thumbnailUrl: null,
  };
}
