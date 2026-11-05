// Montos en piconero (1 XMR = 10^12 piconero) con bigint: nunca números de coma flotante.
export const PICO = 1_000_000_000_000n;

/** "1.5" → 1500000000000n. Acepta coma o punto decimal. Lanza un error si no es válido. */
export function parseXmr(input: string): bigint {
  const s = input.trim().replace(",", ".");
  if (!/^\d{0,9}(\.\d{0,12})?$/.test(s) || s === "" || s === ".") throw new Error("monto inválido");
  const [int, frac = ""] = s.split(".");
  const v = BigInt(int || "0") * PICO + BigInt((frac + "000000000000").slice(0, 12));
  if (v <= 0n) throw new Error("el monto debe ser mayor que cero");
  return v;
}

/** 1500000000000n → "1.5". `decimals` recorta (sin redondear hacia arriba). */
export function formatXmr(pico: bigint | string | number, decimals = 12): string {
  const v = BigInt(pico);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const int = abs / PICO;
  let frac = (abs % PICO).toString().padStart(12, "0").slice(0, decimals).replace(/0+$/, "");
  return `${neg ? "-" : ""}${int}${frac ? "." + frac : ""}`;
}
