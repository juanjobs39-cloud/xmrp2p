/**
 * Anuncio oficial «Verificado · Garantizado» del mercado: compra y venta de XMR contra USDC (o
 * cualquier cripto de la lista) con el mismo motor del exchange (Trocador), pero con la forma de una
 * orden P2P: panel para tomar el anuncio, orden en #/oficial/<id> con pasos, contador del plazo para
 * depositar y estado, y entrada en «Órdenes». Lo comprado llega siempre a las wallets de la cuenta.
 *
 * Textos en los 7 idiomas del sitio (el resto de la app P2P solo tiene es/en).
 */
import type { TrocadorCoin, TrocadorQuote, TrocadorRates, TrocadorTrade } from "../app/api";
import { COINS, iconEl } from "../app/coins";
import { API_URL, NETWORKS, type EvmNetwork } from "../app/config";
import { xmrLib } from "../app/libs";
import { signed } from "./api";
import { signAddress } from "./pay";
import type { P2PApp } from "./p2p-app";
import { qrSvg } from "./qr";
import { autoDeposit, DECIMALS, isFinal, planSwap, upsertSwap, type Internal, type Leg, type SwapPlan, type SwapRecord } from "./swap";
import { evmAsset } from "./swap-view";
import { clock, h, icon, kids, nowS, type Child } from "./ui";
import { balances, prepareEvm, publicClient, sendEvm } from "./wallet-evm";
import { copyButton, evmError, kv, persistXmr, retryXmr, startXmr, WALLETS_ON, xmrError, xmrReady, XMR_EXPLORER } from "./wallet-view";
import { evmAddress, evmKey, formatAmount, moneroSpendKey, parseAmount } from "./wallets";

