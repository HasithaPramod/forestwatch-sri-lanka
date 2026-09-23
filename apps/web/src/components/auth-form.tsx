export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-md px-4 py-8 sm:py-16">
      <h1 className="font-display text-3xl text-forest-900 sm:text-4xl">{title}</h1>
      <div className="mt-8 rounded-2xl border border-forest-900/10 bg-white/70 p-4 sm:p-6">{children}</div>
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-ink/80">
      <span>{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export const inputClassName =
  'w-full rounded-xl border border-forest-900/15 bg-cream px-3 py-2 text-ink outline-none focus:border-forest-700';

export const buttonClassName =
  'w-full rounded-full bg-forest-800 px-4 py-2.5 text-cream hover:bg-forest-700 disabled:opacity-60';
