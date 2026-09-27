'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CopyButton } from '@/components/ui/CopyButton';
import { daysLeft, featureNames, formatDate, plural } from '@/lib/format';
import type { KeyState, KeyView } from '@/lib/types';
import { getFreeKey, revealKey, type KeyActionResult } from './actions';

const STATUS: Record<KeyView['status'], { label: string; tone: 'success' | 'accent' | 'warning' | 'danger' | 'neutral' }> = {
  issued: { label: 'Ready to activate', tone: 'accent' },
  active: { label: 'Active', tone: 'success' },
  exhausted: { label: 'Used up', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'warning' },
  revoked: { label: 'Revoked', tone: 'danger' },
};

export function KeyPanel({ state }: { state: KeyState }) {
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<KeyActionResult>) =>
    startTransition(async () => {
      setError(null);
      const r = await action();
      if (r.ok) setFullKey(r.fullKey);
      else setError(r.message);
    });

  // The one moment the full key is on screen.
  if (fullKey) {
    return (
      <Card aria-labelledby="full-key-heading" className="border-violet/60">
        <h2 id="full-key-heading" className="text-xl font-semibold">
          Your key
        </h2>
        <p className="mt-4 break-all rounded-xl bg-bg p-4 text-center font-mono text-2xl font-bold tracking-wider sm:text-3xl" data-testid="full-key">
          {fullKey}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <CopyButton text={fullKey} label="Copy key" />
          <Button onClick={() => setFullKey(null)}>I&apos;ve saved it</Button>
        </div>
        <div className="mt-4">
          <Alert tone="warning" title="Save it now">
            We&apos;ve emailed it to you too. After you leave this page, only its last 4 characters are shown here.
          </Alert>
        </div>
      </Card>
    );
  }

  const { key } = state;
  return (
    <div className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}

      {!key && state.canGetFreeKey && state.freeKeyOffer && (
        <Card aria-labelledby="free-heading">
          <h2 id="free-heading" className="text-xl font-semibold">
            Get your free key
          </h2>
          <p className="mt-2 text-muted">
            {plural(state.freeKeyOffer.goLives, 'go-live')} of up to {state.freeKeyOffer.minutesPerGoLive} minutes, valid for{' '}
            {state.freeKeyOffer.expiryDays} days. Includes {featureNames(state.freeKeyOffer.features).join(', ').toLowerCase()}.
          </p>
          <p className="mt-4 text-sm text-faint">
            When you activate it, the Surreal app links your account to your PC. We keep only a scrambled fingerprint (a salted hash) of your
            PC&apos;s hardware IDs, never the IDs themselves. The key then works on that PC only.{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-text">
              Privacy
            </Link>
          </p>
          <Button className="mt-6" size="lg" loading={pending} onClick={() => run(getFreeKey)}>
            Get free key
          </Button>
        </Card>
      )}

      {!key && !state.canGetFreeKey && (
        <Alert title="Free keys are paused">New free keys aren&apos;t available right now. Please check back soon.</Alert>
      )}

      {key && (
        <Card aria-labelledby="key-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="key-heading" className="text-xl font-semibold">
              Your key
            </h2>
            <Badge tone={STATUS[key.status].tone}>{STATUS[key.status].label}</Badge>
          </div>
          <p className="mt-4 font-mono text-2xl tracking-wider" data-testid="masked-key">
            {key.masked}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-faint">Go-lives left</dt>
              <dd className="mt-1 text-lg font-semibold">
                {key.goLivesLeft} of {key.goLivesTotal}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-faint">Per go-live</dt>
              <dd className="mt-1 text-lg font-semibold">Up to {key.minutesPerGoLive} min</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-faint">{key.status === 'expired' ? 'Expired' : 'Expires'}</dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatDate(key.expiresAt)}
                {state.hasCurrentKey && <span className="ml-2 text-sm font-normal text-muted">({plural(daysLeft(key.expiresAt), 'day')} left)</span>}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">Includes: {featureNames(key.features).join(' · ')}</p>

          {key.revealable && (
            <div className="mt-6 space-y-3">
              <Alert tone="info" title="Your key is ready">
                It hasn&apos;t been shown yet. Reveal it once here (it&apos;s in your email too).
              </Alert>
              <Button loading={pending} onClick={() => run(revealKey)}>
                Reveal key
              </Button>
            </div>
          )}

          {key.status === 'issued' && !key.revealable && (
            <p className="mt-6 text-sm text-muted">
              Next:{' '}
              <Link href="/download" className="text-cyan underline underline-offset-4">
                download the app
              </Link>{' '}
              and enter your key.
            </p>
          )}
        </Card>
      )}

      {state.canDonate && (
        <Card aria-labelledby="donate-heading">
          <h2 id="donate-heading" className="text-xl font-semibold">
            Need a new key?
          </h2>
          <p className="mt-2 text-muted">Donate to keep Surreal running and get a new key. The amount you give decides how many go-lives it has.</p>
          <Button className="mt-6" disabled>
            Donations open soon
          </Button>
        </Card>
      )}
    </div>
  );
}