// ---------------------------------------------------------------- idiomas
const LANGS = ["es", "en", "pt", "ru", "de", "fr", "it"] as const;
type Row = readonly [string, string, string, string, string, string, string];
const TXT = {
  buyTitle: [
    "Compra XMR pagando con USDC",
    "Buy XMR paying with USDC",
    "Compre XMR pagando com USDC",
    "Купите XMR, оплатив USDC",
    "Kaufe XMR und zahle mit USDC",
    "Achète du XMR en payant en USDC",
    "Compra XMR pagando con USDC",
  ],
  sellTitle: [
    "Vende XMR y recibe USDC",
    "Sell XMR and get USDC",
    "Venda XMR e receba USDC",
    "Продайте XMR и получите USDC",
    "Verkaufe XMR und erhalte USDC",
    "Vends du XMR et reçois des USDC",
    "Vendi XMR e ricevi USDC",
  ],
  verified: ["Verificado · Garantizado", "Verified · Guaranteed", "Verificado · Garantido", "Проверено · Гарантировано", "Verifiziert · Garantiert", "Vérifié · Garanti", "Verificato · Garantito"],
  officialTip: [
    "Anuncio oficial de la plataforma",
    "Official platform listing",
    "Anúncio oficial da plataforma",
    "Официальное объявление платформы",
    "Offizielles Angebot der Plattform",
    "Annonce officielle de la plateforme",
    "Annuncio ufficiale della piattaforma",
  ],
  live: ["En vivo", "Live", "Ao vivo", "Онлайн", "Live", "En direct", "In tempo reale"],
  best: [
    "Mejor de hasta 14 exchanges",
    "Best of up to 14 exchanges",
    "Melhor de até 14 exchanges",
    "Лучший из 14 обменников",
    "Bester von bis zu 14 Börsen",
    "Le meilleur de 14 plateformes",
    "Il migliore di 14 exchange",
  ],
  limit: ["Límite", "Limit", "Limite", "Лимит", "Limit", "Limite", "Limite"],
  noMax: ["Sin máximo", "No maximum", "Sem máximo", "Без максимума", "Kein Maximum", "Sans maximum", "Nessun massimo"],
  time: ["Tiempo", "Time", "Tempo", "Время", "Dauer", "Durée", "Tempo"],
  getIn: ["Recibes en", "You get it in", "Você recebe em", "Получаете в", "Du erhältst es in", "Tu reçois dans", "Ricevi nel"],
  platWallet: [
    "tu wallet de la plataforma",
    "your platform wallet",
    "sua carteira da plataforma",
    "кошелёк на платформе",
    "deiner Plattform-Wallet",
    "ton portefeuille de la plateforme",
    "wallet della piattaforma",
  ],
  btnBuy: ["Comprar con USDC", "Buy with USDC", "Comprar com USDC", "Купить за USDC", "Mit USDC kaufen", "Acheter en USDC", "Compra con USDC"],
  btnSell: ["Vender por USDC", "Sell for USDC", "Vender por USDC", "Продать за USDC", "Gegen USDC verkaufen", "Vendre contre USDC", "Vendi per USDC"],
  btnStart: [
    "Crear cuenta y empezar",
    "Create account and start",
    "Criar conta e começar",
    "Создать аккаунт и начать",
    "Konto erstellen und loslegen",
    "Créer un compte et commencer",
    "Crea un account e inizia",
  ],
  yourWallet: ["tu wallet", "your wallet", "sua carteira", "ваш кошелёк", "deine Wallet", "ton portefeuille", "il tuo wallet"],
  netLabel: ["Red de USDC", "USDC network", "Rede do USDC", "Сеть USDC", "USDC-Netzwerk", "Réseau USDC", "Rete USDC"],
  guarTitle: ["Garantía MoneroP2P", "MoneroP2P guarantee", "Garantia MoneroP2P", "Гарантия MoneroP2P", "MoneroP2P-Garantie", "Garantie MoneroP2P", "Garanzia MoneroP2P"],
  guarText: [
    "si no recibes lo que compraste y el exchange no te reembolsa, MoneroP2P te devuelve tu pago.",
    "if you don't receive what you bought and the exchange doesn't refund you, MoneroP2P pays you back.",
    "se você não receber o que comprou e a exchange não reembolsar, a MoneroP2P devolve seu pagamento.",
    "если вы не получили купленное и обменник не вернул средства, MoneroP2P вернёт ваш платёж.",
    "Wenn du nicht erhältst, was du gekauft hast, und die Börse nicht erstattet, zahlt dir MoneroP2P dein Geld zurück.",
    "si tu ne reçois pas ce que tu as acheté et que la plateforme ne te rembourse pas, MoneroP2P te rembourse.",
    "se non ricevi ciò che hai comprato e l'exchange non ti rimborsa, MoneroP2P ti restituisce il pagamento.",
  ],
  contact: [
    "Escríbenos con el ID del intercambio",
    "Contact us with the swap ID",
    "Fale conosco com o ID da troca",
    "Напишите нам с ID обмена",
    "Schreib uns mit der Tausch-ID",
    "Écris-nous avec l'identifiant de l'échange",
    "Scrivici con l'ID dello scambio",
  ],
  buyXmr: ["Comprar XMR", "Buy XMR", "Comprar XMR", "Купить XMR", "XMR kaufen", "Acheter du XMR", "Compra XMR"],
  sellXmr: ["Vender XMR", "Sell XMR", "Vender XMR", "Продать XMR", "XMR verkaufen", "Vendre du XMR", "Vendi XMR"],
  payWith: ["Pagas con", "You pay with", "Você paga com", "Вы платите", "Du zahlst mit", "Tu paies avec", "Paghi con"],
  youSell: ["Vendes", "You sell", "Você vende", "Вы продаёте", "Du verkaufst", "Tu vends", "Vendi"],
  youReceive: ["Recibes", "You receive", "Você recebe", "Вы получаете", "Du erhältst", "Tu reçois", "Ricevi"],
  otherCrypto: ["Otras criptos", "Other crypto", "Outras criptos", "Другие криптовалюты", "Andere Kryptos", "Autres cryptos", "Altre cripto"],
  amountIn: ["Monto en {0}", "Amount in {0}", "Valor em {0}", "Сумма в {0}", "Betrag in {0}", "Montant en {0}", "Importo in {0}"],
  max: ["Máx.", "Max", "Máx.", "Макс.", "Max.", "Max", "Max"],
  approx: ["Recibirás ≈ {0}", "You'll get ≈ {0}", "Você receberá ≈ {0}", "Вы получите ≈ {0}", "Du erhältst ≈ {0}", "Tu recevras ≈ {0}", "Riceverai ≈ {0}"],
  quoting: [
    "Buscando el mejor precio…",
    "Finding the best price…",
    "Buscando o melhor preço…",
    "Ищем лучшую цену…",
    "Bester Preis wird gesucht…",
    "Recherche du meilleur prix…",
    "Cerco il prezzo migliore…",
  ],
  typeAmount: [
    "Escribe un monto para ver el precio.",
    "Enter an amount to see the price.",
    "Digite um valor para ver o preço.",
    "Введите сумму, чтобы увидеть цену.",
    "Gib einen Betrag ein, um den Preis zu sehen.",
    "Saisis un montant pour voir le prix.",
    "Inserisci un importo per vedere il prezzo.",
  ],
  noQuote: [
    "Ningún exchange cotizó ese monto. Prueba con otro.",
    "No exchange quoted that amount. Try another.",
    "Nenhuma exchange cotou esse valor. Tente outro.",
    "Ни один обменник не дал цену на эту сумму. Попробуйте другую.",
    "Keine Börse hat für diesen Betrag ein Angebot. Versuch einen anderen.",
    "Aucune plateforme n'a coté ce montant. Essaie un autre.",
    "Nessun exchange ha quotato questo importo. Provane un altro.",
  ],
  badAmount: [
    "Escribe un monto válido.",
    "Enter a valid amount.",
    "Digite um valor válido.",
    "Введите корректную сумму.",
    "Gib einen gültigen Betrag ein.",
    "Saisis un montant valide.",
    "Inserisci un importo valido.",
  ],
  exchange: ["Casa de cambio", "Exchange", "Exchange", "Обменник", "Börse", "Plateforme", "Exchange"],
  fixed: ["precio fijo", "fixed rate", "preço fixo", "фиксированный курс", "Festkurs", "taux fixe", "tasso fisso"],
  float: ["precio flotante", "floating rate", "preço flutuante", "плавающий курс", "variabler Kurs", "taux variable", "tasso variabile"],
  eta: ["Tiempo estimado", "Estimated time", "Tempo estimado", "Примерное время", "Geschätzte Dauer", "Durée estimée", "Tempo stimato"],
  depTime: ["Tiempo para depositar", "Time to deposit", "Tempo para depositar", "Время на депозит", "Zeit für die Einzahlung", "Délai pour déposer", "Tempo per depositare"],
  depTimeVal: [
    "~30 min (el plazo exacto sale en la orden)",
    "~30 min (exact deadline shown in the order)",
    "~30 min (o prazo exato aparece na ordem)",
    "~30 мин (точный срок — в ордере)",
    "~30 Min. (genaue Frist in der Order)",
    "~30 min (délai exact dans l'ordre)",
    "~30 min (scadenza esatta nell'ordine)",
  ],
  dest: ["Dirección donde recibes", "Address where you receive", "Endereço onde você recebe", "Адрес для получения", "Empfangsadresse", "Adresse de réception", "Indirizzo dove ricevi"],
  destHint: [
    "La plataforma no tiene wallet para esta moneda: revisa que la dirección sea de esa red.",
    "The platform has no wallet for this coin: check the address is on that network.",
    "A plataforma não tem carteira para esta moeda: confira se o endereço é dessa rede.",
    "На платформе нет кошелька для этой монеты: проверьте, что адрес из этой сети.",
    "Für diese Coin gibt es keine Plattform-Wallet: Prüfe, dass die Adresse zu diesem Netzwerk gehört.",
    "La plateforme n'a pas de portefeuille pour cette crypto : vérifie que l'adresse est sur ce réseau.",
    "La piattaforma non ha un wallet per questa moneta: verifica che l'indirizzo sia di quella rete.",
  ],
  memo: ["Memo o tag", "Memo or tag", "Memo ou tag", "Memo или тег", "Memo oder Tag", "Mémo ou tag", "Memo o tag"],
  refund: [
    "Dirección de reembolso (opcional)",
    "Refund address (optional)",
    "Endereço de reembolso (opcional)",
    "Адрес для возврата (необязательно)",
    "Rückerstattungsadresse (optional)",
    "Adresse de remboursement (facultatif)",
    "Indirizzo di rimborso (facoltativo)",
  ],
  needDest: [
    "Escribe la dirección donde quieres recibir.",
    "Enter the address where you want to receive.",
    "Digite o endereço onde quer receber.",
    "Введите адрес для получения.",
    "Gib die Adresse ein, an die du empfangen willst.",
    "Saisis l'adresse où tu veux recevoir.",
    "Inserisci l'indirizzo dove vuoi ricevere.",
  ],
  needMemo: [
    "Esta moneda necesita memo o tag.",
    "This coin needs a memo or tag.",
    "Esta moeda precisa de memo ou tag.",
    "Этой монете нужен memo или тег.",
    "Diese Coin braucht ein Memo oder Tag.",
    "Cette crypto a besoin d'un mémo ou tag.",
    "Questa moneta richiede un memo o tag.",
  ],
  onlyReal: [
    "Disponible solo con dinero real: aquí es la red de prueba.",
    "Only available with real money: this is the test network.",
    "Disponível só com dinheiro real: aqui é a rede de teste.",
    "Доступно только с реальными деньгами: здесь тестовая сеть.",
    "Nur mit echtem Geld verfügbar: Hier ist das Testnetz.",
    "Disponible uniquement avec de l'argent réel : ici c'est le réseau de test.",
    "Disponibile solo con denaro reale: qui è la rete di prova.",
  ],
  needWallets: [
    "Primero crea tus wallets en la pestaña Wallet.",
    "First create your wallets in the Wallet tab.",
    "Primeiro crie suas carteiras na aba Wallet.",
    "Сначала создайте кошельки во вкладке Wallet.",
    "Erstelle zuerst deine Wallets im Tab Wallet.",
    "Crée d'abord tes portefeuilles dans l'onglet Wallet.",
    "Prima crea i tuoi wallet nella scheda Wallet.",
  ],
  notEnough: [
    "No tienes suficiente {0} disponible en tu wallet para este monto.",
    "You don't have enough {0} available in your wallet for this amount.",
    "Você não tem {0} suficiente disponível na carteira para este valor.",
    "В кошельке недостаточно доступных {0} для этой суммы.",
    "Du hast nicht genug verfügbares {0} in deiner Wallet für diesen Betrag.",
    "Tu n'as pas assez de {0} disponible dans ton portefeuille pour ce montant.",
    "Non hai abbastanza {0} disponibile nel wallet per questo importo.",
  ],
  xmrFail: [
    "No se pudo abrir tu wallet de Monero en este momento. Revisa tu conexión e inténtalo de nuevo; si sigue, abre la pestaña Wallet para que se sincronice.",
    "Your Monero wallet could not be opened right now. Check your connection and try again; if it keeps failing, open the Wallet tab so it syncs.",
    "Não foi possível abrir sua carteira Monero agora. Verifique a conexão e tente de novo; se continuar, abra a aba Wallet para sincronizar.",
    "Сейчас не удалось открыть ваш кошелёк Monero. Проверьте соединение и попробуйте снова; если не помогает, откройте вкладку Wallet для синхронизации.",
    "Deine Monero-Wallet konnte gerade nicht geöffnet werden. Prüfe deine Verbindung und versuch es erneut; wenn es weiter fehlschlägt, öffne den Tab Wallet zum Synchronisieren.",
    "Ton portefeuille Monero n'a pas pu s'ouvrir pour le moment. Vérifie ta connexion et réessaie ; si ça continue, ouvre l'onglet Wallet pour le synchroniser.",
    "Non è stato possibile aprire il tuo wallet Monero ora. Controlla la connessione e riprova; se continua, apri la scheda Wallet per sincronizzarlo.",
  ],
  syncing: ["Sincronizando tu wallet de Monero… {0} %", "Syncing your Monero wallet… {0}%", "Sincronizando sua carteira Monero… {0}%", "Синхронизация кошелька Monero… {0}%", "Monero-Wallet wird synchronisiert… {0} %", "Synchronisation de ton portefeuille Monero… {0} %", "Sincronizzazione del wallet Monero… {0}%"],
  searchCoin: ["Busca una moneda o red", "Search a coin or network", "Busque uma moeda ou rede", "Найдите монету или сеть", "Coin oder Netzwerk suchen", "Cherche une crypto ou un réseau", "Cerca una moneta o una rete"],
  results: ["Resultados", "Results", "Resultados", "Результаты", "Ergebnisse", "Résultats", "Risultati"],
  noMatch: ["Ninguna moneda coincide.", "No coin matches.", "Nenhuma moeda corresponde.", "Нет подходящих монет.", "Keine passende Coin.", "Aucune crypto ne correspond.", "Nessuna moneta corrisponde."],
  loadingMore: ["Cargando más monedas…", "Loading more coins…", "Carregando mais moedas…", "Загружаем другие монеты…", "Weitere Coins werden geladen…", "Chargement d'autres cryptos…", "Caricamento di altre monete…"],
  close: ["Cerrar", "Close", "Fechar", "Закрыть", "Schließen", "Fermer", "Chiudi"],
  pillBuy: ["Compra", "Buy", "Compra", "Покупка", "Kauf", "Achat", "Acquisto"],
  pillSell: ["Venta", "Sell", "Venda", "Продажа", "Verkauf", "Vente", "Vendita"],
  official: ["Oficial", "Official", "Oficial", "Официально", "Offiziell", "Officiel", "Ufficiale"],
  steps: [
    "Depósito|Confirmaciones|Envío|Listo",
    "Deposit|Confirmations|Sending|Done",
    "Depósito|Confirmações|Envio|Pronto",
    "Депозит|Подтверждения|Отправка|Готово",
    "Einzahlung|Bestätigungen|Versand|Fertig",
    "Dépôt|Confirmations|Envoi|Terminé",
    "Deposito|Conferme|Invio|Fatto",
  ],
  toSend: ["para enviar tu {0}", "to send your {0}", "para enviar seu {0}", "на отправку {0}", "um dein {0} zu senden", "pour envoyer tes {0}", "per inviare i tuoi {0}"],
  timeUp: ["Tiempo terminado", "Time is up", "Tempo esgotado", "Время вышло", "Zeit abgelaufen", "Temps écoulé", "Tempo scaduto"],
  sendExactly: ["Envía exactamente", "Send exactly", "Envie exatamente", "Отправьте ровно", "Sende genau", "Envoie exactement", "Invia esattamente"],
  toAddress: [
    "a esta dirección, por la red {0}:",
    "to this address, on the {0} network:",
    "para este endereço, pela rede {0}:",
    "на этот адрес в сети {0}:",
    "an diese Adresse im Netzwerk {0}:",
    "à cette adresse, sur le réseau {0} :",
    "a questo indirizzo, sulla rete {0}:",
  ],
  memoWarn: [
    "Incluye este memo o tag, o el depósito se puede perder:",
    "Include this memo or tag, or the deposit may be lost:",
    "Inclua este memo ou tag, ou o depósito pode se perder:",
    "Укажите этот memo или тег, иначе депозит может потеряться:",
    "Gib dieses Memo oder Tag an, sonst kann die Einzahlung verloren gehen:",
    "Ajoute ce mémo ou tag, sinon le dépôt peut être perdu :",
    "Includi questo memo o tag, altrimenti il deposito può andare perso:",
  ],
  payFromWallet: [
    "Pagar desde mi wallet",
    "Pay from my wallet",
    "Pagar da minha carteira",
    "Оплатить с моего кошелька",
    "Aus meiner Wallet zahlen",
    "Payer depuis mon portefeuille",
    "Paga dal mio wallet",
  ],
  netFee: ["Comisión de red (máx.)", "Network fee (max)", "Taxa de rede (máx.)", "Комиссия сети (макс.)", "Netzwerkgebühr (max.)", "Frais de réseau (max)", "Commissione di rete (max)"],
  confirmSend: ["Confirmar y enviar", "Confirm and send", "Confirmar e enviar", "Подтвердить и отправить", "Bestätigen und senden", "Confirmer et envoyer", "Conferma e invia"],
  depositSent: [
    "Depósito enviado desde tu wallet",
    "Deposit sent from your wallet",
    "Depósito enviado da sua carteira",
    "Депозит отправлен с вашего кошелька",
    "Einzahlung aus deiner Wallet gesendet",
    "Dépôt envoyé depuis ton portefeuille",
    "Deposito inviato dal tuo wallet",
  ],
  tradeId: ["ID del intercambio", "Swap ID", "ID da troca", "ID обмена", "Tausch-ID", "Identifiant de l'échange", "ID dello scambio"],
  providerId: ["ID en el exchange", "Exchange ID", "ID na exchange", "ID у обменника", "ID bei der Börse", "ID chez la plateforme", "ID sull'exchange"],
  payout: ["Envío del exchange", "Exchange payout", "Envio da exchange", "Выплата обменника", "Auszahlung der Börse", "Envoi de la plateforme", "Invio dell'exchange"],
  refresh: ["Actualizar", "Refresh", "Atualizar", "Обновить", "Aktualisieren", "Actualiser", "Aggiorna"],
  notFound: [
    "No encontramos esta orden en tu cuenta.",
    "We couldn't find this order in your account.",
    "Não encontramos esta ordem na sua conta.",
    "Мы не нашли этот ордер в вашем аккаунте.",
    "Diese Order ist nicht in deinem Konto.",
    "Cet ordre n'est pas dans ton compte.",
    "Non troviamo questo ordine nel tuo account.",
  ],
  st_waiting: [
    "Esperando tu depósito",
    "Waiting for your deposit",
    "Aguardando seu depósito",
    "Ожидаем ваш депозит",
    "Warte auf deine Einzahlung",
    "En attente de ton dépôt",
    "In attesa del tuo deposito",
  ],
  st_confirming: ["Confirmando depósito", "Confirming deposit", "Confirmando depósito", "Подтверждаем депозит", "Einzahlung wird bestätigt", "Confirmation du dépôt", "Conferma del deposito"],
  st_sending: ["Enviando", "Sending", "Enviando", "Отправляется", "Wird gesendet", "Envoi en cours", "Invio in corso"],
  st_finished: ["Completada", "Completed", "Concluída", "Завершён", "Abgeschlossen", "Terminé", "Completato"],
  st_failed: ["Fallida", "Failed", "Falhou", "Ошибка", "Fehlgeschlagen", "Échoué", "Fallito"],
  st_halted: ["Detenida por el exchange", "Halted by the exchange", "Parada pela exchange", "Остановлен обменником", "Von der Börse angehalten", "Bloqué par la plateforme", "Bloccato dall'exchange"],
  st_refunded: ["Reembolsada", "Refunded", "Reembolsada", "Возвращён", "Erstattet", "Remboursé", "Rimborsato"],
  st_expired: ["Vencida", "Expired", "Expirada", "Истёк", "Abgelaufen", "Expiré", "Scaduto"],
  st_partial: ["Pago incompleto", "Partially paid", "Pago parcialmente", "Оплачен частично", "Teilweise bezahlt", "Payé partiellement", "Pagato parzialmente"],
  next_waiting: [
    "Envía el depósito antes de que termine el tiempo. Si ya lo enviaste, espera: se actualiza solo.",
    "Send the deposit before time runs out. If you already sent it, wait: it updates by itself.",
    "Envie o depósito antes que o tempo acabe. Se já enviou, aguarde: atualiza sozinho.",
    "Отправьте депозит до истечения времени. Если уже отправили — подождите, статус обновится сам.",
    "Sende die Einzahlung, bevor die Zeit abläuft. Wenn du schon gesendet hast, warte: Es aktualisiert sich selbst.",
    "Envoie le dépôt avant la fin du délai. Si tu l'as déjà envoyé, patiente : ça se met à jour tout seul.",
    "Invia il deposito prima che scada il tempo. Se l'hai già inviato, attendi: si aggiorna da solo.",
  ],
  next_confirming: [
    "El exchange vio tu depósito y espera las confirmaciones de la red.",
    "The exchange saw your deposit and is waiting for network confirmations.",
    "A exchange viu seu depósito e aguarda as confirmações da rede.",
    "Обменник увидел депозит и ждёт подтверждений сети.",
    "Die Börse hat deine Einzahlung gesehen und wartet auf Netzwerkbestätigungen.",
    "La plateforme a vu ton dépôt et attend les confirmations du réseau.",
    "L'exchange ha visto il deposito e attende le conferme della rete.",
  ],
  next_sending: [
    "El exchange está enviando tu {0}.",
    "The exchange is sending your {0}.",
    "A exchange está enviando seu {0}.",
    "Обменник отправляет ваши {0}.",
    "Die Börse sendet dein {0}.",
    "La plateforme envoie tes {0}.",
    "L'exchange sta inviando i tuoi {0}.",
  ],
  next_finished: [
    "Listo: tu {0} ya se envió a {1}.",
    "Done: your {0} was sent to {1}.",
    "Pronto: seu {0} foi enviado para {1}.",
    "Готово: ваши {0} отправлены в {1}.",
    "Fertig: Dein {0} wurde an {1} gesendet.",
    "Terminé : tes {0} ont été envoyés vers {1}.",
    "Fatto: i tuoi {0} sono stati inviati a {1}.",
  ],
  next_bad: [
    "Algo salió mal con el exchange. Escríbenos con el ID del intercambio: la garantía MoneroP2P te cubre.",
    "Something went wrong with the exchange. Contact us with the swap ID: the MoneroP2P guarantee covers you.",
    "Algo deu errado com a exchange. Fale conosco com o ID da troca: a garantia MoneroP2P cobre você.",
    "С обменником что-то пошло не так. Напишите нам с ID обмена: вас покрывает гарантия MoneroP2P.",
    "Bei der Börse ist etwas schiefgelaufen. Schreib uns mit der Tausch-ID: Die MoneroP2P-Garantie deckt dich ab.",
    "Un problème est survenu avec la plateforme. Écris-nous avec l'identifiant de l'échange : la garantie MoneroP2P te couvre.",
    "Qualcosa è andato storto con l'exchange. Scrivici con l'ID dello scambio: la garanzia MoneroP2P ti copre.",
  ],
  next_refunded: [
    "El exchange devolvió tu pago a tu dirección de reembolso.",
    "The exchange returned your payment to your refund address.",
    "A exchange devolveu seu pagamento ao endereço de reembolso.",
    "Обменник вернул платёж на ваш адрес возврата.",
    "Die Börse hat deine Zahlung an deine Rückerstattungsadresse zurückgeschickt.",
    "La plateforme a renvoyé ton paiement à ton adresse de remboursement.",
    "L'exchange ha restituito il pagamento al tuo indirizzo di rimborso.",
  ],
  next_expired: [
    "El plazo terminó sin recibir tu depósito. Si ya habías enviado, escríbenos con el ID.",
    "The deadline passed without your deposit. If you had already sent, contact us with the ID.",
    "O prazo acabou sem receber seu depósito. Se já tinha enviado, fale conosco com o ID.",
    "Срок истёк без депозита. Если вы уже отправили — напишите нам с ID.",
    "Die Frist ist ohne Einzahlung abgelaufen. Wenn du schon gesendet hattest, schreib uns mit der ID.",
    "Le délai est passé sans ton dépôt. Si tu avais déjà envoyé, écris-nous avec l'identifiant.",
    "Il termine è scaduto senza il tuo deposito. Se avevi già inviato, scrivici con l'ID.",
  ],
} satisfies Record<string, Row>;
type Key = keyof typeof TXT;

