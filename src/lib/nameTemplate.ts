function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function buildOutputFilename(originalFilename: string, format: 'mp4' | 'mp3'): string {
  const base = originalFilename.replace(/\.[^./\\]+$/, '');
  const slug = slugify(base) || 'video';
  const suffix = format === 'mp3' ? 'tribute-audio' : 'tribute-ready';
  return `${slug}-${suffix}.${format}`;
}
