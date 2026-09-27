import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="27 September 2026">
      <section className="space-y-2">
        <h2>What stays on your PC</h2>
        <ul>
          <li>The face photos you add, and every video frame from your camera. Face swapping runs on your own graphics card.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2>What we process</h2>
        <ul>
          <li>Your email address, to sign you in with one-time codes and send you your keys.</li>
          <li>
            A device ID: when you activate a key, the app combines your PC&apos;s hardware identifiers and we store only a salted hash of them,
            never the identifiers themselves. It links your key to one PC.
          </li>
          <li>Your microphone audio while you use voice, converted in memory on our servers. It is never recorded, unless you choose to send us a bug sample.</li>
          <li>Voices you clone: the reference recording is stored encrypted, linked to your account, and you can delete it at any time.</li>
          <li>Session details: when you went live, for how long, frame rate, voice delay and your graphics card model, to keep the service working.</li>
          <li>Feedback and bug reports you send us.</li>
          <li>Proof you upload for a device change, deleted 90 days after the decision.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2>Who helps us</h2>
        <ul>
          <li>Supabase (accounts and database), RunPod (voice servers), NOWPayments (donations).</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2>Your rights</h2>
        <p>
          Under the Nigeria Data Protection Act (and the GDPR where it applies) you can ask to see, correct or delete your data. Contact details
          will be added here before the closed test.
        </p>
      </section>
    </LegalPage>
  );
}
