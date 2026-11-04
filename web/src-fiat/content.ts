/**
 * Contenido del sitio P2P Fiat (fiat.monerop2p.app): rutas, métodos de pago, países y preguntas frecuentes,
 * en español e inglés. Las cifras deben coincidir con el servidor (workers/src/api/p2p y la migración de ajustes).
 */
export type L = "es" | "en";
export const FIAT_LANGS: L[] = ["es", "en"];
export const tr = (lang: L) => (es: string, en: string) => (lang === "es" ? es : en);

/** Red de Monero del sitio: mainnet (dinero real) salvo en la beta de pruebas (PUBLIC_P2P_NET=stagenet). */
export const REAL = (import.meta.env.PUBLIC_P2P_NET ?? "mainnet") !== "stagenet";
/** Sitio principal (swaps cripto ↔ XMR). */
export const MAIN_SITE = ((import.meta.env.PUBLIC_SITE_URL as string | undefined) ?? "https://monerop2p.app").replace(/\/$/, "");
export const REPO = "https://github.com/juanjobs39-cloud/xmrp2p";

/** Cifras públicas (las mismas que devuelve /v1/p2p/config por defecto). */
export const FACTS = {
  feePct: "0.5",
  capUsd: 1000,
  maxOpenOrders: 3,
  maxActiveAds: 10,
  depositWindowMin: 30,
  payWindowMin: [15, 120] as const,
  disputeAfterMin: 15,
  confirmations: 10,
  onlineMin: 10,
};

export const ROUTES = {
  home: { es: "/es/", en: "/en/" },
  app: { es: "/es/app/", en: "/en/app/" },
  how: { es: "/es/como-funciona/", en: "/en/how-it-works/" },
  fees: { es: "/es/comisiones-y-limites/", en: "/en/fees-and-limits/" },
  safety: { es: "/es/seguridad/", en: "/en/safety/" },
  faq: { es: "/es/preguntas-frecuentes/", en: "/en/faq/" },
  methods: { es: "/es/metodos-de-pago/", en: "/en/payment-methods/" },
  countries: { es: "/es/paises/", en: "/en/countries/" },
} satisfies Record<string, Record<L, string>>;
export type RouteKey = keyof typeof ROUTES;

/** Enlace directo al mercado con filtros (la app lee estos parámetros del hash). */
export function marketLink(lang: L, o: { buy?: boolean; fiat?: string; method?: string; country?: string } = {}): string {
  const q = new URLSearchParams({ lado: o.buy === false ? "vender" : "comprar" });
  if (o.fiat) q.set("fiat", o.fiat);
  if (o.method) q.set("metodo", o.method);
  if (o.country) q.set("pais", o.country);
  return `${ROUTES.app[lang]}#/?${q}`;
}

type T2 = Record<L, string>;
export interface PayMethod {
  id: string;
  slug: T2;
  name: string;
  /** Nombre exacto en el catálogo del servidor (filtro del mercado). */
  catalog: string;
  fiat?: string;
  country?: string;
  where: T2;
  kind: "bank" | "wallet" | "cash";
  reversible: boolean;
  intro: T2;
  tips: Record<L, string[]>;
}

const pm = (id: string, esSlug: string, enSlug: string, d: Omit<PayMethod, "id" | "slug">): PayMethod => ({
  id,
  slug: { es: `comprar-monero-con-${esSlug}`, en: `buy-monero-with-${enSlug}` },
  ...d,
});

