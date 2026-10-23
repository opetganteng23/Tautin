import { createHash } from "crypto";
import { env } from "./env";

// Key sandbox berawalan "SB-"; selain itu dianggap production.
const sandbox = () => env("MIDTRANS_SERVER_KEY").startsWith("SB-");
const auth = () => "Basic " + Buffer.from(env("MIDTRANS_SERVER_KEY") + ":").toString("base64");

export const snapScriptUrl = () =>
  sandbox() ? "https://app.sandbox.midtrans.com/snap/snap.js" : "https://app.midtrans.com/snap/snap.js";

export async function createSnapTransaction(p: { orderId: string; amount: number; email: string; itemName: string }) {
  const base = sandbox() ? "https://app.sandbox.midtrans.com" : "https://app.midtrans.com";
  const r = await fetch(`${base}/snap/v1/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: auth() },
    body: JSON.stringify({
      transaction_details: { order_id: p.orderId, gross_amount: p.amount },
      item_details: [{ id: "plan", price: p.amount, quantity: 1, name: p.itemName.slice(0, 50) }],
      customer_details: { email: p.email },
      enabled_payments: ["qris", "gopay", "bca_va", "bni_va", "bri_va", "permata_va", "other_va"],
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.token) throw new Error(`Midtrans: ${j.error_messages?.join(", ") || r.status}`);
  return { token: j.token as string };
}

/** Status transaksi langsung dari API Midtrans (sumber kebenaran; payload webhook tidak dipercaya). */
export async function fetchStatus(orderId: string) {
  const base = sandbox() ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";
  const r = await fetch(`${base}/v2/${encodeURIComponent(orderId)}/status`, { headers: { Accept: "application/json", Authorization: auth() } });
  return (await r.json()) as { status_code?: string; transaction_status?: string; payment_type?: string; gross_amount?: string; fraud_status?: string; order_id?: string };
}

export function validSignature(n: { order_id?: string; status_code?: string; gross_amount?: string; signature_key?: string }) {
  if (!n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;
  const expect = createHash("sha512").update(n.order_id + n.status_code + n.gross_amount + env("MIDTRANS_SERVER_KEY")).digest("hex");
  return expect === n.signature_key;
}
