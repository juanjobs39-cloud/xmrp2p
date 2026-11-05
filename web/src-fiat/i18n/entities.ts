/**
 * Portugués y ruso de los métodos de pago y países de P2P Fiat (el español y el inglés están en content.ts).
 * slug: parte final de la URL en portugués (el ruso usa la del inglés).
 * loc: el país con su preposición, para títulos («no Brasil», «в Бразилии»).
 */
interface MethodTr {
  slug?: string;
  where: string;
  intro: string;
  tips: string[];
}
interface CountryTr {
  slug?: string;
  name: string;
  fiatName: string;
  note: string;
  loc: string;
}

export const METHOD_I18N: Record<string, { pt: MethodTr; ru: MethodTr }> = {
  spei: {
    pt: {
      slug: "spei",
      where: "México",
      intro: "SPEI é a transferência bancária instantânea do México: chega em segundos, funciona 24 horas e não pode ser revertida depois de creditada. Por isso é o método mais usado para comprar e vender Monero com pesos mexicanos.",
      tips: [
        "Pague de uma conta no seu nome: muitos vendedores recusam pagamentos de terceiros.",
        "Use apenas a referência que o vendedor pedir; nunca escreva “Monero”, “cripto” ou “XMR”.",
        "Vendedor: confirme no app do SEU banco que o SPEI chegou (com a chave de rastreio) antes de liberar; um print não basta.",
      ],
    },
    ru: {
      where: "Мексика",
      intro: "SPEI — мгновенный банковский перевод в Мексике: приходит за секунды, работает круглосуточно и не отменяется после зачисления. Поэтому это самый популярный способ покупать и продавать Monero за мексиканские песо.",
      tips: [
        "Платите со счёта на своё имя: многие продавцы не принимают платежи от третьих лиц.",
        "Указывайте только то назначение платежа, которое просит продавец; никогда не пишите «Monero», «крипто» или «XMR».",
        "Продавец: перед отпуском средств проверьте в приложении СВОЕГО банка, что SPEI пришёл (по коду отслеживания); скриншота недостаточно.",
      ],
    },
  },
  oxxo: {
    pt: {
      slug: "deposito-oxxo",
      where: "México",
      intro: "O depósito em dinheiro no OXXO permite comprar Monero sem conta bancária: o vendedor informa o número do cartão ou da conta e você paga no caixa. O depósito pode demorar a aparecer, então escolha anúncios com prazo de pagamento longo.",
      tips: [
        "Guarde o comprovante: é a sua prova se houver apelação.",
        "O OXXO cobra uma taxa de depósito; combinem no chat quem paga.",
        "Vendedor: espere o depósito aparecer na sua conta, não numa foto do comprovante.",
      ],
    },
    ru: {
      where: "Мексика",
      intro: "Внесение наличных в OXXO позволяет купить Monero без банковского счёта: продавец даёт номер карты или счёта, а вы платите на кассе. Зачисление может занять время, поэтому выбирайте объявления с длинным сроком оплаты.",
      tips: [
        "Сохраните чек: это ваше доказательство при апелляции.",
        "OXXO берёт комиссию за внесение; договоритесь в чате, кто её платит.",
        "Продавец: ждите, пока деньги появятся на счёте, а не фото чека.",
      ],
    },
  },
  mercadopago: {
    pt: {
      slug: "mercado-pago",
      where: "México, Argentina e outros",
      intro: "O Mercado Pago é prático, mas alguns pagamentos podem ser contestados ou revertidos depois que o vendedor libera o Monero. Por isso os anúncios com Mercado Pago costumam exigir histórico de ordens, e a plataforma o marca com ⚠.",
      tips: [
        "Use transferência de saldo entre contas, não pagamento com cartão.",
        "Vendedor: você pode exigir um número mínimo de ordens concluídas para este método.",
        "Nunca libere com um pagamento “pendente” ou em análise.",
      ],
    },
    ru: {
      where: "Мексика, Аргентина и другие",
      intro: "Mercado Pago удобен, но некоторые платежи можно оспорить или отменить уже после того, как продавец отпустил Monero. Поэтому объявления с Mercado Pago часто требуют историю ордеров, а платформа помечает его знаком ⚠.",
      tips: [
        "Используйте перевод с баланса на баланс, а не оплату картой.",
        "Продавец: для этого способа можно требовать минимальное число завершённых ордеров.",
        "Никогда не отпускайте XMR по платежу «в обработке» или на проверке.",
      ],
    },
  },
  nequi: {
    pt: {
      slug: "nequi",
      where: "Colômbia",
      intro: "Nequi é a carteira digital mais usada da Colômbia: as transferências entre contas são instantâneas e gratuitas, o que a torna ideal para comprar e vender Monero com pesos colombianos.",
      tips: [
        "Verifique seus limites mensais do Nequi antes de abrir uma ordem grande.",
        "Envie para o número que o vendedor colocou na ordem, não para um informado fora da plataforma.",
        "Vendedor: confirme a movimentação no app do Nequi antes de liberar.",
      ],
    },
    ru: {
      where: "Колумбия",
      intro: "Nequi — самый популярный цифровой кошелёк Колумбии: переводы между счетами мгновенные и бесплатные, поэтому он идеален для покупки и продажи Monero за колумбийские песо.",
      tips: [
        "Перед крупным ордером проверьте месячные лимиты Nequi.",
        "Отправляйте на номер, указанный продавцом в ордере, а не полученный вне платформы.",
        "Продавец: перед отпуском средств проверьте поступление в приложении Nequi.",
      ],
    },
  },
  daviplata: {
    pt: {
      slug: "daviplata",
      where: "Colômbia",
      intro: "Daviplata permite pagar com um número de celular na Colômbia. É uma boa alternativa ao Nequi para comprar ou vender XMR com pesos colombianos.",
      tips: ["Verifique se o nome do titular coincide com o do anunciante.", "Guarde o comprovante da transferência."],
    },
    ru: {
      where: "Колумбия",
      intro: "Daviplata позволяет платить по номеру телефона в Колумбии. Это хорошая альтернатива Nequi для покупки и продажи XMR за колумбийские песо.",
      tips: ["Проверьте, что имя владельца счёта совпадает с именем продавца.", "Сохраните квитанцию о переводе."],
    },
  },
  bancolombia: {
    pt: {
      slug: "bancolombia",
      where: "Colômbia",
      intro: "As transferências de Bancolombia para Bancolombia são instantâneas. Entre bancos diferentes podem demorar mais: escolha anúncios com tempo de pagamento suficiente.",
      tips: ["Use a chave ou conta que aparece na ordem.", "Se a transferência ficar agendada para o próximo dia útil, avise o vendedor no chat."],
    },
    ru: {
      where: "Колумбия",
      intro: "Переводы между счетами Bancolombia мгновенные. Между разными банками они могут идти дольше: выбирайте объявления с достаточным сроком оплаты.",
      tips: ["Используйте ключ или счёт, указанный в ордере.", "Если перевод запланирован на следующий рабочий день, сообщите продавцу в чате."],
    },
  },
  pix: {
    pt: {
      slug: "pix",
      where: "Brasil",
      intro: "Pix é o sistema de pagamentos instantâneos do Brasil: chega em segundos, a qualquer hora. É a forma mais rápida de comprar ou vender Monero com reais.",
      tips: ["Copie a chave Pix da ordem.", "O Pix tem um mecanismo de devolução (MED) para casos de fraude: vendedor, confira se o nome de quem paga coincide."],
    },
    ru: {
      where: "Бразилия",
      intro: "Pix — система мгновенных платежей Бразилии: деньги приходят за секунды в любое время. Это самый быстрый способ купить или продать Monero за бразильские реалы.",
      tips: ["Скопируйте ключ Pix из ордера.", "В Pix есть механизм возврата (MED) при мошенничестве: продавец, проверьте, что имя плательщика совпадает."],
    },
  },
  cbu: {
    pt: {
      slug: "transferencia-cbu-cvu",
      where: "Argentina",
      intro: "Na Argentina, as transferências para um CBU ou CVU são instantâneas entre bancos e carteiras. É a forma mais comum de comprar e vender Monero com pesos argentinos.",
      tips: ["Confira o alias e o nome do titular antes de enviar.", "Vendedor: confirme no internet banking, não por prints."],
    },
    ru: {
      where: "Аргентина",
      intro: "В Аргентине переводы на CBU или CVU мгновенно проходят между банками и кошельками. Это самый распространённый способ покупать и продавать Monero за аргентинские песо.",
      tips: ["Перед отправкой проверьте алиас и имя владельца счёта.", "Продавец: подтверждайте поступление в интернет-банке, а не по скриншотам."],
    },
  },
  yape: {
    pt: {
      slug: "yape",
      where: "Peru",
      intro: "Yape envia soles na hora com um número de celular. É a opção mais prática para comprar Monero no Peru.",
      tips: ["Verifique seu limite diário do Yape.", "Guarde o comprovante do Yape."],
    },
    ru: {
      where: "Перу",
      intro: "Yape мгновенно отправляет соли по номеру телефона. Это самый удобный способ купить Monero в Перу.",
      tips: ["Проверьте дневной лимит Yape.", "Сохраните квитанцию Yape."],
    },
  },
  plin: {
    pt: {
      slug: "plin",
      where: "Peru",
      intro: "Plin funciona dentro de vários apps de bancos peruanos e envia soles na hora. É uma alternativa ao Yape para negociar Monero.",
      tips: ["Confirme com o vendedor que o banco dele recebe Plin."],
    },
    ru: {
      where: "Перу",
      intro: "Plin работает в приложениях нескольких перуанских банков и мгновенно отправляет соли. Это альтернатива Yape для сделок с Monero.",
      tips: ["Уточните у продавца, что его банк принимает Plin."],
    },
  },
  pagomovil: {
    pt: {
      slug: "pago-movil",
      where: "Venezuela",
      intro: "Pago Móvil é a forma de pagamento mais usada da Venezuela: com documento, telefone e banco. O Monero protege sua privacidade da vigilância financeira e da inflação do bolívar.",
      tips: ["Confira o documento, o telefone e o banco do vendedor na ordem.", "O preço em bolívares muda rápido: confira o valor antes de pagar."],
    },
    ru: {
      where: "Венесуэла",
      intro: "Pago Móvil — самый популярный способ оплаты в Венесуэле: по номеру удостоверения, телефону и банку. Monero защищает вашу приватность от финансовой слежки и от инфляции боливара.",
      tips: ["Проверьте в ордере удостоверение, телефон и банк продавца.", "Цена в боливарах меняется быстро: проверьте сумму перед оплатой."],
    },
  },
  zelle: {
    pt: {
      slug: "zelle",
      where: "Estados Unidos",
      intro: "O Zelle movimenta dólares entre bancos dos EUA em minutos e não tem estornos como os cartões, mas existem contas roubadas: o vendedor deve conferir se o nome coincide.",
      tips: ["Pague de uma conta no seu nome.", "Não mencione cripto na mensagem."],
    },
    ru: {
      where: "США",
      intro: "Zelle переводит доллары между банками США за минуты и не имеет чарджбэков, как карты, но бывают украденные аккаунты: продавцу стоит проверить совпадение имени.",
      tips: ["Платите со счёта на своё имя.", "Не упоминайте криптовалюту в комментарии."],
    },
  },
  sepa: {
    pt: {
      slug: "transferencia-sepa",
      where: "zona do euro",
      intro: "Com uma transferência SEPA (ou SEPA Instant) você pode comprar Monero com euros de qualquer banco da zona do euro. A instantânea chega em segundos; a SEPA comum leva um ou dois dias úteis.",
      tips: ["Se o seu banco não tem SEPA Instant, escolha anúncios com prazo de 120 minutos ou avise o vendedor no chat.", "O IBAN e o nome devem coincidir com os do anunciante."],
    },
    ru: {
      where: "еврозона",
      intro: "С переводом SEPA (или SEPA Instant) можно купить Monero за евро из любого банка еврозоны. Мгновенный перевод приходит за секунды, обычный SEPA — за один-два рабочих дня.",
      tips: ["Если в вашем банке нет SEPA Instant, выбирайте объявления со сроком 120 минут или предупредите продавца в чате.", "IBAN и имя должны совпадать с данными продавца."],
    },
  },
  revolut: {
    pt: {
      slug: "revolut",
      where: "Europa e outros",
      intro: "O Revolut é rápido entre usuários, mas conta como reversível: há disputas e bloqueios de conta. A plataforma o marca com ⚠ e os vendedores podem exigir histórico.",
      tips: ["Use transferência entre usuários (Revtag), não cartão."],
    },
    ru: {
      where: "Европа и другие",
      intro: "Revolut быстр между пользователями, но считается отзывным: бывают споры и блокировки счетов. Платформа помечает его знаком ⚠, а продавцы могут требовать историю сделок.",
      tips: ["Используйте перевод между пользователями (Revtag), а не карту."],
    },
  },
  wise: {
    pt: {
      slug: "wise",
      where: "internacional",
      intro: "O Wise permite pagar em muitas moedas com bom câmbio. Serve para comprar Monero em dólares, euros, libras e mais.",
      tips: ["Use a mesma moeda do anúncio para evitar conversões."],
    },
    ru: {
      where: "международный",
      intro: "Wise позволяет платить во многих валютах по хорошему курсу. Подходит для покупки Monero за доллары, евро, фунты и другие валюты.",
      tips: ["Используйте ту же валюту, что и в объявлении, чтобы избежать конвертации."],
    },
  },
  paypal: {
    pt: {
      slug: "paypal",
      where: "internacional",
      intro: "O PayPal é o método mais arriscado para vendedores: um pagamento pode ser revertido semanas depois. Se vender por PayPal, faça isso apenas com compradores que tenham histórico.",
      tips: ["Vendedor: exija um número mínimo de ordens concluídas.", "Comprador: envie como “amigos e família” só se o vendedor pedir e você confiar nele."],
    },
    ru: {
      where: "международный",
      intro: "PayPal — самый рискованный способ для продавцов: платёж могут отменить спустя недели. Если продаёте за PayPal, делайте это только с покупателями с историей сделок.",
      tips: ["Продавец: требуйте минимальное число завершённых ордеров.", "Покупатель: отправляйте как «друзьям и семье», только если продавец просит и вы ему доверяете."],
    },
  },
  cash: {
    pt: {
      slug: "dinheiro",
      where: "na sua cidade",
      intro: "Comprar Monero com dinheiro em mãos é a opção mais privada: nenhum banco envolvido. O XMR fica no escrow enquanto vocês se encontram, e o vendedor libera ao receber o dinheiro.",
      tips: ["Encontre-se em local público, com câmeras e de dia.", "Combinem local e hora no chat da ordem.", "Vendedor: conte e confira as notas antes de liberar."],
    },
    ru: {
      where: "в вашем городе",
      intro: "Покупка Monero за наличные при личной встрече — самый приватный вариант: без участия банков. XMR остаётся в эскроу, пока вы встречаетесь, и продавец отпускает его, получив деньги.",
      tips: ["Встречайтесь в людном месте, под камерами и днём.", "Договоритесь о месте и времени в чате ордера.", "Продавец: пересчитайте и проверьте купюры перед отпуском XMR."],
    },
  },
  interac: {
    pt: {
      slug: "interac",
      where: "Canadá",
      intro: "O Interac e-Transfer envia dólares canadenses entre bancos com um e-mail ou telefone. É a forma habitual de comprar Monero no Canadá.",
      tips: ["Use a pergunta de segurança que o vendedor informar, ou o depósito automático."],
    },
    ru: {
      where: "Канада",
      intro: "Interac e-Transfer переводит канадские доллары между банками по email или телефону. Это обычный способ купить Monero в Канаде.",
      tips: ["Используйте контрольный вопрос продавца или автозачисление."],
    },
  },
  upi: {
    pt: {
      slug: "upi",
      where: "Índia",
      intro: "UPI é o sistema de pagamentos instantâneos da Índia. Permite comprar e vender Monero com rúpias em segundos.",
      tips: ["Pague para o ID UPI que aparece na ordem."],
    },
    ru: {
      where: "Индия",
      intro: "UPI — система мгновенных платежей Индии. Позволяет покупать и продавать Monero за рупии за секунды.",
      tips: ["Платите на UPI ID, указанный в ордере."],
    },
  },
};