export const METHODS: PayMethod[] = [
  pm("spei", "spei", "spei", {
    name: "SPEI",
    catalog: "SPEI",
    fiat: "MXN",
    country: "MX",
    where: { es: "México", en: "Mexico" },
    kind: "bank",
    reversible: false,
    intro: {
      es: "SPEI es la transferencia bancaria inmediata de México: llega en segundos, funciona las 24 horas y no se puede revertir una vez acreditada. Por eso es el método más usado para comprar y vender Monero con pesos mexicanos.",
      en: "SPEI is Mexico's instant bank transfer: it arrives in seconds, works 24/7 and cannot be reversed once credited. That makes it the most common way to buy and sell Monero for Mexican pesos.",
    },
    tips: {
      es: [
        "Paga desde una cuenta a tu nombre: muchos vendedores rechazan pagos de terceros.",
        "Pon en el concepto solo lo que pida el vendedor; nunca escribas «Monero», «cripto» ni «XMR».",
        "Vendedor: confirma en la app de TU banco que el SPEI llegó (con su clave de rastreo) antes de liberar; una captura no basta.",
      ],
      en: [
        "Pay from an account in your own name: many sellers reject third-party payments.",
        "Use only the reference the seller asks for; never write “Monero”, “crypto” or “XMR”.",
        "Seller: confirm in YOUR banking app that the SPEI arrived (with its tracking key) before releasing; a screenshot is not enough.",
      ],
    },
  }),
  pm("oxxo", "deposito-oxxo", "oxxo-cash-deposit", {
    name: "OXXO",
    catalog: "OXXO deposit",
    fiat: "MXN",
    country: "MX",
    where: { es: "México", en: "Mexico" },
    kind: "cash",
    reversible: false,
    intro: {
      es: "Con un depósito en efectivo en OXXO puedes comprar Monero sin cuenta bancaria: el vendedor te da su número de tarjeta o de cuenta y pagas en caja. El depósito puede tardar en reflejarse, así que elige anuncios con tiempo de pago amplio.",
      en: "An OXXO cash deposit lets you buy Monero without a bank account: the seller gives you their card or account number and you pay at the till. The deposit can take a while to show up, so pick ads with a long payment window.",
    },
    tips: {
      es: ["Guarda el ticket: es tu comprobante si hay una apelación.", "OXXO cobra una comisión por depósito; pregunta en el chat quién la paga.", "Vendedor: espera a ver el depósito en tu cuenta, no en una foto del ticket."],
      en: ["Keep the receipt: it is your proof if there is an appeal.", "OXXO charges a deposit fee; agree in the chat who pays it.", "Seller: wait until the deposit shows in your account, not in a photo of the receipt."],
    },
  }),
  pm("mercadopago", "mercado-pago", "mercado-pago", {
    name: "Mercado Pago",
    catalog: "Mercado Pago",
    where: { es: "México, Argentina y más", en: "Mexico, Argentina and more" },
    kind: "wallet",
    reversible: true,
    intro: {
      es: "Mercado Pago es cómodo, pero algunos pagos se pueden desconocer o revertir después de que el vendedor libera el Monero. Por eso los anuncios con Mercado Pago suelen pedir historial de órdenes y la plataforma lo marca con ⚠.",
      en: "Mercado Pago is convenient, but some payments can be disputed or reversed after the seller releases the Monero. That is why Mercado Pago ads often require an order history, and the platform flags it with ⚠.",
    },
    tips: {
      es: ["Usa transferencia de saldo entre cuentas, no pago con tarjeta.", "Vendedor: puedes exigir un mínimo de órdenes completadas para este método.", "Nunca liberes por un «pago pendiente» o en revisión."],
      en: ["Use a balance transfer between accounts, not a card payment.", "Seller: you can require a minimum number of completed orders for this method.", "Never release on a “pending” or under-review payment."],
    },
  }),
  pm("nequi", "nequi", "nequi", {
    name: "Nequi",
    catalog: "Nequi",
    fiat: "COP",
    country: "CO",
    where: { es: "Colombia", en: "Colombia" },
    kind: "wallet",
    reversible: false,
    intro: {
      es: "Nequi es la billetera digital más usada en Colombia: los envíos entre cuentas son inmediatos y sin costo, ideal para comprar y vender Monero con pesos colombianos.",
      en: "Nequi is Colombia's most used digital wallet: transfers between accounts are instant and free, which makes it ideal to buy and sell Monero for Colombian pesos.",
    },
    tips: {
      es: ["Revisa los topes mensuales de tu cuenta Nequi antes de abrir una orden grande.", "Envía al número que el vendedor puso en la orden, no a uno que te pasen por fuera.", "Vendedor: confirma el movimiento en tu app de Nequi antes de liberar."],
      en: ["Check your Nequi monthly limits before opening a large order.", "Send to the number the seller put in the order, not one given outside the platform.", "Seller: confirm the movement in your Nequi app before releasing."],
    },
  }),
  pm("daviplata", "daviplata", "daviplata", {
    name: "Daviplata",
    catalog: "Daviplata",
    fiat: "COP",
    country: "CO",
    where: { es: "Colombia", en: "Colombia" },
    kind: "wallet",
    reversible: false,
    intro: {
      es: "Daviplata permite pagar con el número de celular en Colombia. Es una buena alternativa a Nequi para comprar o vender XMR con pesos colombianos.",
      en: "Daviplata lets you pay with a phone number in Colombia. It is a good alternative to Nequi for buying or selling XMR with Colombian pesos.",
    },
    tips: {
      es: ["Verifica que el nombre del titular coincida con el del anunciante.", "Guarda el comprobante del envío."],
      en: ["Check that the account holder's name matches the advertiser.", "Keep the transfer receipt."],
    },
  }),
  pm("bancolombia", "bancolombia", "bancolombia", {
    name: "Bancolombia",
    catalog: "Bancolombia",
    fiat: "COP",
    country: "CO",
    where: { es: "Colombia", en: "Colombia" },
    kind: "bank",
    reversible: false,
    intro: {
      es: "Las transferencias Bancolombia a Bancolombia son inmediatas. Entre bancos distintos pueden tardar más: elige anuncios con tiempo de pago suficiente.",
      en: "Bancolombia-to-Bancolombia transfers are instant. Between different banks they can take longer: pick ads with enough payment time.",
    },
    tips: {
      es: ["Usa la llave o cuenta que aparece en la orden.", "Si la transferencia queda programada para el siguiente día hábil, avísale al vendedor por el chat."],
      en: ["Use the key or account shown in the order.", "If the transfer is scheduled for the next business day, tell the seller in the chat."],
    },
  }),
  pm("pix", "pix", "pix", {
    name: "Pix",
    catalog: "Pix",
    fiat: "BRL",
    country: "BR",
    where: { es: "Brasil", en: "Brazil" },
    kind: "bank",
    reversible: false,
    intro: {
      es: "Pix es el sistema de pagos instantáneos de Brasil: llega en segundos a cualquier hora. Es la forma más rápida de comprar o vender Monero con reales brasileños.",
      en: "Pix is Brazil's instant payment system: it arrives in seconds at any time. It is the fastest way to buy or sell Monero for Brazilian reais.",
    },
    tips: {
      es: ["Copia la chave Pix desde la orden.", "El Pix tiene un mecanismo de devolución (MED) en casos de fraude: vendedor, confirma que el titular coincide."],
      en: ["Copy the Pix key from the order.", "Pix has a refund mechanism (MED) for fraud cases: seller, check that the payer's name matches."],
    },
  }),
  pm("cbu", "transferencia-cbu-cvu", "bank-transfer-argentina", {
    name: "Transferencia CBU/CVU",
    catalog: "Bank transfer (CBU/CVU)",
    fiat: "ARS",
    country: "AR",
    where: { es: "Argentina", en: "Argentina" },
    kind: "bank",
    reversible: false,
    intro: {
      es: "En Argentina las transferencias a CBU o CVU son inmediatas entre bancos y billeteras. Es la manera más común de comprar y vender Monero con pesos argentinos.",
      en: "In Argentina, transfers to a CBU or CVU are instant between banks and wallets. It is the most common way to buy and sell Monero for Argentine pesos.",
    },
    tips: {
      es: ["Revisa el alias y el nombre del titular antes de enviar.", "Vendedor: confirma en tu home banking, no con capturas."],
      en: ["Check the alias and the account holder's name before sending.", "Seller: confirm in your online banking, not with screenshots."],
    },
  }),
  pm("yape", "yape", "yape", {
    name: "Yape",
    catalog: "Yape",
    fiat: "PEN",
    country: "PE",
    where: { es: "Perú", en: "Peru" },
    kind: "wallet",
    reversible: false,
    intro: {
      es: "Yape permite enviar soles al instante con el número de celular. Es la opción más práctica para comprar Monero en Perú.",
      en: "Yape sends soles instantly with a phone number. It is the most practical option to buy Monero in Peru.",
    },
    tips: {
      es: ["Revisa tu límite diario de Yape.", "Guarda la constancia del yapeo."],
      en: ["Check your daily Yape limit.", "Keep the Yape receipt."],
    },
  }),
  pm("plin", "plin", "plin", {
    name: "Plin",
    catalog: "Plin",
    fiat: "PEN",
    country: "PE",
    where: { es: "Perú", en: "Peru" },
    kind: "wallet",
    reversible: false,
    intro: {
      es: "Plin funciona dentro de la app de varios bancos peruanos y envía soles al instante. Es una alternativa a Yape para operar con Monero.",
      en: "Plin works inside several Peruvian banking apps and sends soles instantly. It is an alternative to Yape for trading Monero.",
    },
    tips: { es: ["Confirma con el vendedor que su banco recibe Plin."], en: ["Confirm with the seller that their bank receives Plin."] },
  }),
  pm("pagomovil", "pago-movil", "pago-movil", {
    name: "Pago Móvil",
    catalog: "Pago Móvil",
    fiat: "VES",
    country: "VE",
    where: { es: "Venezuela", en: "Venezuela" },
    kind: "bank",
    reversible: false,
    intro: {
      es: "Pago Móvil es la forma más usada de pagar en Venezuela: con cédula, teléfono y banco. Monero protege tu privacidad frente a la vigilancia financiera y la inflación del bolívar.",
      en: "Pago Móvil is Venezuela's most used way to pay: with ID number, phone and bank. Monero protects your privacy from financial surveillance and from bolívar inflation.",
    },
    tips: {
      es: ["Verifica cédula, teléfono y banco del vendedor en la orden.", "El precio en bolívares cambia rápido: revisa el monto antes de pagar."],
      en: ["Check the seller's ID, phone and bank in the order.", "The bolívar price changes fast: check the amount before paying."],
    },
  }),
  pm("zelle", "zelle", "zelle", {
    name: "Zelle",
    catalog: "Zelle",
    fiat: "USD",
    country: "US",
    where: { es: "Estados Unidos", en: "United States" },
    kind: "wallet",
    reversible: false,
    intro: {
      es: "Zelle mueve dólares entre bancos de EE. UU. en minutos y no tiene contracargos como las tarjetas, pero sí hay casos de cuentas robadas: el vendedor debe revisar que el nombre coincida.",
      en: "Zelle moves dollars between US banks in minutes and has no chargebacks like cards do, but stolen accounts do happen: the seller should check that the name matches.",
    },
    tips: {
      es: ["Paga desde una cuenta a tu nombre.", "No escribas nada sobre cripto en la nota."],
      en: ["Pay from an account in your own name.", "Do not mention crypto in the memo."],
    },
  }),
  pm("sepa", "transferencia-sepa", "sepa", {
    name: "SEPA",
    catalog: "SEPA Instant",
    fiat: "EUR",
    where: { es: "zona euro", en: "the euro area" },
    kind: "bank",
    reversible: false,
    intro: {
      es: "Con una transferencia SEPA (o SEPA instantánea) puedes comprar Monero con euros desde cualquier banco de la zona euro. La instantánea llega en segundos; la normal, en uno o dos días hábiles.",
      en: "With a SEPA transfer (or SEPA Instant) you can buy Monero with euros from any bank in the euro area. Instant arrives in seconds; regular SEPA takes one or two business days.",
    },
    tips: {
      es: ["Si tu banco no tiene SEPA instantánea, elige anuncios con 120 min de pago o avisa por el chat.", "El IBAN y el nombre deben coincidir con los del anunciante."],
      en: ["If your bank has no SEPA Instant, pick ads with a 120-minute window or tell the seller in the chat.", "The IBAN and name must match the advertiser's."],
    },
  }),
  pm("revolut", "revolut", "revolut", {
    name: "Revolut",
    catalog: "Revolut",
    where: { es: "Europa y más", en: "Europe and more" },
    kind: "wallet",
    reversible: true,
    intro: {
      es: "Revolut es rápido entre usuarios, pero se considera reversible: hay disputas y bloqueos de cuenta. La plataforma lo marca con ⚠ y los vendedores pueden exigir historial.",
      en: "Revolut is fast between users but counts as reversible: there are disputes and account freezes. The platform flags it with ⚠ and sellers can require a track record.",
    },
    tips: { es: ["Usa transferencia entre usuarios (Revtag), no tarjeta."], en: ["Use a user-to-user transfer (Revtag), not a card."] },
  }),
  pm("wise", "wise", "wise", {
    name: "Wise",
    catalog: "Wise",
    where: { es: "internacional", en: "international" },
    kind: "wallet",
    reversible: false,
    intro: {
      es: "Wise permite pagar en muchas monedas con buen tipo de cambio. Sirve para comprar Monero en dólares, euros, libras y más.",
      en: "Wise lets you pay in many currencies at a good exchange rate. It works for buying Monero in dollars, euros, pounds and more.",
    },
    tips: { es: ["Elige la misma moneda del anuncio para evitar conversiones."], en: ["Use the same currency as the ad to avoid conversions."] },
  }),
  pm("paypal", "paypal", "paypal", {
    name: "PayPal",
    catalog: "PayPal",
    where: { es: "internacional", en: "international" },
    kind: "wallet",
    reversible: true,
    intro: {
      es: "PayPal es el método más riesgoso para el vendedor: un pago se puede revertir semanas después. Si vendes por PayPal, hazlo solo con compradores con historial.",
      en: "PayPal is the riskiest method for sellers: a payment can be reversed weeks later. If you sell for PayPal, do it only with buyers who have a track record.",
    },
    tips: {
      es: ["Vendedor: exige un mínimo de órdenes completadas.", "Comprador: envía como «amigos y familiares» solo si el vendedor lo pide y confías en él."],
      en: ["Seller: require a minimum number of completed orders.", "Buyer: send as “friends and family” only if the seller asks and you trust them."],
    },
  }),
  pm("cash", "efectivo", "cash", {
    name: "Efectivo en persona",
    catalog: "Cash in person",
    where: { es: "en tu ciudad", en: "in your city" },
    kind: "cash",
    reversible: false,
    intro: {
      es: "Comprar Monero con efectivo en persona es lo más privado: no hay banco de por medio. El XMR queda en el escrow mientras se ven, y el vendedor libera al recibir el dinero.",
      en: "Buying Monero with cash in person is the most private option: no bank involved. The XMR stays in escrow while you meet, and the seller releases when they get the money.",
    },
    tips: {
      es: ["Vean en un lugar público, con cámaras y de día.", "Acuerden lugar y hora en el chat de la orden.", "Vendedor: cuenta y revisa los billetes antes de liberar."],
      en: ["Meet in a public place, with cameras, in daylight.", "Agree on place and time in the order chat.", "Seller: count and check the notes before releasing."],
    },
  }),
  pm("interac", "interac", "interac", {
    name: "Interac e-Transfer",
    catalog: "Interac e-Transfer",
    fiat: "CAD",
    country: "CA",
    where: { es: "Canadá", en: "Canada" },
    kind: "bank",
    reversible: false,
    intro: {
      es: "Interac e-Transfer envía dólares canadienses entre bancos con un correo o teléfono. Es la forma habitual de comprar Monero en Canadá.",
      en: "Interac e-Transfer sends Canadian dollars between banks with an email or phone. It is the usual way to buy Monero in Canada.",
    },
    tips: { es: ["Usa la pregunta de seguridad que indique el vendedor, o depósito automático."], en: ["Use the security question the seller gives, or autodeposit."] },
  }),
  pm("upi", "upi", "upi", {
    name: "UPI",
    catalog: "UPI",
    fiat: "INR",
    country: "IN",
    where: { es: "India", en: "India" },
    kind: "bank",
    reversible: false,
    intro: {
      es: "UPI es el sistema de pagos instantáneos de la India. Permite comprar y vender Monero con rupias en segundos.",
      en: "UPI is India's instant payment system. It lets you buy and sell Monero for rupees in seconds.",
    },
    tips: { es: ["Paga al ID de UPI que aparece en la orden."], en: ["Pay the UPI ID shown in the order."] },
  }),
];

