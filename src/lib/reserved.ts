import { getSettings } from "./plans";
export { DEFAULT_RESERVED } from "./seed-constants";

export async function isReserved(username: string) {
  const s = await getSettings();
  return s.reservedUsernames.includes(username.toLowerCase());
}
