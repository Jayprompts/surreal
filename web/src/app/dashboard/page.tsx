import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { AccountView, KeyState, KeyView } from '@/lib/types';
import { signOut } from './actions';
import { KeyPanel } from './KeyPanel';

export const metadata: Metadata = { title: 'Dashboard' };

const SOURCE: Record<KeyView['source'], string> = { new_account: 'Free', donation: 'Donation', admin_grant: 'Granted' };

export default async function DashboardPage() {
  const me = await api<{ account: AccountView }>('/me');
  if (!me.ok && (me.status === 401 || me.error.code === 'session_expired')) redirect('/login?next=/dashboard');

  if (!me.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="mt-8">
          <Alert tone="danger" title={me.error.code === 'account_blocked' ? 'Account blocked' : 'Something went wrong'}>
            {me.error.message}
          </Alert>
        </div>
        <form action={signOut} className="mt-6">
          <Button variant="secondary">Sign out</Button>
        </form>
      </div>
    );
  }

  const [state, history] = await Promise.all([api<KeyState>('/keys/current'), api<{ keys: KeyView[] }>('/keys')]);
  const account = me.data.account;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted">{account.email}</p>
      </header>

      {state.ok ? <KeyPanel state={state.data} /> : <Alert tone="danger">{state.error.message}</Alert>}

      {history.ok && history.data.keys.length > 0 && (
        <Card aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-xl font-semibold">
            Key history
          </h2>
          <div className="mt-4">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-faint">
                <tr>
                  <th scope="col" className="py-2 font-medium">Key</th>
                  <th scope="col" className="hidden py-2 font-medium sm:table-cell">Type</th>
                  <th scope="col" className="py-2 font-medium">Used</th>
                  <th scope="col" className="hidden py-2 font-medium sm:table-cell">Issued</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.data.keys.map((k) => (
                  <tr key={k.id}>
                    <td className="py-2 font-mono">…{k.last4}</td>
                    <td className="hidden py-2 text-muted sm:table-cell">{SOURCE[k.source]}</td>
                    <td className="py-2 text-muted">
                      {k.goLivesUsed} of {k.goLivesTotal}
                    </td>
                    <td className="hidden py-2 text-muted sm:table-cell">{formatDate(k.issuedAt)}</td>
                    <td className="py-2 capitalize text-muted">{k.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card aria-labelledby="account-heading">
        <h2 id="account-heading" className="text-xl font-semibold">
          Account
        </h2>
        <p className="mt-2 text-sm text-muted">
          Signed in as {account.email} · member since {formatDate(account.createdAt)}
        </p>
        <form action={signOut} className="mt-4">
          <Button variant="secondary">Sign out</Button>
        </form>
      </Card>
    </div>
  );
}
