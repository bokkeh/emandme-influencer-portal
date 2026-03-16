import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@emandmestudio.com";

let _client: Resend | null = null;

function getClient(): Resend {
  if (!apiKey || apiKey === "re_REPLACE_ME") {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const resend = getClient();
  const { error } = await resend.emails.send({
    from: `Em & Me Studio <${fromEmail}>`,
    to,
    subject,
    html,
  });
  if (error) throw new Error(error.message);
}
