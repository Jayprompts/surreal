import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail): Promise<void> {
  await transport.sendMail({ from: env.MAIL_FROM, ...mail });
}

// For emails sent after a change is saved: a mail server problem is logged, never undoes the change.
export function sendMailInBackground(mail: Mail): void {
  sendMail(mail).catch((err: unknown) => {
    console.error(`❌ Email "${mail.subject}" to ${mail.to} failed:`, err instanceof Error ? err.message : err);
  });
}
