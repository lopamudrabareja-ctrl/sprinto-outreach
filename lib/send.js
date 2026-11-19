// Step 7: send via Gmail. The recipient is HARDCODED to MY_EMAIL - never the prospect.
import nodemailer from 'nodemailer';

export async function send({ subject, body, intendedFor, company, why }) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, MY_EMAIL } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !MY_EMAIL) {
    return { sent: false, reason: 'Gmail env vars missing (GMAIL_USER, GMAIL_APP_PASSWORD, MY_EMAIL)' };
  }
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
  });

  // Footer shows who the email WOULD go to and why, so the inbox copy is self-explaining.
  const footer = `\n\n----\n[Sprinto Outreach test send]\nIntended for: ${intendedFor.name} <${intendedFor.email || 'no email'}>, ${intendedFor.position} at ${company}\nWhy: ${why}`;

  const info = await transport.sendMail({
    from: GMAIL_USER,
    to: MY_EMAIL, // hardcoded per the brief
    subject,
    text: body + footer,
  });
  return { sent: true, messageId: info.messageId, to: MY_EMAIL };
}
