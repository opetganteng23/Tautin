import Shell from "../Shell";
import Link from "next/link";
import AuthForm from "../AuthForm";

export default function Login() {
  return (
    <Shell><main>
      <h1>Masuk</h1>
      <AuthForm
        endpoint="/api/auth/login"
        submit="Masuk"
        redirectTo="/dashboard"
        fields={[
          { name: "email", type: "email", placeholder: "Email", autoComplete: "email" },
          { name: "password", type: "password", placeholder: "Password", autoComplete: "current-password" },
        ]}
        extra={<><Link href="/forgot-password">Lupa password?</Link><Link href="/register">Belum punya akun?</Link></>}
      />
    </main></Shell>
  );
}