export interface Country {
  id: string;
  slug: T2;
  name: T2;
  code: string;
  fiat: string;
  fiatName: T2;
  methods: string[];
  note: T2;
}
const ct = (id: string, esSlug: string, enSlug: string, d: Omit<Country, "id" | "slug">): Country => ({
  id,
  slug: { es: `comprar-monero-en-${esSlug}`, en: `buy-monero-in-${enSlug}` },
  ...d,
});

export const COUNTRIES: Country[] = [
  ct("mx", "mexico", "mexico", {
    name: { es: "México", en: "Mexico" },
    code: "MX",
    fiat: "MXN",
    fiatName: { es: "pesos mexicanos", en: "Mexican pesos" },
    methods: ["spei", "oxxo", "mercadopago", "cash"],
    note: {
      es: "En México lo más rápido es SPEI: el pago llega en segundos y no se revierte. Sin cuenta bancaria, puedes pagar con depósito en OXXO o en efectivo en persona.",
      en: "In Mexico the fastest option is SPEI: the payment arrives in seconds and cannot be reversed. Without a bank account you can pay with an OXXO deposit or cash in person.",
    },
  }),
  ct("co", "colombia", "colombia", {
    name: { es: "Colombia", en: "Colombia" },
    code: "CO",
    fiat: "COP",
    fiatName: { es: "pesos colombianos", en: "Colombian pesos" },
    methods: ["nequi", "daviplata", "bancolombia", "cash"],
    note: {
      es: "En Colombia la mayoría paga con Nequi o Daviplata, que son inmediatos y sin costo; Bancolombia también es inmediato entre cuentas del mismo banco.",
      en: "In Colombia most people pay with Nequi or Daviplata, which are instant and free; Bancolombia is also instant between accounts at the same bank.",
    },
  }),
  ct("ar", "argentina", "argentina", {
    name: { es: "Argentina", en: "Argentina" },
    code: "AR",
    fiat: "ARS",
    fiatName: { es: "pesos argentinos", en: "Argentine pesos" },
    methods: ["cbu", "mercadopago", "cash"],
    note: {
      es: "En Argentina se usa la transferencia a CBU o CVU, inmediata entre bancos y billeteras. Mercado Pago también se usa, pero se marca como reversible.",
      en: "In Argentina people use transfers to a CBU or CVU, instant between banks and wallets. Mercado Pago is also used, but it is flagged as reversible.",
    },
  }),
  ct("pe", "peru", "peru", {
    name: { es: "Perú", en: "Peru" },
    code: "PE",
    fiat: "PEN",
    fiatName: { es: "soles", en: "soles" },
    methods: ["yape", "plin", "cash"],
    note: {
      es: "En Perú lo más práctico es Yape o Plin: envías soles al instante con el número de celular.",
      en: "In Peru the most practical options are Yape or Plin: you send soles instantly with a phone number.",
    },
  }),
  ct("ve", "venezuela", "venezuela", {
    name: { es: "Venezuela", en: "Venezuela" },
    code: "VE",
    fiat: "VES",
    fiatName: { es: "bolívares", en: "bolívars" },
    methods: ["pagomovil", "cash"],
    note: {
      es: "En Venezuela se paga con Pago Móvil. Muchos usan Monero para ahorrar fuera del bolívar con privacidad.",
      en: "In Venezuela people pay with Pago Móvil. Many use Monero to save outside the bolívar, privately.",
    },
  }),
  ct("cl", "chile", "chile", {
    name: { es: "Chile", en: "Chile" },
    code: "CL",
    fiat: "CLP",
    fiatName: { es: "pesos chilenos", en: "Chilean pesos" },
    methods: ["cash"],
    note: {
      es: "En Chile se usa la transferencia electrónica entre bancos, que suele ser inmediata. Busca anuncios con «Bank transfer» y moneda CLP.",
      en: "In Chile people use electronic bank transfers, which are usually instant. Look for ads with “Bank transfer” in CLP.",
    },
  }),
  ct("br", "brasil", "brazil", {
    name: { es: "Brasil", en: "Brazil" },
    code: "BR",
    fiat: "BRL",
    fiatName: { es: "reales", en: "reais" },
    methods: ["pix", "cash"],
    note: {
      es: "En Brasil todo se paga con Pix: llega en segundos a cualquier hora.",
      en: "In Brazil everything is paid with Pix: it arrives in seconds at any time.",
    },
  }),
  ct("es", "espana", "spain", {
    name: { es: "España", en: "Spain" },
    code: "ES",
    fiat: "EUR",
    fiatName: { es: "euros", en: "euros" },
    methods: ["sepa", "wise", "revolut", "cash"],
    note: {
      es: "En España lo habitual es la transferencia SEPA instantánea. Wise y Revolut también se usan (Revolut se marca como reversible).",
      en: "In Spain the usual method is a SEPA Instant transfer. Wise and Revolut are also used (Revolut is flagged as reversible).",
    },
  }),
  ct("us", "estados-unidos", "the-united-states", {
    name: { es: "Estados Unidos", en: "the United States" },
    code: "US",
    fiat: "USD",
    fiatName: { es: "dólares", en: "US dollars" },
    methods: ["zelle", "wise", "paypal", "cash"],
    note: {
      es: "En Estados Unidos se usa sobre todo Zelle. PayPal y Cash App se pueden revertir: los vendedores suelen pedir historial.",
      en: "In the United States Zelle is the most used. PayPal and Cash App can be reversed: sellers usually require a track record.",
    },
  }),
];

