import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM ?? "SentryHub <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

let _resend: Resend | null = null;
function resend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

// Sends a transactional email. No-ops (returns false) if email isn't configured,
// so notifications still work in-app and via push without a Resend key.
export async function sendNotificationEmail(opts: {
  to: string;
  title: string;
  body: string;
  url: string;
}): Promise<boolean> {
  const client = resend();
  if (!client) return false;

  const link = `${APP_URL}${opts.url}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#e11d48;margin-bottom:4px">${opts.title}</h2>
      <p style="color:#333">${opts.body}</p>
      <p><a href="${link}" style="display:inline-block;background:#e11d48;color:#fff;
        padding:10px 18px;border-radius:6px;text-decoration:none">View on SentryHub</a></p>
      <p style="color:#999;font-size:12px;margin-top:24px">
        Manage what you get emailed in your <a href="${APP_URL}/settings">notification settings</a>.
      </p>
    </div>`;

  try {
    await client.emails.send({ from: FROM, to: opts.to, subject: opts.title, html });
    return true;
  } catch {
    return false;
  }
}
