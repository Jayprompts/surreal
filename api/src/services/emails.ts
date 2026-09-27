import type { Features } from '../db/schema.js';
import type { Mail } from './mailer.js';

// Dates in emails are shown in Nigerian time (the beta's audience).
const day = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Africa/Lagos' });

const featureList = (f: Features) =>
  [f.face && 'character look', f.voice && 'character voice', f.voiceCloning && 'custom voices'].filter(Boolean).join(', ');

const layout = (body: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;padding:32px">
        <tr><td style="font-size:20px;font-weight:700;padding-bottom:16px">Surreal</td></tr>
        ${body}
      </table>
    </td></tr></table>
  </body>
</html>`;

type KeyEmail = { to: string; key: string; goLives: number; minutesPerGoLive: number; expiresAt: Date; features: Features };

// The only place besides the one-time reveal on the dashboard where the full key appears.
export function keyIssuedEmail(k: KeyEmail): Mail {
  const goLives = `${k.goLives} go-live${k.goLives === 1 ? '' : 's'}`;
  const expires = day.format(k.expiresAt);
  const text = [
    'Here is your Surreal key:',
    '',
    `    ${k.key}`,
    '',
    `It gives you ${goLives} of up to ${k.minutesPerGoLive} minutes each (${featureList(k.features)}), until ${expires}.`,
    '',
    'Enter it in the Surreal app on your PC. The first activation links that PC to your account for good.',
    'Keep this email: after the one-time reveal, the dashboard only shows the last 4 characters.',
  ].join('\n');
  const html = layout(`
        <tr><td style="font-size:15px;line-height:1.5;padding-bottom:16px">Here is your Surreal key:</td></tr>
        <tr><td style="font-family:Consolas,Menlo,monospace;font-size:24px;font-weight:700;letter-spacing:2px;padding:16px;background:#f5f5f7;border-radius:8px">${k.key}</td></tr>
        <tr><td style="font-size:15px;line-height:1.5;padding:20px 0 16px">It gives you <b>${goLives}</b> of up to <b>${k.minutesPerGoLive} minutes</b> each (${featureList(k.features)}), until <b>${expires}</b>.</td></tr>
        <tr><td style="font-size:15px;line-height:1.5;padding-bottom:16px">Enter it in the Surreal app on your PC. The first activation links that PC to your account for good.</td></tr>
        <tr><td style="font-size:13px;line-height:1.5;color:#666">Keep this email: after the one-time reveal, the dashboard only shows the last 4 characters.</td></tr>`);
  return { to: k.to, subject: 'Your Surreal key', text, html };
}
