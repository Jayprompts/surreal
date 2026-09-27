import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Surreal · Free beta</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/privacy" className="hover:text-text">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-text">
            Terms
          </Link>
          <Link href="/acceptable-use" className="hover:text-text">
            Acceptable use
          </Link>
        </nav>
      </div>
    </footer>
  );
}
