/**
 * La app abierta como Mini App de Telegram (botones del bot @MoneroP2PFiatBot).
 *
 * No se carga el script de telegram.org (la política de privacidad promete cero scripts de terceros): se
 * usa el puente que el propio Telegram pone en su navegador. Telegram pasa sus datos de inicio (usuario
 * de Telegram, tema) en el # de la URL; aquí se borran al arrancar y nunca se mandan al servidor. La ruta
 * de la app llega en ?r= (por ejemplo ?r=orden/<id>) porque el # lo ocupa Telegram.
 */

type Win = Window & {
  TelegramWebviewProxy?: { postEvent(type: string, data: string): void };
  external?: { notify?(data: string): void };
};

let active = false;

export const inTelegram = () => active;

function post(type: string, data: Record<string, unknown> = {}) {
  const w = window as Win;
  try {
    if (w.TelegramWebviewProxy) w.TelegramWebviewProxy.postEvent(type, JSON.stringify(data));
    else if (typeof w.external?.notify === "function") w.external.notify(JSON.stringify({ eventType: type, eventData: data }));
    else if (window.parent !== window) window.parent.postMessage(JSON.stringify({ eventType: type, eventData: data }), "https://web.telegram.org");
  } catch {
    /* fuera de Telegram */
  }
}

/** Detecta Telegram, limpia sus datos de la URL y pasa la ruta de ?r= al #. Llamar antes de enrutar. */
export function initTelegram(): void {
  const q = new URLSearchParams(location.search);
  const fromHash = /(^#|&)tgWebApp(Data|Version|Platform)=/.test(location.hash);
  let remembered = false;
  try {
    remembered = sessionStorage.getItem("p2p-tg") === "1";
  } catch {
    /* sin almacenamiento */
  }
  active = q.get("tg") === "1" || fromHash || remembered;
  if (!active) return;
  try {
    sessionStorage.setItem("p2p-tg", "1");
  } catch {
    /* sin almacenamiento */
  }
  const r = q.get("r");
  const route = r && /^[a-z]+(\/[0-9a-f]{32})?$/.test(r) ? `#/${r}` : fromHash ? "" : location.hash;
  if (q.has("tg") || q.has("r") || fromHash) history.replaceState(null, "", location.pathname + route);
  document.documentElement.classList.add("in-tg");
  post("web_app_ready");
  post("web_app_expand");
}

let confirmOn = false;
/** Pide confirmación al cerrar la Mini App mientras el navegador firma un escrow. */
export function closingConfirmation(on: boolean): void {
  if (!active || on === confirmOn) return;
  confirmOn = on;
  post("web_app_setup_closing_behavior", { need_confirmation: on });
}
