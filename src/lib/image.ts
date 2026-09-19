const UNSPLASH_HOST = "https://images.unsplash.com/photo-";

export function resolveImage(source: string | undefined | null, width = 400, height = 400, quality = 85) {
  if (!source) return "";
  if (/^(data:|https?:\/\/|\/)/.test(source)) return source;
  return `${UNSPLASH_HOST}${source}?w=${width}&h=${height}&fit=crop&auto=format&q=${quality}`;
}