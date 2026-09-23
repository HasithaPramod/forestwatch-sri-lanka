import type { PublicImage } from '@forestwatch/types';

export function StoredImage({
  image,
  alt,
  className = 'h-48 w-full object-cover',
}: {
  image: PublicImage;
  alt: string;
  className?: string;
}) {
  return (
    <a href={image.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl bg-forest-900/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.thumbnailUrl} alt={alt} loading="lazy" className={className} />
    </a>
  );
}