export const COUNTRY_I18N: Record<string, { pt: CountryTr; ru: CountryTr }> = {
  mx: {
    pt: { slug: "no-mexico", name: "México", fiatName: "pesos mexicanos", loc: "no México", note: "No México a opção mais rápida é o SPEI: o pagamento chega em segundos e não pode ser revertido. Sem conta bancária, você pode pagar com depósito no OXXO ou em dinheiro pessoalmente." },
    ru: { name: "Мексика", fiatName: "мексиканские песо", loc: "в Мексике", note: "В Мексике быстрее всего SPEI: платёж приходит за секунды и не отменяется. Без банковского счёта можно заплатить внесением наличных в OXXO или наличными при встрече." },
  },
  co: {
    pt: { slug: "na-colombia", name: "Colômbia", fiatName: "pesos colombianos", loc: "na Colômbia", note: "Na Colômbia a maioria paga com Nequi ou Daviplata, que são instantâneos e gratuitos; o Bancolombia também é instantâneo entre contas do mesmo banco." },
    ru: { name: "Колумбия", fiatName: "колумбийские песо", loc: "в Колумбии", note: "В Колумбии чаще всего платят через Nequi или Daviplata — мгновенно и бесплатно; Bancolombia тоже мгновенен между счетами одного банка." },
  },
  ar: {
    pt: { slug: "na-argentina", name: "Argentina", fiatName: "pesos argentinos", loc: "na Argentina", note: "Na Argentina se usam transferências para CBU ou CVU, instantâneas entre bancos e carteiras. O Mercado Pago também é usado, mas é marcado como reversível." },
    ru: { name: "Аргентина", fiatName: "аргентинские песо", loc: "в Аргентине", note: "В Аргентине используют переводы на CBU или CVU, мгновенные между банками и кошельками. Mercado Pago тоже используется, но помечен как отзывный." },
  },
  pe: {
    pt: { slug: "no-peru", name: "Peru", fiatName: "soles", loc: "no Peru", note: "No Peru as opções mais práticas são Yape ou Plin: você envia soles na hora com um número de celular." },
    ru: { name: "Перу", fiatName: "соли", loc: "в Перу", note: "В Перу удобнее всего Yape или Plin: соли отправляются мгновенно по номеру телефона." },
  },
  ve: {
    pt: { slug: "na-venezuela", name: "Venezuela", fiatName: "bolívares", loc: "na Venezuela", note: "Na Venezuela se paga com Pago Móvil. Muitos usam o Monero para poupar fora do bolívar, com privacidade." },
    ru: { name: "Венесуэла", fiatName: "боливары", loc: "в Венесуэле", note: "В Венесуэле платят через Pago Móvil. Многие используют Monero, чтобы приватно хранить сбережения вне боливара." },
  },
  cl: {
    pt: { slug: "no-chile", name: "Chile", fiatName: "pesos chilenos", loc: "no Chile", note: "No Chile se usam transferências bancárias eletrônicas, que costumam ser instantâneas. Procure anúncios com “Bank transfer” em CLP." },
    ru: { name: "Чили", fiatName: "чилийские песо", loc: "в Чили", note: "В Чили используют электронные банковские переводы, обычно мгновенные. Ищите объявления с «Bank transfer» в CLP." },
  },
  br: {
    pt: { slug: "no-brasil", name: "Brasil", fiatName: "reais", loc: "no Brasil", note: "No Brasil tudo se paga com Pix: chega em segundos, a qualquer hora. Compre e venda Monero com reais de pessoa para pessoa." },
    ru: { name: "Бразилия", fiatName: "бразильские реалы", loc: "в Бразилии", note: "В Бразилии всё оплачивают через Pix: деньги приходят за секунды в любое время." },
  },
  es: {
    pt: { slug: "na-espanha", name: "Espanha", fiatName: "euros", loc: "na Espanha", note: "Na Espanha o método habitual é a transferência SEPA Instant. Wise e Revolut também são usados (o Revolut é marcado como reversível)." },
    ru: { name: "Испания", fiatName: "евро", loc: "в Испании", note: "В Испании обычно используют мгновенный перевод SEPA Instant. Также используют Wise и Revolut (Revolut помечен как отзывный)." },
  },
  us: {
    pt: { slug: "nos-estados-unidos", name: "Estados Unidos", fiatName: "dólares americanos", loc: "nos Estados Unidos", note: "Nos Estados Unidos o mais usado é o Zelle. PayPal e Cash App podem ser revertidos: os vendedores costumam exigir histórico." },
    ru: { name: "США", fiatName: "доллары США", loc: "в США", note: "В США чаще всего используют Zelle. Платежи PayPal и Cash App можно отменить: продавцы обычно требуют историю сделок." },
  },
};
