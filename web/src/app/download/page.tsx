import type { Metadata } from 'next';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { publicEnv } from '@/lib/env';

export const metadata: Metadata = { title: 'Download' };

const requirements = [
  ['Windows', 'Windows 10 or 11, 64-bit'],
  ['Graphics card', 'NVIDIA RTX 3060 or better recommended. AMD and Intel graphics work too, but may be slower.'],
  ['Disk space', 'About 1 GB: the app, plus character models (about 850 MB) downloaded on first run'],
  ['Camera and mic', 'Any webcam and microphone'],
  ['Internet', 'A steady connection: your character\'s voice is made on our servers'],
];

const setup = [
  'Install Surreal and open it.',
  'Enter your key from the dashboard. This links your PC to your account.',
  'On first run the app downloads its models and tests your camera and mic.',
  'In OBS, TikTok Live Studio, Zoom, Google Meet or Discord, choose “Surreal Camera” and “Surreal Microphone”.',
];

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-12">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold">Download Surreal for Windows</h1>
        <p className="text-muted">
          You&apos;ll need a key to use the app. <Link href="/dashboard" className="text-cyan underline underline-offset-4">Get your free key</Link> first.
        </p>
        {publicEnv.downloadUrl ? (
          <ButtonLink href={publicEnv.downloadUrl} size="lg">
            Download for Windows
          </ButtonLink>
        ) : (
          <Alert title="The installer arrives with the closed test">We&apos;ll email you when it&apos;s ready to download.</Alert>
        )}
      </header>

      <Card aria-labelledby="req-heading">
        <h2 id="req-heading" className="text-xl font-semibold">
          System requirements
        </h2>
        <dl className="mt-4 divide-y divide-border">
          {requirements.map(([term, detail]) => (
            <div key={term} className="grid gap-1 py-3 sm:grid-cols-3">
              <dt className="font-medium">{term}</dt>
              <dd className="text-muted sm:col-span-2">{detail}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card aria-labelledby="setup-heading">
        <h2 id="setup-heading" className="text-xl font-semibold">
          Setting up
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-muted">
          {setup.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-faint">
          Your key only works on the PC you activate it on. Moving to a new PC later? You can request a device change from your dashboard.
        </p>
      </Card>
    </div>
  );
}
