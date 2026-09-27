import { eq } from 'drizzle-orm';
import { db, disconnectDB } from '../db/client.js';
import { accounts } from '../db/schema.js';
import { audit } from '../services/audit.js';

// Makes an existing account the owner: npm run make-owner -- you@example.com
// The person must have signed in on the website once, so their account exists.
const email = process.argv[2]?.trim().toLowerCase();

try {
  if (!email) throw new Error('Usage: npm run make-owner -- <email>');

  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  if (!account) throw new Error(`No account for ${email}. Sign in on the website once, then run this again.`);

  if (account.staffRole === 'owner') {
    console.log(`ℹ️  ${email} is already the owner`);
  } else {
    await db.transaction(async (tx) => {
      await tx.update(accounts).set({ staffRole: 'owner', status: 'active', statusReason: null }).where(eq(accounts.id, account.id));
      await audit(tx, {
        actor: null,
        actorLabel: 'system (make-owner script)',
        action: 'account.make_owner',
        target: { type: 'account', id: account.id },
        before: { staffRole: account.staffRole, status: account.status },
        after: { staffRole: 'owner', status: 'active' },
      });
    });
    console.log(`✅ ${email} is now the owner. Set up two-factor sign-in before using the admin area.`);
  }
} catch (err) {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
