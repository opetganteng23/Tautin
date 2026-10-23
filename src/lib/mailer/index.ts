import { gmailMailer } from "./gmail";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
}
export interface Mailer {
  send(msg: MailMessage): Promise<void>;
}

// Ganti penyedia (Brevo/SendGrid/SES) cukup dengan mengganti implementasi ini.
export const mailer: Mailer = gmailMailer;
