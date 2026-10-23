import { mailer } from "./mailer";
import { baseUrl } from "./env";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Kerangka email: salam, isi, tombol aksi, catatan, lalu penutup resmi. */
function layout(o: { paragraphs: string[]; button?: { label: string; url: string }; notes?: string[] }) {
  const btn = o.button
    ? `<p style="margin:24px 0"><a href="${o.button.url}" style="display:inline-block;padding:12px 24px;background:#f47421;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:10px">${esc(o.button.label)}</a></p>
       <p style="font-size:13px;color:#555">Jika tombol di atas tidak berfungsi, salin dan tempel tautan berikut ke peramban Anda:<br><a href="${o.button.url}" style="color:#00809d;word-break:break-all">${o.button.url}</a></p>`
    : "";
  const notes = (o.notes ?? []).map((n) => `<p>${n}</p>`).join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0f2a35;max-width:560px;margin:0 auto;padding:24px">
  <p>Yth. Pengguna Tautin AILO,</p>
  ${o.paragraphs.map((p) => `<p>${p}</p>`).join("")}
  ${btn}
  ${notes}
  <p>Terima kasih atas perhatian dan kepercayaan Anda dalam menggunakan Tautin AILO.</p>
  <p>Hormat kami,<br><i>Tim Tautin AILO</i><br>CoE AILO &ndash; Telkom University<br><a href="https://ailo.telkomuniversity.ac.id" style="color:#00809d">https://ailo.telkomuniversity.ac.id</a></p>
  <hr style="border:none;border-top:1px solid #e3e8ec;margin:20px 0">
  <p style="font-size:12px;color:#777">Email ini dikirim otomatis, mohon tidak membalas langsung ke alamat pengirim.</p>
</div>`;
}

export const sendVerifyEmail = (to: string, token: string) =>
  mailer.send({
    to,
    subject: "Verifikasi Alamat Email Akun Tautin AILO",
    html: layout({
      paragraphs: [
        "Terima kasih telah melakukan pendaftaran akun pada platform Tautin AILO.",
        "Untuk menyelesaikan proses pendaftaran dan mengaktifkan akun Anda, silakan lakukan verifikasi alamat email dengan mengeklik tombol berikut:",
      ],
      button: { label: "Verifikasi Alamat Email", url: `${baseUrl()}/verify-email?token=${token}` },
      notes: [
        "Tautan verifikasi ini berlaku selama <b>24 jam</b> sejak email diterbitkan. Apabila tautan telah kedaluwarsa, silakan ajukan kembali proses verifikasi melalui dashboard Tautin AILO.",
        "Jika Anda tidak merasa melakukan pendaftaran akun, silakan abaikan email ini.",
      ],
    }),
  });

export const sendResetEmail = (to: string, token: string) =>
  mailer.send({
    to,
    subject: "Permintaan Pengaturan Ulang Password Akun Tautin AILO",
    html: layout({
      paragraphs: [
        "Kami menerima permintaan untuk mengatur ulang password akun Tautin AILO yang terdaftar dengan alamat email ini.",
        "Untuk membuat password baru, silakan mengeklik tombol berikut:",
      ],
      button: { label: "Atur Ulang Password", url: `${baseUrl()}/reset-password?token=${token}` },
      notes: [
        "Tautan ini berlaku selama <b>1 jam</b> sejak email diterbitkan dan hanya dapat digunakan satu kali.",
        "Jika Anda tidak merasa mengajukan permintaan ini, silakan abaikan email ini. Password Anda tidak akan berubah dan akun Anda tetap aman.",
      ],
    }),
  });

export const sendExpiryReminder = (to: string, days: number, planName: string) => {
  const when = days <= 1 ? "besok" : `dalam ${days} hari`;
  return mailer.send({
    to,
    subject: `Pengingat: Paket ${planName} Tautin AILO Berakhir ${when.charAt(0).toUpperCase() + when.slice(1)}`,
    html: layout({
      paragraphs: [
        `Kami informasikan bahwa paket <b>${esc(planName)}</b> pada akun Tautin AILO Anda akan berakhir <b>${when}</b>.`,
        "Agar seluruh link, tema, dan statistik Anda tetap aktif tanpa terputus, silakan perpanjang paket melalui menu Langganan pada dashboard Anda. Masa aktif perpanjangan akan ditambahkan dari tanggal berakhir paket saat ini.",
      ],
      button: { label: "Perpanjang Paket", url: `${baseUrl()}/dashboard` },
      notes: [
        "Apabila paket tidak diperpanjang, setelah masa tenggang berakhir akun Anda akan kembali ke paket Free. Link yang melebihi batas paket Free akan dinonaktifkan sementara (tidak dihapus) dan dapat diaktifkan kembali setelah Anda berlangganan.",
      ],
    }),
  });
};
