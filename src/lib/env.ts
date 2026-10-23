export function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env ${name} belum diset`);
  return v;
}
export const baseUrl = () => process.env.BASE_URL || "http://localhost:3000";
