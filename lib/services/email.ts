import { Resend } from "resend";
import { email as emailConfig } from "@/lib/config";

export type SendResult = { ok: boolean; error?: string };

/** Send an email with an optional PDF attachment via Resend. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  attachment?: { filename: string; content: Buffer };
}): Promise<SendResult> {
  if (!emailConfig.isConfigured) {
    return {
      ok: false,
      error:
        "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM in your .env.",
    };
  }
  try {
    const resend = new Resend(emailConfig.apiKey);
    const { error } = await resend.emails.send({
      from: emailConfig.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachment
        ? [
            {
              filename: opts.attachment.filename,
              content: opts.attachment.content,
            },
          ]
        : undefined,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
