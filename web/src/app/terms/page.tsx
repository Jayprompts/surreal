import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/site/LegalPage';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="27 September 2026">
      <section className="space-y-2">
        <h2>A free beta</h2>
        <p>Surreal is in beta: features may change, and the service may be unavailable at times. We&apos;d love your feedback.</p>
      </section>
      <section className="space-y-2">
        <h2>Keys and go-lives</h2>
        <ul>
          <li>A key is a licence for one PC and a set number of go-lives. A go-live counts once a session has been live for 10 seconds.</li>
          <li>Your first key is free, once per account. Later keys come from donations.</li>
          <li>One account, one PC: moving to a new PC needs a device change request with proof, approved by our team.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2>Donations</h2>
        <p>A donation is required for a new key, so it pays for access. Donations are non-refundable once the key is issued.</p>
      </section>
      <section className="space-y-2">
        <h2>Using Surreal responsibly</h2>
        <p>
          You agree to the <Link href="/acceptable-use" className="text-cyan underline underline-offset-4">Acceptable use policy</Link>. Breaking
          it means your key is revoked and your PC is blocked.
        </p>
      </section>
      <section className="space-y-2">
        <h2>Where the beta is offered</h2>
        <p>The beta is offered in Nigeria and other African countries.</p>
      </section>
    </LegalPage>
  );
}
