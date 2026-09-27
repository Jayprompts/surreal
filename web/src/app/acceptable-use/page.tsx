import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';

export const metadata: Metadata = { title: 'Acceptable use' };

export default function AcceptableUsePage() {
  return (
    <LegalPage title="Acceptable use policy" updated="27 September 2026">
      <section className="space-y-2">
        <h2>Consent first</h2>
        <ul>
          <li>Only use faces that are yours, or that you have the person&apos;s permission to use.</li>
          <li>Cloned voices must be confirmed live by the person whose voice it is. Well-known public voices can&apos;t be cloned.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2>Never use Surreal to</h2>
        <ul>
          <li>Impersonate a real person without their consent.</li>
          <li>Commit fraud or scams, or deceive people for money or access.</li>
          <li>Create sexual content of a real person.</li>
          <li>Harass, threaten or bully anyone.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2>What happens if you do</h2>
        <p>Your key is revoked and your PC is blocked from Surreal. We may also report illegal activity to the authorities.</p>
      </section>
    </LegalPage>
  );
}
