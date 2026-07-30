export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'service';
}

export function serviceUrl(service: { id: number; name?: string }): string {
  const slug = slugify(service.name || 'service');
  return `/services/${service.id}/${slug}`;
}
