import nodemailer from "nodemailer";
import type { Mailer } from "./index";

export const gmailMailer: Mailer = {
  async send({ to, subject, html }) {
    const user = process.env.GMAIL_USER;
    if (!user) {
      console.log(`[mailer:dev] to=${to} subject=${subject}\n${html}`);
      return;
    }
    const t = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await t.sendMail({ from: `Tautin <${user}>`, to, subject, html });
  },
};
