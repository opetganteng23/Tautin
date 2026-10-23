import type { ReactNode } from "react";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", weight: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

const description = "Satu link untuk semua tautanmu";
export const metadata = {
  title: "Tautin",
  description,
  openGraph: { title: "Tautin", description, siteName: "tautin.ailo.id", type: "website" },
};

// Terapkan tema tersimpan sebelum render agar tidak berkedip.
const initTheme = `try{var d=document.documentElement,t=localStorage.getItem("tautin-theme"),f=localStorage.getItem("tautin-fx");if(t)d.dataset.theme=t;if(f)d.dataset.fx=f}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={poppins.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: initTheme }} /></head>
      <body>
        {children}
      </body>
    </html>
  );
}
