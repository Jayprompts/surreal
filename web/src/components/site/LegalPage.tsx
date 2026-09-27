import type { ReactNode } from 'react';
import { Alert } from '../ui/Alert';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-muted">Last updated {updated}</p>
      </header>
      <Alert tone="warning" title="Draft">
        This page is a draft and will be reviewed before the closed test opens.
      </Alert>
      <div className="space-y-6 leading-relaxed text-muted [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-text [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  );
}
