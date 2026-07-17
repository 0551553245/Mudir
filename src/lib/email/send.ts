export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Email is not configured (RESEND_API_KEY, EMAIL_FROM)");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed: ${body}`);
  }
}
