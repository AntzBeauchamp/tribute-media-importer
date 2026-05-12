function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function buildOutputFilename(deceasedName: string, originalFilename: string): string {
  const base = originalFilename.replace(/\.[^./\\]+$/, '');
  const slugOriginal = slugify(base) || 'video';
  const slugName = slugify(deceasedName);
  const prefix = slugName ? `${slugName}-` : '';
  return `${prefix}${slugOriginal}-tribute-ready.mp4`;
}