/** Idioma de la página (el <html lang> del sitio de Fiat); inglés si no está en la lista. */
const langIdx = (): number => {
  const l = (document.documentElement.lang || "en").slice(0, 2).toLowerCase();
  const i = LANGS.indexOf(l as (typeof LANGS)[number]);
  return i < 0 ? 1 : i;
};
export const ot = (k: Key, ...args: string[]): string => args.reduce((s, a, i) => s.replaceAll(`{${i}}`, a), TXT[k][langIdx()]!);
const pageLang = () => LANGS[langIdx()]!;
export const contactUrl = () => `https://monerop2p.app/${pageLang()}/${pageLang() === "es" ? "contacto" : "contact"}/`;

// ---------------------------------------------------------------- red y monedas
const SWAP_API = (() => {
  const v = import.meta.env.PUBLIC_SWAP_API_URL as string | undefined;
  return v === "same" ? location.origin : v || API_URL;
})();
async function call<T>(path: string): Promise<T> {
  const r = await fetch(SWAP_API + path);
  const body = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(body.error ?? `error ${r.status}`);
  return body;
}

/** Redes de USDC de la fila del mercado (ids de Trocador); Arbitrum es la wallet USDC de la cuenta. */
export const USDC_NETS = [
  { id: "Arbitrum", label: "Arbitrum" },
  { id: "SOL", label: "Solana" },
  { id: "ERC20", label: "Ethereum" },
  { id: "base", label: "Base" },
] as const;

