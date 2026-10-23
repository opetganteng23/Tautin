import Shell from "../Shell";
import AuthForm from "../AuthForm";

export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <Shell><main>
      <h1>Password baru</h1>
      <AuthForm
        endpoint="/api/auth/reset-password"
        submit="Simpan"
        hidden={{ token: token || "" }}
        redirectTo="/login"
        fields={[{ name: "password", type: "password", placeholder: "Password baru (min. 8 karakter)", autoComplete: "new-password" }]}
      />
    </main></Shell>
  );
}
