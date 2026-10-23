/** Google Safe Browsing. Aktif bila GOOGLE_SAFE_BROWSING_KEY diset; gagal-terbuka bila API bermasalah. */
export async function isUnsafeUrl(url: string): Promise<boolean> {
  const key = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!key) return false;
  try {
    const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        client: { clientId: "tautin", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
    });
    const j = await r.json();
    return Array.isArray(j.matches) && j.matches.length > 0;
  } catch {
    return false;
  }
}