export const methodById = (id: string) => METHODS.find((m) => m.id === id)!;

/** Preguntas frecuentes (también van como FAQPage en JSON-LD). */
export function faq(lang: L): { q: string; a: string }[] {
  const t = tr(lang);
  const f = FACTS;
  return [
    {
      q: t("¿Necesito KYC, correo o teléfono?", "Do I need KYC, an email or a phone number?"),
      a: t(
        "No. Tu cuenta es una llave que se crea en tu navegador y se protege con una contraseña. Solo eliges un apodo. Descarga el archivo de respaldo: sin él y sin la contraseña no se puede recuperar la cuenta.",
        "No. Your account is a key created in your browser and protected with a password. You only choose a nickname. Download the backup file: without it and the password the account cannot be recovered.",
      ),
    },
    {
      q: t("¿Quién guarda el Monero durante la orden?", "Who holds the Monero during the order?"),
      a: t(
        "Nadie por sí solo. Al abrir la orden se crea un escrow multifirma 2 de 3 de Monero entre comprador, vendedor y árbitro. Para mover el XMR hacen falta dos de las tres llaves: normalmente vendedor y comprador al liberar; el árbitro solo interviene si hay una apelación.",
        "Nobody on their own. When the order opens, a 2-of-3 Monero multisig escrow is created between buyer, seller and arbiter. Moving the XMR needs two of the three keys: normally seller and buyer on release; the arbiter only steps in if there is an appeal.",
      ),
    },
    {
      q: t("¿Cuánto cuesta?", "How much does it cost?"),
      a: t(
        `Para quien compra, nada. Quien vende paga ${f.feePct}% del monto en XMR, más la comisión de la red de Monero (centavos). El precio lo pone cada anunciante, normalmente como un porcentaje sobre el precio de mercado.`,
        `Buying is free. The seller pays ${f.feePct}% of the amount in XMR, plus the Monero network fee (cents). Each advertiser sets their own price, usually as a percentage over the market price.`,
      ),
    },
    {
      q: t("¿Cuánto puedo comprar o vender?", "How much can I buy or sell?"),
      a: t(
        `Hasta el equivalente de ${f.capUsd} USD por orden y ${f.maxOpenOrders} órdenes abiertas a la vez. Cada anuncio tiene además su propio mínimo y máximo.`,
        `Up to the equivalent of ${f.capUsd} USD per order and ${f.maxOpenOrders} open orders at a time. Each ad also has its own minimum and maximum.`,
      ),
    },
    {
      q: t("¿Cuándo pago? ¿Y si el vendedor no deposita?", "When do I pay? What if the seller does not deposit?"),
      a: t(
        `Pagas solo cuando la app dice que el XMR ya está bloqueado en el escrow (tras ${f.confirmations} confirmaciones, unos 20 minutos). Si el vendedor no deposita en ${f.depositWindowMin} minutos, la orden se cancela sola y tú no perdiste nada. Un vendedor que deja vencer 2 depósitos en 24 horas queda con sus anuncios en pausa.`,
        `You pay only when the app says the XMR is locked in the escrow (after ${f.confirmations} confirmations, about 20 minutes). If the seller does not deposit within ${f.depositWindowMin} minutes, the order cancels itself and you lose nothing. A seller who misses 2 deposits in 24 hours gets their ads paused.`,
      ),
    },
    {
      q: t("Pagué y el vendedor no libera, ¿qué hago?", "I paid and the seller does not release. What do I do?"),
      a: t(
        `A los ${f.disputeAfterMin} minutos de marcar «Ya pagué» puedes abrir una apelación. Soporte revisa el chat y los comprobantes y firma con su llave y la tuya para enviarte el XMR, o con la del vendedor para devolvérselo si no hubo pago.`,
        `${f.disputeAfterMin} minutes after marking “I have paid” you can open an appeal. Support reviews the chat and the proofs and signs with its key and yours to send you the XMR, or with the seller's to return it if there was no payment.`,
      ),
    },
    {
      q: t("¿Y si el comprador no paga?", "What if the buyer does not pay?"),
      a: t(
        `Cada anuncio fija un tiempo para pagar (entre ${f.payWindowMin[0]} y ${f.payWindowMin[1]} minutos). Si vence sin que el comprador marque el pago, el XMR vuelve al vendedor.`,
        `Each ad sets a payment window (between ${f.payWindowMin[0]} and ${f.payWindowMin[1]} minutes). If it expires without the buyer marking the payment, the XMR goes back to the seller.`,
      ),
    },
    {
      q: t("¿Necesito una wallet de Monero?", "Do I need a Monero wallet?"),
      a: t(
        "Sí. Quien compra pone la dirección donde recibirá el XMR; quien vende deposita desde su wallet y pone una dirección para reembolsos. Sirven Feather, Cake Wallet, Monero GUI o cualquier wallet de Monero.",
        "Yes. Buyers enter the address where they will receive the XMR; sellers deposit from their wallet and enter a refund address. Feather, Cake Wallet, Monero GUI or any Monero wallet will do.",
      ),
    },
    {
      q: t("¿Por qué algunos métodos tienen ⚠?", "Why do some methods show ⚠?"),
      a: t(
        "Porque el pago se puede revertir después de que el vendedor libera (PayPal, Mercado Pago, Revolut, tarjetas). El Monero no se puede revertir, así que el vendedor corre el riesgo. Los vendedores pueden exigir un mínimo de órdenes completadas para esos métodos.",
        "Because the payment can be reversed after the seller releases (PayPal, Mercado Pago, Revolut, cards). Monero cannot be reversed, so the seller bears the risk. Sellers can require a minimum number of completed orders for those methods.",
      ),
    },
    {
      q: t("¿Por qué no puedo tomar algunos anuncios?", "Why can't I take some ads?"),
      a: t(
        `Porque el anunciante no está en línea. Solo se pueden tomar anuncios de quien estuvo activo en los últimos ${f.onlineMin} minutos, para que la orden no se quede esperando.`,
        `Because the advertiser is not online. You can only take ads from people active in the last ${f.onlineMin} minutes, so the order does not get stuck waiting.`,
      ),
    },
    {
      q: t("¿Por qué el chat está cerrado al abrir la orden?", "Why is the chat closed when the order opens?"),
      a: t(
        "Para protegerte. El chat se abre cuando el XMR del vendedor ya está bloqueado en el escrow; antes nadie puede escribirte ni mandarte datos de pago. Si alguien te pide pagar antes, por la plataforma o por otro medio, es una estafa.",
        "To protect you. The chat opens once the seller's XMR is locked in the escrow; before that nobody can message you or send payment details. If anyone asks you to pay earlier, on the platform or elsewhere, it is a scam.",
      ),
    },
    {
      q: t("Vendedor: ¿y si deposito de más?", "Seller: what if I deposit too much?"),
      a: t(
        "Se te devuelve automáticamente. Al cerrar la orden, lo que sobre en el escrow (un depósito de más o la reserva para la red que no se usó) va a tu dirección de reembolso en la misma transacción del pago.",
        "It is returned to you automatically. When the order closes, whatever is left in the escrow (an overpayment or the unused network reserve) goes to your refund address in the same payout transaction.",
      ),
    },
    {
      q: t("Vendedor: ¿y si deposito de menos?", "Seller: what if I deposit too little?"),
      a: t(
        "La orden se cancela sola. Al completar las confirmaciones, si el total en el escrow no cubre el monto, la comisión y la reserva para la red, se te devuelve todo (menos la comisión de red) a tu dirección de reembolso y el monto vuelve a tu anuncio, pero cuenta como orden cancelada por ti. El comprador nunca ve tus datos de pago, así que no paga. Si notas que te faltó, manda la diferencia a la misma dirección antes de que termine la ventana de depósito y se suma. No envíes cantidades minúsculas: un depósito de 0.0001 XMR o menos no alcanza para pagar su propio reembolso.",
        "The order is cancelled automatically. Once the confirmations are in, if the escrow total does not cover the amount, the fee and the network reserve, everything is returned (minus the network fee) to your refund address and the amount goes back to your ad, but it counts as an order you cancelled. The buyer never sees your payment details, so they do not pay. If you notice you sent too little, send the difference to the same address before the deposit window ends and it is added up. Do not send tiny amounts: a deposit of 0.0001 XMR or less cannot cover its own refund.",
      ),
    },
    {
      q: t("¿Quién ve el chat?", "Who can read the chat?"),
      a: t(
        "El chat está cifrado de punta a punta entre comprador, vendedor y soporte. Soporte puede leerlo solo para resolver apelaciones.",
        "The chat is end-to-end encrypted between buyer, seller and support. Support can read it only to resolve appeals.",
      ),
    },
    {
      q: t("¿Es legal?", "Is it legal?"),
      a: t(
        "Depende de tu país. Tú eres responsable de cumplir sus leyes, incluidos los impuestos. Las transacciones de cripto son irreversibles y el precio es volátil.",
        "It depends on your country. You are responsible for complying with its laws, including taxes. Crypto transactions are irreversible and the price is volatile.",
      ),
    },
  ];
}

