import { createHash } from "node:crypto";
import { Resend } from "resend";
import { getConfig } from "../config.js";
import { isResendEnabled } from "./resend-config.js";

type EmailKind = "sign-in" | "invite";

function emailLayout(title: string, body: string, ctaLabel: string, ctaUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;background:#0a0a0f;font-family:system-ui,sans-serif;color:#fafafa;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#12121a;border:1px solid #27272a;border-radius:12px;padding:28px">
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#818cf8">Relay</p>
    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${title}</h1>
    <p style="margin:0 0 20px;color:#a1a1aa;line-height:1.6">${body}</p>
    <a href="${ctaUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${ctaLabel}</a>
    <p style="margin:20px 0 0;font-size:12px;color:#71717a;line-height:1.5">Or paste this link:<br/><a href="${ctaUrl}" style="color:#818cf8;word-break:break-all">${ctaUrl}</a></p>
    <p style="margin:16px 0 0;font-size:11px;color:#52525b">Link expires in 15 minutes.</p>
  </div>
</body>
</html>`;
}

function logDevLink(kind: EmailKind, email: string, url: string) {
  console.log(`\n--- ${kind === "sign-in" ? "Magic link" : "Invite link"} ---`);
  console.log(`To: ${email}`);
  console.log(`Link: ${url}`);
  console.log("--------------------------------\n");
}

export async function sendMagicLink(email: string, verifyUrl: string): Promise<void> {
  await sendEmail({
    kind: "sign-in",
    to: email,
    subject: "Sign in to Relay",
    title: "Sign in to Relay",
    body: "Click below to sign in. No password needed.",
    ctaLabel: "Sign in",
    ctaUrl: verifyUrl,
  });
}

export async function sendInviteLink(email: string, artifactTitle: string, inviteUrl: string): Promise<void> {
  await sendEmail({
    kind: "invite",
    to: email,
    subject: `You've been invited to view "${artifactTitle}"`,
    title: "You've been invited",
    body: `Someone shared an AI experience <strong>${artifactTitle}</strong> with you. Sign in to view it.`,
    ctaLabel: "View experience",
    ctaUrl: inviteUrl,
  });
}

async function sendEmail(opts: {
  kind: EmailKind;
  to: string;
  subject: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): Promise<void> {
  const config = getConfig();
  const html = emailLayout(opts.title, opts.body, opts.ctaLabel, opts.ctaUrl);
  const useResend = isResendEnabled(config.resendApiKey);

  if (config.logMagicLinks || !useResend) {
    logDevLink(opts.kind, opts.to, opts.ctaUrl);
  }

  if (!useResend) {
    return;
  }

  const resend = new Resend(config.resendApiKey);
  const { error } = await resend.emails.send({
    from: config.emailFrom,
    to: opts.to,
    subject: opts.subject,
    html,
  });

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`Resend failed (${error.message}); logging invite link to terminal`);
      logDevLink(opts.kind, opts.to, opts.ctaUrl);
      return;
    }
    throw new Error(`Resend failed: ${error.message}`);
  }
}

export function viewerHash(email: string | null, fingerprint: string): string {
  const input = email ?? fingerprint;
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