/** Una opción del selector: wallet interna u otra moneda de Trocador. */
type Opt = { key: string; label: string; leg: Leg; usdc: boolean; ticker: string; net: string; mine?: boolean; img?: string };
const INTERNAL_LABEL: Record<Exclude<Internal, "xmr">, string> = {
  usdc: "USDC · Arbitrum One",
  usdt: "USDT · Arbitrum One",
  eth: "ETH · Arbitrum One",
};
const internalOpt = (c: Exclude<Internal, "xmr">): Opt => ({
  key: `i:${c}`,
  label: `${INTERNAL_LABEL[c]} — ${ot("yourWallet")}`,
  leg: { kind: "internal", coin: c },
  usdc: c === "usdc",
  ticker: c,
  net: "Arbitrum One",
  mine: true,
});
const isInternalArb = (tk: string, nw: string) => nw === "Arbitrum" && ["usdt", "usdc", "eth"].includes(tk);
const otherOpt = (c: { ticker: string; network: string; memo?: boolean; label?: string; name?: string; img?: string }): Opt => {
  const label = c.label ?? `${c.ticker.toUpperCase()} · ${c.name ? (c.name.includes(`(${c.network})`) ? c.name : `${c.name} (${c.network})`) : c.network}`;
  return {
    key: `o:${c.ticker}|${c.network}`,
    label,
    leg: { kind: "other", ticker: c.ticker, network: c.network, memo: !!c.memo },
    usdc: c.ticker === "usdc",
    ticker: c.ticker,
    net: label.includes(" · ") ? label.slice(label.indexOf(" · ") + 3) : c.network,
    ...(c.img ? { img: c.img } : {}),
  };
};
const USDC_ORDER = ["SOL", "ERC20", "base", "BEP20", "MATIC"];

/**
 * Opciones del selector: primero USDC (la wallet de Arbitrum y luego todas las redes de USDC), después
 * las otras criptos (wallets internas primero). `extra` es la lista completa de Trocador, si ya cargó.
 */
