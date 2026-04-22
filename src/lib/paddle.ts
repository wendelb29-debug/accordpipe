import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

let paddleInitialized = false;

export function getPaymentsEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

export async function initializePaddle(): Promise<void> {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN não configurado");

  await new Promise<void>((resolve, reject) => {
    if (window.Paddle) return resolve();
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Paddle.js"));
    document.head.appendChild(script);
  });

  const env = clientToken.startsWith("test_") ? "sandbox" : "production";
  window.Paddle.Environment.set(env);
  window.Paddle.Initialize({ token: clientToken });
  paddleInitialized = true;
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaymentsEnvironment();
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId) {
    throw new Error(`Não foi possível resolver price: ${priceId}`);
  }
  return data.paddleId as string;
}
