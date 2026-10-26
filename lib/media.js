const VIDEO_FILE = /\.(mp4|webm|ogv|ogg|mov)(?:[?#]|$)/i;

// Existing image/GIF fields keep working; video and explicit media objects
// can be added without changing the card or reader components.
export function getMedia(item) {
  if (item.video) {
    const video = typeof item.video === 'string' ? { src: item.video } : item.video;
    if (video.src) return { ...video, type: 'video', poster: video.poster || item.poster, alt: video.alt || item.imageAlt || item.title || '' };
  }
  const media = typeof item.media === 'string' ? { src: item.media } : item.media;
  const src = media?.src || item.image;
  if (!src) return null;
  return {
    ...media,
    src,
    type: media?.type === 'video' || media?.type?.startsWith('video/') || VIDEO_FILE.test(src) ? 'video' : 'image',
    poster: media?.poster || item.poster,
    alt: media?.alt || item.imageAlt || item.title || '',
  };
}