export function coinOptions(extra: TrocadorCoin[] | null): {
  usdc: Opt[];
  other: Opt[];
} {
  const popular = COINS.filter((c) => !isInternalArb(c.ticker, c.network));
  const usdcPop = popular.filter((c) => c.ticker === "usdc").sort((a, b) => USDC_ORDER.indexOf(a.network) - USDC_ORDER.indexOf(b.network));
  const seen = new Set(usdcPop.map((c) => `${c.ticker}|${c.network}`));
  const usdcMore = (extra ?? []).filter((c) => c.ticker.toLowerCase() === "usdc" && !isInternalArb("usdc", c.network) && !seen.has(`usdc|${c.network}`));
  return {
    usdc: [internalOpt("usdc"), ...usdcPop.map(otherOpt), ...usdcMore.map((c) => otherOpt({ ...c, ticker: "usdc", label: `USDC · ${c.network}`, img: c.img }))],
    other: [internalOpt("usdt"), internalOpt("eth"), ...popular.filter((c) => c.ticker !== "usdc").map(otherOpt)],
  };
}

const XMR_LEG: Leg = { kind: "internal", coin: "xmr" };
const cleanNum = (s: string) => s.trim().replace(",", ".");
const legName = (l: Leg) => (l.kind === "internal" ? (l.coin === "xmr" ? "XMR" : l.coin.toUpperCase()) : l.ticker.toUpperCase());
const legNet = (l: Leg) => (l.kind === "internal" ? (l.coin === "xmr" ? "Monero" : "Arbitrum One") : l.network);

/** ¿Puede esta cuenta usar el anuncio oficial ahora? Si no, el motivo para mostrar. */
function blocked(app: P2PApp): string | null {
  const v = app.vault;
  if (!WALLETS_ON || !v) return ot("onlyReal");
  if (!v.seed) return ot("needWallets");
  return null;
}

