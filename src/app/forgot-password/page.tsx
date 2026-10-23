import Shell from "../Shell";
import AuthForm from "../AuthForm";

export default function Forgot() {
  return (
    <Shell><main>
      <h1>Lupa password</h1>
      <AuthForm
        endpoint="/api/auth/forgot-password"
        submit="Kirim link reset"
        successMessage="Jika email terdaftar, link reset sudah dikirim."
        fields={[{ name: "email", type: "email", placeholder: "Email", autoComplete: "email" }]}
      />
    </main></Shell>
  );
}
