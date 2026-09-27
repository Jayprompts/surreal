import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const features = [
  {
    title: 'A character of your own',
    body: 'Give your channel a second persona: pick the look and the voice that fit the character you want to play.',
  },
  {
    title: 'Its voice, in sync',
    body: 'Your character speaks when you speak, in under a second, with its lips kept in time with its words.',
  },
  {
    title: 'Works where you create',
    body: 'Shows up as “Surreal Camera” and “Surreal Microphone” in OBS, TikTok Live Studio, Discord, Zoom and Google Meet.',
  },
  {
    title: 'Consent built in',
    body: 'Only use faces you own or have permission to use. Custom voices are confirmed live by their owner.',
  },
];

const steps = [
  { title: 'Create your account', body: 'Enter your email and the 6-digit code we send you. No password.' },
  { title: 'Get your free key', body: 'Your first key is free: one stream of up to an hour as your character.' },
  { title: 'Download and go live', body: 'Install the Windows app, enter your key, and pick Surreal as the camera and mic in your streaming app.' },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="bg-gradient pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:pt-28">
          <p className="mx-auto w-fit rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            Free beta for streamers and content creators · Windows
          </p>
          <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-7xl">
            Your <span className="text-gradient">second character</span>, live.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Surreal gives streamers and content creators a second character: its own look and its own voice, live on camera. Be you off
            stream, and your character on it.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" size="lg">
              Get your free key
            </ButtonLink>
            <ButtonLink href="/download" size="lg" variant="secondary">
              Download for Windows
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="demo-heading" className="mx-auto max-w-5xl px-4">
        <h2 id="demo-heading" className="sr-only">
          Demo
        </h2>
        <div className="grid aspect-video place-items-center rounded-2xl border border-border bg-surface">
          <div className="text-center">
            <p className="text-sm font-medium text-muted">Demo video coming soon</p>
            <p className="mt-1 text-xs text-faint">You and your character, side by side</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 py-20">
        <h2 id="features-heading" className="text-center text-3xl font-bold">
          Made for streamers and creators
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="steps-heading" className="mx-auto max-w-6xl px-4 pb-24">
        <h2 id="steps-heading" className="text-center text-3xl font-bold">
          Go live as your character in three steps
        </h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full">
                <span className="bg-gradient grid size-8 place-items-center rounded-full text-sm font-bold text-bg">{i + 1}</span>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-muted">
          Surreal is a free beta. After each stream you can rate it and tell us what worked. That feedback decides what we build next.
        </p>
      </section>
    </>
  );
}