// ---------------------------------------------------------------- panel para tomar el anuncio
export function officialSheet(app: P2PApp, wantBuy: boolean, startNet?: string) {
  const out = h("div");
  const title = wantBuy ? ot("buyXmr") : ot("sellXmr");
  const head = h(
    "div",
    { class: "p2p-sheet-head" },
    h("h2", { id: "p2p-sheet-title" }, title),
    h(
      "button",
      {
        class: "p2p-x",
        type: "button",
        "aria-label": ot("close"),
        onclick: () => close(),
      },
      icon("x"),
    ),
  );
  const who = h("p", { class: "p2p-official-who" }, h("strong", {}, "MoneroP2P"), " ", h("span", { class: "badge ok p2p-verified", title: ot("officialTip") }, icon("shield"), ot("verified")));
  const sheet = h(
    "div",
    {
      class: "p2p-sheet",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "p2p-sheet-title",
    },
    head,
    who,
    out,
  );
  const back = h(
    "div",
    {
      class: "p2p-backdrop",
      onclick: (e: Event) => e.target === back && close(),
    },
    sheet,
  );
  const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
  function close() {
    back.remove();
    document.removeEventListener("keydown", esc);
    document.body.classList.remove("p2p-noscroll");
  }
  document.addEventListener("keydown", esc);
  document.body.classList.add("p2p-noscroll");
  document.body.append(back);

  const why = blocked(app);
  if (why) return void out.replaceChildren(h("p", { class: "notice warn" }, why, " ", h("a", { href: "#/wallet", onclick: () => close() }, "Wallet")));

  const v = app.vault!;
  const seed = v.seed!;
  // En la red de prueba se puede escribir el monto y ver la cotización real, pero no crear el cambio
  // (Trocador no tiene red de prueba).
  const practice = v.network !== "mainnet";
  const net: EvmNetwork = NETWORKS.arbitrum_one!;
  const evm = evmAddress(seed);
  const pub = publicClient(net);
  // La wallet de Monero arranca solo cuando hace falta (Máx. o crear el cambio).
  let stX: ReturnType<typeof startXmr> | null = null;
  const xmrSt = () => {
    if (stX?.error) (retryXmr(app), (stX = null));
    return (stX ??= startXmr(app));
  };
  /** Espera la wallet de Monero sincronizada, con avance en pantalla y error entendible. */
  const xmrSynced = async () => {
    const st = xmrSt();
    await xmrReady(st, true, (pct) => msg.replaceChildren(h("small", { class: "muted" }, ot("syncing", String(Math.floor(pct * 100)))))).catch(() => Promise.reject(new Error(ot("xmrFail"))));
    msg.replaceChildren();
    return st;
  };
  /** Dirección Monero de la cuenta: sale de la semilla, no necesita abrir ni sincronizar la wallet. */
  let xmrAddr: string | null = null;
  const myXmr = async () => (xmrAddr ??= (await (await xmrLib()).walletKeys({ network: v.network, spendKey: moneroSpendKey(seed) })).address);
  const msg = h("div");

  // Selector de la moneda que no es XMR (lo que pagas al comprar, lo que recibes al vender).
  let extra: TrocadorCoin[] | null = null;
  let opts: Opt[] = [];
  let cur = wantBuy && startNet && startNet !== "Arbitrum" ? `o:usdc|${startNet}` : "i:usdc";
  const optIcon = (o: Opt, size: number) => iconEl(o.ticker, o.img, SWAP_API, size);
  const pickBtn = h("button", { id: "p2p-o-coin", class: "coin-btn", type: "button", "aria-expanded": "false" });
  const search = h("input", { class: "p2p-coin-search", type: "search", autocomplete: "off", spellcheck: false, placeholder: ot("searchCoin") });
  const list = h("ul", { class: "coin-list" });
  const panel = h("div", { class: "coin-panel", hidden: true }, search, list);
  const pickWrap = h("div", { class: "coin-pick" }, pickBtn, panel);
  let onPick = () => {};
  const closePanel = () => {
    panel.hidden = true;
    pickBtn.setAttribute("aria-expanded", "false");
  };
  const renderBtn = () => {
    const o = optOf();
    pickBtn.replaceChildren(h("span", { class: "coin-sel" }, optIcon(o, 22), h("strong", {}, o.ticker.toUpperCase()), h("small", {}, o.net + (o.mine ? " · " + ot("yourWallet") : ""))), h("span", { class: "coin-caret", "aria-hidden": "true" }, icon("chevron")));
  };
  const option = (o: Opt) => {
    const b = h("button", { class: "coin-opt", type: "button" }, optIcon(o, 22), h("strong", {}, o.ticker.toUpperCase()), h("span", {}, o.net + (o.mine ? " · " + ot("yourWallet") : "")));
    b.onclick = () => {
      if (!opts.some((x) => x.key === o.key)) opts.push(o);
      cur = o.key;
      closePanel();
      renderBtn();
      onPick();
    };
    return h("li", {}, b);
  };
  const fillList = () => {
    const { usdc, other } = coinOptions(extra);
    const q = search.value.trim().toLowerCase();
    if (!q) {
      return list.replaceChildren(
        h("li", { class: "meta" }, "USDC"),
        ...usdc.map(option),
        h("li", { class: "meta" }, extra ? ot("otherCrypto") : `${ot("otherCrypto")} · ${ot("loadingMore")}`),
        ...other.map(option),
      );
    }
    // Al buscar: las opciones conocidas y toda la lista de Trocador (sin XMR ni las wallets de Arbitrum, que ya están).
    const known = [...usdc, ...other];
    const rank = (o: Opt) => (o.ticker === q ? 0 : o.ticker.startsWith(q) ? 1 : 2);
    const keys = new Set(known.map((o) => o.key));
    const more = (extra ?? []).filter((c) => c.ticker.toLowerCase() !== "xmr" && !isInternalArb(c.ticker.toLowerCase(), c.network)).map((c) => otherOpt({ ...c, ticker: c.ticker.toLowerCase() })).filter((o) => !keys.has(o.key));
    const hits = [...known, ...more].filter((o) => `${o.ticker} ${o.label} ${o.net}`.toLowerCase().includes(q))
      // Primero la moneda exacta, luego las que empiezan igual.
      .sort((a, b) => rank(a) - rank(b))
      .slice(0, 40);
    list.replaceChildren(h("li", { class: "meta" }, hits.length ? ot("results") : ot("noMatch")), ...hits.map(option));
  };
  search.oninput = fillList;
  pickBtn.onclick = () => {
    if (!panel.hidden) return closePanel();
    panel.hidden = false;
    pickBtn.setAttribute("aria-expanded", "true");
    search.value = "";
    fillList();
    search.focus();
  };
  // Tocar fuera del selector lo cierra.
  sheet.addEventListener("click", (e) => !pickWrap.contains(e.target as Node) && closePanel());
  const resetOpts = () => {
    const { usdc, other } = coinOptions(extra);
    const all = [...usdc, ...other];
    const chosen = opts.find((o) => o.key === cur);
    opts = chosen && !all.some((o) => o.key === cur) ? [...all, chosen] : all;
    if (!opts.some((o) => o.key === cur)) cur = usdc[0]!.key;
  };
  resetOpts();
  void call<TrocadorCoin[]>("/v1/trocador/coins?v=2").then(
    (c) => {
      extra = c;
      resetOpts();
      if (!panel.hidden) fillList();
    },
    () => {},
  );
  const optOf = () => opts.find((o) => o.key === cur) ?? opts[0]!;
  renderBtn();

  const amount = h("input", {
    id: "p2p-o-amt",
    type: "text",
    inputMode: "decimal",
    autocomplete: "off",
    placeholder: wantBuy ? "50" : "0.1",
  });
  const unit = h("span");
  const max = h("button", { class: "p2p-link", type: "button" }, ot("max"));
  const dest = h("input", {
    id: "p2p-o-dest",
    type: "text",
    autocomplete: "off",
    spellcheck: false,
    autocapitalize: "none",
  });
  const destF = app.field(ot("dest"), dest, ot("destHint"));
  const memo = h("input", {
    id: "p2p-o-memo",
    type: "text",
    autocomplete: "off",
    spellcheck: false,
  });
  const memoF = app.field(ot("memo"), memo);
  const refund = h("input", {
    id: "p2p-o-refund",
    type: "text",
    autocomplete: "off",
    spellcheck: false,
    autocapitalize: "none",
  });
  const refundF = app.field(ot("refund"), refund);
  const est = h("div", { class: "p2p-est" }, h("small", { class: "muted" }, ot("typeAmount")));
  const facts = h("div");
  const go = h("button", { class: "btn big " + (wantBuy ? "buy" : "sell"), type: "button" }, title);

  const legs = (): { from: Leg; to: Leg } => (wantBuy ? { from: optOf().leg, to: XMR_LEG } : { from: XMR_LEG, to: optOf().leg });
  const plan = (): SwapPlan => {
    const p = planSwap(legs().from, legs().to);
    if (typeof p === "string") throw new Error(ot("badAmount"));
    return p;
  };

  let quote: { amount: string; rates: TrocadorRates; at: number } | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const sync = () => {
    const p = plan();
    const sent = legs().from;
    unit.textContent = legName(sent);
    amount.placeholder = wantBuy ? "50" : "0.1";
    max.hidden = practice || sent.kind !== "internal";
    destF.hidden = !!p.receiveIn;
    memoF.hidden = !p.memo;
    refundF.hidden = !!p.payFrom;
    quote = null;
    requote();
  };
  const requote = () => {
    clearTimeout(timer);
    const amt = cleanNum(amount.value);
    if (!(Number(amt) > 0)) {
      facts.replaceChildren();
      return void est.replaceChildren(h("small", { class: "muted" }, ot("typeAmount")));
    }
    est.replaceChildren(h("small", { class: "muted" }, ot("quoting")));
    timer = setTimeout(() => void getQuote(amt).catch((e) => est.replaceChildren(app.error(e))), 600);
  };
  async function getQuote(amt: string) {
    const p = plan();
    const rates = await call<TrocadorRates>(`/v1/trocador/rates?side=${p.side}&amount=${encodeURIComponent(amt)}&ticker=${encodeURIComponent(p.ticker)}&network=${encodeURIComponent(p.network)}`);
    if (cleanNum(amount.value) !== amt) return;
    if (!rates.quotes.length) {
      quote = null;
      facts.replaceChildren();
      return void est.replaceChildren(h("small", { class: "danger" }, ot("noQuote")));
    }
    quote = { amount: amt, rates, at: Date.now() };
    const q = rates.quotes[0]!;
    const got = legName(legs().to);
    est.replaceChildren(h("strong", {}, ot("approx", `${q.amount_to} ${got}`)));
    const logo = iconEl(q.provider, q.logo, SWAP_API, 16);
    logo.classList.add("prov-logo");
    facts.replaceChildren(
      kv([
        [ot("exchange"), h("span", {}, logo, ` ${q.provider} · KYC ${q.kycrating}`)],
        [ot("eta"), q.eta ? `~${Math.round(q.eta)} min` : "10–60 min"],
        [ot("depTime"), ot("depTimeVal")],
        [ot("getIn"), legs().to.kind === "internal" ? ot("platWallet") : legNet(legs().to)],
        ["", q.fixed ? ot("fixed") : ot("float")],
      ]),
    );
  }

  onPick = () => {
    sync();
    relabel();
  };
  amount.oninput = requote;
  max.onclick = () =>
    void app.busy(
      max,
      async () => {
        const sent = legs().from;
        if (sent.kind !== "internal") return;
        if (sent.coin === "xmr") {
          const st = await xmrSynced();
          amount.value = formatAmount(BigInt(st.info!.unlocked ?? st.info!.balance), DECIMALS.xmr);
        } else {
          const b = await balances(pub, net, evm);
          amount.value = formatAmount(sent.coin === "usdc" ? b.usdc : sent.coin === "usdt" ? b.token : b.eth, DECIMALS[sent.coin]);
        }
        requote();
      },
      msg,
    );

  go.onclick = () =>
    void app.busy(
      go,
      async () => {
        const p = plan();
        const amt = cleanNum(amount.value);
        if (!/^\d{1,12}(\.\d{1,18})?$/.test(amt) || !(Number(amt) > 0)) throw new Error(ot("badAmount"));
        if (!p.receiveIn && !/^[A-Za-z0-9:_.-]{10,128}$/.test(dest.value.trim())) throw new Error(ot("needDest"));
        if (p.memo && !memo.value.trim()) throw new Error(ot("needMemo"));
        // Cotización fresca: la de la pantalla puede tener minutos.
        if (!quote || quote.amount !== amt || Date.now() - quote.at > 8 * 60_000) await getQuote(amt);
        if (!quote) throw new Error(ot("noQuote"));
        // Antes de crear nada en el exchange: que la wallet de la cuenta de verdad tenga ese monto.
        const sent = legs().from;
        if (sent.kind === "internal") {
          const need = parseAmount(amt, DECIMALS[sent.coin]);
          if (sent.coin === "xmr") {
            const st = await xmrSynced();
            if (BigInt(st.info?.unlocked ?? 0) < need) throw new Error(ot("notEnough", "XMR"));
          } else {
            const b = await balances(pub, net, evm);
            const have = sent.coin === "usdc" ? b.usdc : sent.coin === "usdt" ? b.token : b.eth;
            if (have < need) throw new Error(ot("notEnough", sent.coin.toUpperCase()));
          }
        }
        const mineXmr = p.receiveIn === "xmr" || p.payFrom === "xmr" ? await myXmr() : "";
        const receive = p.receiveIn === "xmr" ? mineXmr : p.receiveIn === "evm" ? evm : dest.value.trim();
        const ownRefund = p.payFrom === "xmr" ? mineXmr : p.payFrom ? evm : refund.value.trim();
        const proof = p.receiveIn ? await signAddress(app.acct!, "mainnet", p.receiveIn, receive) : null;
        let trade: TrocadorTrade | null = null;
        let last: unknown;
        // Si un exchange no puede crear el cambio, se prueba con el siguiente de la lista.
        for (const q of quote.rates.quotes.slice(0, 4)) {
          try {
            trade = await signed<TrocadorTrade>(
              app.acct!,
              "POST",
              "/v1/trocador/trades",
              {
                rate_id: quote.rates.rate_id,
                provider: q.provider,
                fixed: q.fixed,
                amount: amt,
                ticker: p.ticker,
                network: p.network,
                side: p.side,
                address: receive,
                ...(p.memo ? { address_memo: memo.value.trim() } : {}),
                ...(ownRefund ? { refund: ownRefund } : {}),
                ...(proof ? { proof: { at: proof.at, sig: proof.sig } } : {}),
              },
              SWAP_API,
            );
            break;
          } catch (e) {
            last = e;
            if (!(e instanceof Error && /no pudo crear el cambio|could not be generated/i.test(e.message))) throw e;
          }
        }
        if (!trade) throw last instanceof Error ? last : new Error(ot("noQuote"));
        const l = legs();
        const fromLabel = `${legName(l.from)} (${legNet(l.from)})`;
        const toLabel = `${legName(l.to)} (${legNet(l.to)})`;
        const rec: SwapRecord = {
          id: trade.trade_id,
          at: nowS(),
          from: fromLabel,
          to: toLabel,
          amount_from: String(trade.amount_from || amt),
          amount_to: String(trade.amount_to || quote.rates.quotes[0]!.amount_to),
          provider: trade.provider,
          status: trade.status,
          official: true,
          ...(trade.expires_at ? { expires_at: trade.expires_at } : {}),
          deposit: {
            address: trade.address_provider,
            ...(trade.address_provider_memo ? { memo: trade.address_provider_memo } : {}),
            ticker: trade.ticker_from,
            network: trade.network_from,
          },
          ...(p.payFrom ? { pay: p.payFrom } : {}),
        };
        v.swaps = upsertSwap(v.swaps, rec);
        await app.saveV();
        close();
        location.hash = `#/oficial/${rec.id}`;
      },
      msg,
    );

  // Un mismo elemento solo puede estar en un lugar: se arman únicamente los campos del lado elegido.
  const amountF = app.field(ot("amountIn", "…"), h("div", { class: "p2p-suffix" }, amount, max, unit));
  const pickF = app.field(wantBuy ? ot("payWith") : ot("youReceive"), pickWrap);
  const fieldsBuy = [pickF, amountF];
  const fieldsSell = [amountF, pickF];
  out.replaceChildren(
    ...kids(
      ...(wantBuy ? fieldsBuy : fieldsSell),
      est,
      facts,
      destF,
      memoF,
      refundF,
      h("p", { class: "p2p-escrow-note" }, icon("shield"), h("span", {}, h("strong", {}, ot("guarTitle") + ": "), ot("guarText"))),
      practice ? h("p", { class: "notice warn" }, ot("onlyReal")) : null,
      msg,
      go,
    ),
  );
  go.disabled = practice;
  // La etiqueta «Monto en X» depende de la moneda elegida.
  const amtLabel = (wantBuy ? fieldsBuy[1] : fieldsSell[0])!.querySelector("label");
  amtLabel?.setAttribute("for", amount.id);
  const relabel = () => amtLabel && (amtLabel.textContent = ot("amountIn", legName(legs().from)));
  relabel();
  sync();
  amount.focus();
}

