import { mailer } from "./mailer";
import { baseUrl } from "./env";

export const sendVerifyEmail = (to: string, token: string) =>
  mailer.send({
    to,
    subject: "Verifikasi email Tautin",
    html: `<p>Klik untuk verifikasi: <a href="${baseUrl()}/verify-email?token=${token}">Verifikasi email</a></p><p>Berlaku 24 jam.</p>`,
  });

export const sendResetEmail = (to: string, token: string) =>
  mailer.send({
    to,
    subject: "Reset password Tautin",
    html: `<p>Klik untuk reset password: <a href="${baseUrl()}/reset-password?token=${token}">Reset password</a></p><p>Berlaku 1 jam. Abaikan jika bukan Anda.</p>`,
  });
