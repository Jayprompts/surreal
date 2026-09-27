import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-gradient text-6xl font-bold">404</p>
      <h1 className="mt-4 text-2xl font-bold">This page doesn&apos;t exist</h1>
      <p className="mt-2 text-muted">The link may be old, or the address mistyped.</p>
      <ButtonLink href="/" className="mt-8">
        Back to home
      </ButtonLink>
    </div>
  );
}
