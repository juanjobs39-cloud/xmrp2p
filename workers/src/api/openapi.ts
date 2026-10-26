/** Especificación OpenAPI de la API pública (lectura) y de las rutas firmadas de makers. */
export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "xmrp2p API",
    version: "0.1.0",
    description:
      "API pública de xmrp2p: ofertas y cotizaciones USDT → XMR para atomic swaps sin custodia. " +
      "Solo testnet mientras no exista auditoría. Las cotizaciones son indicativas; la definitiva la da el maker.",
    license: { name: "AGPL-3.0-only" },
  },
  paths: {
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
        summary: "Cotización indicativa con la mejor oferta",
        parameters: [
          { name: "network", in: "query", required: true, schema: { type: "string" } },
          { name: "usdt", in: "query", required: true, schema: { type: "string", example: "100" } },
        ],
        responses: { "200": { description: "Cotización" }, "404": { description: "Sin ofertas para ese monto" } },
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