/** Todas las páginas indexables, agrupadas por equivalentes es/en (sitemap y llms.txt). */
export function pageGroups(): { kind: "info" | "method" | "country"; urls: Record<L, string>; name: Record<L, string> }[] {
  const info: [RouteKey, string, string][] = [
    ["home", "Comprar y vender Monero P2P", "Buy and sell Monero P2P"],
    ["app", "Mercado P2P (app)", "P2P market (app)"],
    ["how", "Cómo funciona", "How it works"],
    ["fees", "Comisiones y límites", "Fees and limits"],
    ["safety", "Seguridad y estafas comunes", "Safety and common scams"],
    ["faq", "Preguntas frecuentes", "FAQ"],
    ["methods", "Métodos de pago", "Payment methods"],
    ["countries", "Países", "Countries"],
  ];
  return [
    ...info.map(([k, es, en]) => ({ kind: "info" as const, urls: ROUTES[k], name: { es, en } })),
    ...METHODS.map((m) => ({
      kind: "method" as const,
      urls: { es: `/es/${m.slug.es}/`, en: `/en/${m.slug.en}/` },
      name: { es: `Comprar Monero con ${m.name}`, en: `Buy Monero with ${m.name}` },
    })),
    ...COUNTRIES.map((c) => ({
      kind: "country" as const,
      urls: { es: `/es/${c.slug.es}/`, en: `/en/${c.slug.en}/` },
      name: { es: `Comprar Monero en ${c.name.es}`, en: `Buy Monero in ${c.name.en}` },
    })),
  ];
}
