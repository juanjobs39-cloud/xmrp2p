// Proceso de fondo: solo controla el bloqueo automático. No tiene llaves ni toca la red.
// La llave de sesión vive en chrome.storage.session (memoria) y aquí solo se BORRA.
const ALARM = "autolock";

async function minutes(): Promise<number> {
  const { settings } = await chrome.storage.local.get("settings");
  const m = Number((settings as { autolockMin?: number } | undefined)?.autolockMin ?? 15);
  return Number.isFinite(m) && m >= 1 && m <= 240 ? m : 15;
}

async function lock(): Promise<void> {
  await chrome.storage.session.remove(["sessionKey", "lastActive"]);
  await chrome.alarms.clear(ALARM);
}

// Solo nuestras propias páginas pueden hablar con el fondo; nada de mensajes externos.
chrome.runtime.onMessage.addListener((msg: { type?: string }, sender, reply) => {
  if (sender.id !== chrome.runtime.id || (sender.url && !sender.url.startsWith(chrome.runtime.getURL("")))) return;
  void (async () => {
    if (msg?.type === "touch") {
      await chrome.storage.session.set({ lastActive: Date.now() });
      await chrome.alarms.create(ALARM, { delayInMinutes: await minutes() });
    } else if (msg?.type === "lock") {
      await lock();
    }
    reply({ ok: true });
  })();
  return true;
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM) void lock();
});

// Al abrir el navegador, empezar bloqueada (session ya se vacía, esto es por si acaso).
chrome.runtime.onStartup.addListener(() => void lock());

// Al instalar, abrir la bienvenida en una pestaña: crear la wallet y anotar la semilla es más
// cómodo y seguro en una página completa que en el popup (que se cierra al perder el foco).
chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === "install") void chrome.tabs.create({ url: chrome.runtime.getURL("popup.html?view=tab") });
});
