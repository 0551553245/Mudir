const MOYASAR_API_BASE =
  process.env.MOYASAR_API_BASE_URL ?? "https://api.moyasar.com/v1";

export interface MoyasarPayment {
  id: string;
  status: string;
  amount: number;
  fee: number;
  currency: string;
  description: string | null;
  metadata: Record<string, string> | null;
  source: {
    type: string;
    company?: string;
    name?: string;
    number?: string;
    token?: string;
    message?: string;
  };
  created_at: string;
  updated_at: string;
}

function getSecretKey(): string {
  const key = process.env.MOYASAR_SECRET_KEY;
  if (!key) throw new Error("MOYASAR_SECRET_KEY is not configured");
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${getSecretKey()}:`).toString("base64")}`;
}

async function moyasarFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${MOYASAR_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    const message =
      data?.message ?? data?.errors?.[0]?.message ?? "Moyasar API error";
    throw new Error(message);
  }
  return data as T;
}

export async function fetchPayment(paymentId: string): Promise<MoyasarPayment> {
  return moyasarFetch<MoyasarPayment>(`/payments/${paymentId}`);
}

export async function chargeWithToken(params: {
  amountHalalas: number;
  token: string;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}): Promise<MoyasarPayment> {
  return moyasarFetch<MoyasarPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountHalalas,
      currency: "SAR",
      description: params.description,
      callback_url: params.callbackUrl,
      source: {
        type: "token",
        token: params.token,
      },
      metadata: params.metadata ?? {},
    }),
  });
}

export function sarToHalalas(sar: number): number {
  return Math.round(sar * 100);
}

export function halalasToSar(halalas: number): number {
  return halalas / 100;
}

export function getPublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY ?? null;
}

export function isMoyasarConfigured(): boolean {
  return Boolean(
    process.env.MOYASAR_SECRET_KEY &&
      process.env.NEXT_PUBLIC_MOYASAR_PUBLISHABLE_KEY
  );
}
