'use client';

import type { PublicImage } from '@forestwatch/types';
import { useState } from 'react';
import { Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { StoredImage } from '@/components/stored-image';

export function ImageUploadField({
  label,
  current,
  onUpload,
  onRemove,
  emptyLabel = 'No photograph stored yet.',
}: {
  label: string;
  current: PublicImage | null;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  emptyLabel?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Field label={label}>
        <input
          className={inputClassName}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) {
              return;
            }
            setPending(true);
            setError(null);
            void onUpload(file)
              .catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : 'Upload failed');
              })
              .finally(() => setPending(false));
          }}
        />
      </Field>
      {current ? <StoredImage image={current} alt={label} /> : emptyLabel ? <p className="text-sm text-ink/60">{emptyLabel}</p> : null}
      {current && onRemove ? (
        <button
          type="button"
          className={`${buttonClassName} bg-transparent text-forest-800 ring-1 ring-forest-800/30 hover:bg-forest-800/5`}
          disabled={pending}
          onClick={() => {
            setPending(true);
            setError(null);
            void onRemove()
              .catch((caught: unknown) => {
                setError(caught instanceof Error ? caught.message : 'Could not remove photograph');
              })
              .finally(() => setPending(false));
          }}
        >
          {pending ? 'Working…' : 'Remove photograph'}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