// ---------------------------------------------------------------- estado
const STEP: Record<string, number> = {
  new: 0,
  waiting: 0,
  confirming: 1,
  sending: 2,
  finished: 4,
};
const BAD = new Set(["failed", "halted", "expired", "refunded", "paid partially"]);
export function statusLabel(s: string | undefined): string {
  const k = (
    {
      new: "st_waiting",
      waiting: "st_waiting",
      confirming: "st_confirming",
      sending: "st_sending",
      finished: "st_finished",
      failed: "st_failed",
      halted: "st_halted",
      refunded: "st_refunded",
      expired: "st_expired",
      "paid partially": "st_partial",
    } as Record<string, Key>
  )[s ?? "new"];
  return k ? ot(k) : (s ?? "");
}
export const statusToneOf = (s: string | undefined) => (s === "finished" ? "ok" : s === "refunded" ? "muted" : BAD.has(s ?? "") ? "danger" : s === "new" || s === "waiting" ? "warn" : "info");
const isBuy = (r: SwapRecord) => r.to.startsWith("XMR");

/** Fila de «Órdenes» para un intercambio del anuncio oficial. */
export function officialOrderRow(app: P2PApp, r: SwapRecord): HTMLElement {
  const buy = isBuy(r);
  return h(
    "a",
    { class: "p2p-row link", role: "row", href: `#/oficial/${r.id}` },
    h("div", { class: "p2p-cell", role: "cell" }, h("span", { class: "p2p-pill " + (buy ? "buy" : "sell") }, buy ? ot("pillBuy") : ot("pillSell"))),
    h(
      "div",
      { class: "p2p-cell", role: "cell" },
      h("strong", {}, `${r.amount_from} ${r.from.split(" ")[0]} → ${r.amount_to} ${r.to.split(" ")[0]}`),
      h("small", { class: "muted" }, `MoneroP2P · ${ot("official")}`),
    ),
    h("div", { class: "p2p-cell", role: "cell" }, h("span", { class: "badge " + statusToneOf(r.status) }, statusLabel(r.status))),
    h(
      "div",
      { class: "p2p-cell muted", role: "cell" },
      h(
        "small",
        {},
        new Date(r.at * 1000).toLocaleString(pageLang(), {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      ),
    ),
    h("div", { class: "p2p-cell act", role: "cell" }, h("span", { class: "p2p-chev", "aria-hidden": "true" }, "›")),
  );
}

// ---------------------------------------------------------------- orden #/oficial/<id>
export async function officialView(app: P2PApp, id: string): Promise<void> {
  const v = app.vault!;
  const rec = (v.swaps ?? []).find((s) => s.id === id);
  if (!rec) return app.show(h("p", { class: "notice warn" }, ot("notFound")), h("p", {}, h("a", { class: "btn", href: "#/" }, "MoneroP2P")));
  const net: EvmNetwork = NETWORKS.arbitrum_one!;
  const buy = isBuy(rec);
  const head = h("div");
  const main = h("div", { class: "p2p-order-main" });
  const side = h(
    "section",
    { class: "card p2p-box p2p-official-side" },
    h("h3", {}, icon("shield"), " ", ot("guarTitle")),
    h("p", {}, ot("guarText")),
    h("p", {}, h("a", { href: contactUrl(), target: "_blank", rel: "noopener" }, ot("contact")), h("br"), h("code", { class: "p2p-addr" }, rec.id)),
  );
  app.show(head, h("div", { class: "p2p-order" }, main, side));

  let trade: TrocadorTrade | null = null;
  const draw = (err?: unknown) => {
    const s = trade?.status ?? rec.status ?? "new";
    const waiting = s === "new" || s === "waiting";
    const recv = rec.to.split(" ")[0]!;
    const sent = rec.from.split(" ")[0]!;
    const labels = ot("steps").split("|");
    const at = STEP[s];
    const steps =
      BAD.has(s) || at === undefined
        ? null
        : h(
            "ol",
            { class: "p2p-steps" },
            labels.map((l, k) =>
              h(
                "li",
                {
                  class: at >= k ? (at > k || s === "finished" ? "done" : "now") : "",
                },
                l,
              ),
            ),
          );
    const nextText = waiting
      ? ot("next_waiting")
      : s === "confirming"
        ? ot("next_confirming")
        : s === "sending"
          ? ot("next_sending", recv)
          : s === "finished"
            ? ot("next_finished", recv, rec.to.includes("(") && (rec.to.includes("Monero") || rec.to.includes("Arbitrum")) ? ot("yourWallet") : rec.to)
            : s === "refunded"
              ? ot("next_refunded")
              : s === "expired"
                ? ot("next_expired")
                : ot("next_bad");
    const tone = statusToneOf(s);
    head.replaceChildren(
      ...kids(
        h(
          "div",
          { class: "p2p-order-head" },
          h("span", { class: "p2p-pill " + (buy ? "buy" : "sell") }, buy ? ot("pillBuy") : ot("pillSell")),
          h("h2", {}, `${rec.amount_from} ${sent} → ≈ ${rec.amount_to} ${recv}`),
          h("small", { class: "muted" }, "MoneroP2P · ", h("span", { class: "badge ok p2p-verified" }, icon("shield"), ot("verified"))),
          h("span", { class: "badge big " + tone }, statusLabel(s)),
        ),
        steps,
        h(
          "div",
          {
            class: "p2p-next " + (tone === "danger" ? "danger" : tone === "ok" ? "ok" : "warn"),
          },
          h("p", {}, nextText),
          h("span", {
            class: "p2p-count",
            "data-deadline": String(trade?.expires_at ?? rec.expires_at ?? 0),
          }),
        ),
      ),
    );
    tickClock();

    const dep =
      rec.deposit ??
      (trade
        ? {
            address: trade.address_provider,
            memo: trade.address_provider_memo,
            ticker: trade.ticker_from,
            network: trade.network_from,
          }
        : null);
    const explorer = rec.deposit_tx ? (rec.pay === "xmr" ? XMR_EXPLORER.mainnet + rec.deposit_tx : `${net.explorer}/tx/${rec.deposit_tx}`) : "";
    const payBox = h("div");
    const payBtn = rec.pay && waiting && !rec.deposit_tx ? h("button", { class: "btn big " + (buy ? "buy" : "sell"), type: "button" }, ot("payFromWallet")) : null;
    if (payBtn) payBtn.onclick = () => void app.busy(payBtn, () => reviewPay(payBox), payBox);
    main.replaceChildren(
      ...kids(
        ...(waiting && dep && !rec.deposit_tx
          ? [
              h(
                "div",
                { class: "card p2p-deposit" },
                h("p", {}, ot("sendExactly"), " ", h("strong", {}, `${rec.amount_from} ${dep.ticker.toUpperCase()}`), " ", ot("toAddress", dep.network)),
                h("div", { class: "p2p-copy" }, h("code", { class: "p2p-addr" }, dep.address), copyButton(app, dep.address)),
                dep.memo && dep.memo !== "0" ? h("p", { class: "notice warn" }, ot("memoWarn"), " ", h("code", {}, dep.memo), " ", copyButton(app, dep.memo)) : null,
                h("div", { class: "p2p-wallet-qr" }, qrSvg(dep.address, dep.address)),
                payBtn,
                payBox,
              ),
            ]
          : []),
        rec.deposit_tx ? h("p", { class: "notice ok" }, ot("depositSent"), " · ", h("a", { href: explorer, target: "_blank", rel: "noopener" }, rec.deposit_tx.slice(0, 12) + "…")) : null,
        err ? app.error(err) : null,
        kv([
          [ot("youReceive"), h("strong", {}, `≈ ${rec.amount_to} ${rec.to}`)],
          [ot("exchange"), trade?.provider ?? rec.provider],
          [ot("tradeId"), h("code", {}, rec.id)],
          ...(trade?.id_provider ? ([[ot("providerId"), h("code", {}, trade.id_provider)]] as [string, Child][]) : []),
          ...(trade?.hashout ? ([[ot("payout"), h("code", {}, trade.hashout)]] as [string, Child][]) : []),
          ...(trade ? ([["", trade.fixed ? ot("fixed") : ot("float")]] as [string, Child][]) : []),
        ] as [string, Child][]),
        h(
          "p",
          {},
          h(
            "button",
            {
              class: "btn secondary small",
              type: "button",
              onclick: () => void poll(false),
            },
            ot("refresh"),
          ),
        ),
      ),
    );
  };

  /** Revisión del depósito desde la wallet interna: comisión de red primero, luego firmar y enviar. */
  async function reviewPay(box: HTMLElement) {
    if (!trade) trade = await call<TrocadorTrade>(`/v1/trocador/trades/${encodeURIComponent(id)}`);
    const d = autoDeposit(rec!.pay, rec!.amount_from, trade);
    if (typeof d === "string") throw new Error(ot("next_bad"));
    const seed = v.seed!;
    let fee = "";
    let send: () => Promise<string>;
    if (d.coin === "xmr") {
      const st = startXmr(app);
      await xmrReady(st, true);
      const xmr = await xmrLib();
      if (!(await xmr.validAddress(d.to, "mainnet"))) throw new Error(ot("next_bad"));
      const p = await xmr.userPrepare(d.to, String(d.amount)).catch((e) => Promise.reject(xmrError(app, e)));
      fee = `${formatAmount(BigInt(p.fee), DECIMALS.xmr)} XMR`;
      send = async () => {
        await xmr.userRelay(p.metadata).catch((e) => Promise.reject(xmrError(app, e)));
        void persistXmr("mainnet").catch(() => {});
        return p.txid;
      };
    } else {
      const evm = evmAddress(seed);
      const p = await prepareEvm(publicClient(net), net, evm, evmAsset(d.coin), d.to, d.amount).catch((e) => Promise.reject(evmError(app, e)));
      fee = `${formatAmount(p.fee, 18, 8)} ETH`;
      send = () => sendEvm(net, evmKey(seed), p).catch((e) => Promise.reject(evmError(app, e)));
    }
    const ok = h("button", { class: "btn", type: "button" }, ot("confirmSend"));
    const msg = h("div");
    ok.onclick = () =>
      void app.busy(
        ok,
        async () => {
          rec!.deposit_tx = await send();
          v.swaps = upsertSwap(v.swaps, rec!);
          await app.saveV();
          draw();
        },
        msg,
      );
    box.replaceChildren(
      kv([
        [ot("sendExactly"), `${formatAmount(d.amount, DECIMALS[d.coin])} ${d.coin.toUpperCase()}`],
        [ot("netFee"), fee],
      ]),
      h("p", {}, ok),
      msg,
    );
  }

  function tickClock() {
    const el = head.querySelector<HTMLElement>(".p2p-count");
    if (!el) return;
    const s = trade?.status ?? rec!.status ?? "new";
    const dl = Number(el.dataset.deadline || 0);
    if (!dl || !(s === "new" || s === "waiting") || rec!.deposit_tx) return void (el.textContent = "");
    const left = dl - nowS();
    el.textContent = left > 0 ? `⏱ ${clock(left)} ${ot("toSend", rec!.from.split(" ")[0]!)}` : ot("timeUp");
    el.classList.toggle("late", left < 300);
  }
  const clockIv = setInterval(() => (location.hash === `#/oficial/${id}` ? tickClock() : clearInterval(clockIv)), 1000);

  async function poll(schedule = true) {
    let err: unknown;
    try {
      trade = await call<TrocadorTrade>(`/v1/trocador/trades/${encodeURIComponent(id)}`);
      let dirty = false;
      if (trade.status && trade.status !== rec!.status) ((rec!.status = trade.status), (dirty = true));
      if (trade.amount_to && trade.amount_to !== rec!.amount_to) ((rec!.amount_to = String(trade.amount_to)), (dirty = true));
      if (trade.expires_at && trade.expires_at !== rec!.expires_at) ((rec!.expires_at = trade.expires_at), (dirty = true));
      if (dirty) {
        v.swaps = upsertSwap(v.swaps, rec!);
        void app.saveV();
      }
    } catch (e) {
      err = e;
    }
    // No redibujar mientras se revisa un pago desde la wallet.
    if (!main.querySelector(".p2p-deposit .p2p-kv")) draw(err);
    if (schedule && location.hash === `#/oficial/${id}` && !isFinal(trade?.status ?? rec!.status)) app.timer = setTimeout(() => void poll(), 15_000);
  }
  draw();
  await poll();
}
