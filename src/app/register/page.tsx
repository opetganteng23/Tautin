import Shell from "../Shell";
import Link from "next/link";
import AuthForm from "../AuthForm";

export default function Register() {
  return (
    <Shell><main>
      <h1>Daftar</h1>
      <AuthForm
        endpoint="/api/auth/register"
        submit="Daftar"
        successMessage="Cek email Anda untuk verifikasi."
        fields={[
          { name: "email", type: "email", placeholder: "Email", autoComplete: "email" },
          { name: "username", placeholder: "Username", autoComplete: "username" },
          { name: "password", type: "password", placeholder: "Password (min. 8 karakter)", autoComplete: "new-password" },
        ]}
        extra={<Link href="/login">Sudah punya akun?</Link>}
      />
    </main></Shell>
  );
}
