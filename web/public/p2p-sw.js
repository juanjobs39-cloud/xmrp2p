/*
 * Service worker de P2P Fiat: solo para los avisos push. No guarda caché ni intercepta peticiones.
 * El aviso llega vacío desde el servidor (sin montos ni datos de la orden), así que el texto es fijo.
 */
const params = new URL(self.location.href).searchParams;
const app = /^\/[a-z]{2}\/app\/$/.test(params.get("app") || "") ? params.get("app") : "/en/app/";
const es = app.startsWith("/es/");
const pt = app.startsWith("/pt/");
const ru = app.startsWith("/ru/");
const TEXT = es
  ? ["MoneroP2P Fiat", "Tienes novedades en tus órdenes. Ábrelas para ver qué toca."]
  : pt
    ? ["MoneroP2P Fiat", "Há novidades nas suas ordens. Abra para ver o que fazer."]
    : ru
      ? ["MoneroP2P Fiat", "В ваших ордерах есть новости. Откройте, чтобы узнать, что делать."]
      : ["MoneroP2P Fiat", "There is news on your orders. Open them to see what's next."];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  e.waitUntil(
    self.registration.showNotification(TEXT[0], {
      body: TEXT[1],
      icon: "/favicon-192.png",
      badge: "/favicon-96.png",
      tag: "p2p-orders",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(app + "#/ordenes", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => new URL(c.url).pathname === app);
      if (open) return open.focus();
      return self.clients.openWindow(url);
    }),
  );
});
