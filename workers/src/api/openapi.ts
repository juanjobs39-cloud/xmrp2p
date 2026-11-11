/** Especificación OpenAPI de la API pública (lectura) y de las rutas firmadas de makers. */
export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "MoneroP2P API",
    version: "1.0.0",
    description:
      "Public read-only API of MoneroP2P (https://monerop2p.app): live offers and quotes for non-custodial USDT → XMR atomic swaps on Arbitrum One, " +
      "a reference XMR price, and the P2P Fiat market (price per currency and live ads, served from https://fiat.monerop2p.app). " +
      "Live with real money since 2026-10-26; atomic swaps are capped at 100 USDT by the contract and there is no external audit yet. " +
      "Quotes are indicative: the maker gives the final amount when the swap starts. No key needed; CORS enabled. " +
      "What can be verified and the project's limits: https://monerop2p.app/en/is-monerop2p-legit/",
    contact: { name: "MoneroP2P", url: "https://github.com/juanjobs39-cloud/xmrp2p" },
    license: { name: "AGPL-3.0-only" },
  },
  paths: {
    "/v1/p2p/price": {
      servers: [{ url: "https://fiat.monerop2p.app", description: "P2P Fiat" }],
      get: {
        summary: "P2P Fiat: market price of XMR in a currency (median of several exchanges, converted with daily FX rates)",
        parameters: [{ name: "fiat", in: "query", required: true, description: "ISO 4217 code", schema: { type: "string", example: "MXN" } }],
        responses: { "200": { description: "{ fiat, price, usd, rate, sources, at }" } },
      },
    },
    "/v1/p2p/ads": {
      servers: [{ url: "https://fiat.monerop2p.app", description: "P2P Fiat" }],
      get: {
        summary: "P2P Fiat: live ads. side=sell lists XMR for sale (where you can buy); side=buy lists buyers",
        parameters: [
          { name: "side", in: "query", required: true, schema: { type: "string", enum: ["sell", "buy"] } },
          { name: "fiat", in: "query", required: true, description: "ISO 4217 code", schema: { type: "string", example: "MXN" } },
          { name: "method", in: "query", required: false, description: "Payment method name", schema: { type: "string", example: "SPEI" } },
          { name: "country", in: "query", required: false, description: "ISO 3166-1 alpha-2", schema: { type: "string", example: "MX" } },
          { name: "amount", in: "query", required: false, description: "Amount in the fiat currency", schema: { type: "string", example: "500" } },
          { name: "online", in: "query", required: false, description: "1 = only advertisers online now", schema: { type: "string", enum: ["1"] } },
        ],
        responses: { "200": { description: "Ads with price, min_fiat, max_fiat, available_xmr, methods, pay_window_min and the advertiser's public stats" } },
      },
    },
    "/v1/p2p/fiats": { servers: [{ url: "https://fiat.monerop2p.app", description: "P2P Fiat" }], get: { summary: "P2P Fiat: supported currencies", responses: { "200": { description: "List of currencies" } } } },
    "/v1/p2p/methods": {
      servers: [{ url: "https://fiat.monerop2p.app", description: "P2P Fiat" }],
      get: {
        summary: "P2P Fiat: suggested payment methods for a currency",
        parameters: [{ name: "fiat", in: "query", required: true, schema: { type: "string", example: "COP" } }],
        responses: { "200": { description: "List of methods" } },
      },
    },
    "/v1/p2p/config": { servers: [{ url: "https://fiat.monerop2p.app", description: "P2P Fiat" }], get: { summary: "P2P Fiat: platform settings (fee, limits, windows)", responses: { "200": { description: "Settings" } } } },
    "/v1/health": { get: { summary: "Estado del servicio", responses: { "200": { description: "OK" } } } },
    "/v1/networks": { get: { summary: "Redes activas", responses: { "200": { description: "Lista de redes" } } } },
    "/v1/offers": {
      get: {
        summary: "Ofertas vigentes en una red, de menor a mayor precio",
        parameters: [{ name: "network", in: "query", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Ofertas", content: { "application/json": { schema: { $ref: "#/components/schemas/Offers" } } } } },
      },
      put: {
        summary: "Publicar o renovar la oferta del maker (firmada)",
        security: [{ makerSignature: [] }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/OfferInput" } } } },
        responses: { "200": { description: "Oferta guardada" }, "401": { description: "Firma inválida" } },
      },
      delete: { summary: "Retirar la oferta del maker (firmada)", security: [{ makerSignature: [] }], responses: { "200": { description: "Retirada" } } },
    },
    "/v1/quote": {
      get: {
        summary: "Best quote for an amount in USDT or XMR, with available limits and a deep link to finish the swap in the app (for aggregators)",
        parameters: [
          { name: "network", in: "query", required: true, schema: { type: "string", enum: ["arbitrum_one", "arbitrum_sepolia"] } },
          { name: "usdt", in: "query", required: false, description: "Amount to pay in USDT (use usdt or xmr)", schema: { type: "string", example: "50" } },
          { name: "xmr", in: "query", required: false, description: "Amount to receive in XMR (use usdt or xmr)", schema: { type: "string", example: "0.08" } },
          { name: "ref", in: "query", required: false, description: "Referrer id added to app_url (letters, digits, - and _, up to 32)", schema: { type: "string", example: "trocador" } },
        ],
        responses: {
          "200": { description: "{ network, usdt, xmr, price, offer_id, maker, expires_at, buyer_fee, eta_minutes, app_url, limits: { min_usdt, max_usdt } }" },
          "404": { description: "No offer covers that amount: { error, limits }" },
        },
      },
    },
    "/v1/swaps": {
      post: {
        summary: "Iniciar un swap con una oferta (lo usa la app del taker)",
        responses: { "201": { description: "Sala creada y respuesta del maker" }, "409": { description: "El maker rechazó" }, "503": { description: "Maker desconectado" } },
      },
    },
    "/v1/price": {
      get: {
        summary: "Precio de referencia XMR/USDT (mediana de Kraken, KuCoin, MEXC, HTX y CoinGecko; mínimo 2 fuentes; caché de 60 s)",
        responses: { "200": { description: "{ price, sources, at }" }, "503": { description: "Fuentes insuficientes o divergentes" } },
      },
    },
    "/v1/makers/ws-ticket": {
      post: {
        summary: "Ticket de un solo uso (60 s) para abrir el buzón del maker desde un navegador: wss://…/v1/makers/inbox?maker=…&ticket=…",
        security: [{ makerSignature: [] }],
        responses: { "200": { description: "{ ticket, expires_in }" }, "401": { description: "Firma inválida" } },
      },
    },
    "/v1/swaps/{room}/events": { get: { summary: "Mensajes de la sala (token del taker)", responses: { "200": { description: "Mensajes" } } } },
    "/mcp": { post: { summary: "Servidor MCP de solo lectura (JSON-RPC 2.0)", responses: { "200": { description: "Respuesta JSON-RPC" } } } },
  },
  components: {
    securitySchemes: {
      makerSignature: {
        type: "apiKey",
        in: "header",
        name: "X-Signature",
        description:
          "Firma EIP-191 de `xmrp2p|<MÉTODO>|<ruta>|<dirección>|<timestamp>|<sha256(cuerpo)>`, con cabeceras X-Maker-Address y X-Timestamp.",
      },
    },
    schemas: {
      Offer: {
        type: "object",
        properties: {
          id: { type: "string" },
          maker: { type: "string" },
          network: { type: "string" },
          price: { type: "string", description: "USDT por XMR" },
          min_usdt: { type: "string" },
          max_usdt: { type: "string" },
          max_xmr: { type: "string" },
          expires_at: { type: "integer" },
        },
      },
      Offers: { type: "object", properties: { network: { type: "string" }, offers: { type: "array", items: { $ref: "#/components/schemas/Offer" } } } },
      OfferInput: {
        type: "object",
        required: ["network", "price", "min_usdt", "max_usdt", "max_xmr"],
        properties: {
          network: { type: "string" },
          price: { type: "string" },
          min_usdt: { type: "string" },
          max_usdt: { type: "string" },
          max_xmr: { type: "string" },
          ttl: { type: "integer", description: "segundos (máximo MAX_OFFER_TTL)" },
        },
      },
    },
  },
} as const;
