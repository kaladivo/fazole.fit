import type { IconName } from "@platitprosim/ui";

export interface Point {
  icon: IconName;
  title: string;
  body: string;
}

export interface ComparisonRow {
  label: string;
  cardTerminal: string;
  fazole: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Types a list of points, so the icon names stay `IconName` rather than literals. */
export const points = (items: Point[]): Point[] => items;

export const cs = {
  meta: {
    title: "fazole.fit – platby QR kódem bez provizí",
    description:
      "Platební terminál v telefonu. Zákazník zaplatí převodem přes QR kód nebo bitcoinem. Bez provizí, bez serveru, data zůstávají ve vašich zařízeních.",
    socialDescription:
      "Telefon jako platební terminál. Převodem přes QR kód nebo bitcoinem, bez provizí a bez serveru.",
    imageAlt: "fazole.fit: telefon s platebním terminálem a QR kódem",
    ogLocale: "cs_CZ",
  },
  nav: {
    home: "fazole.fit, úvod",
    howItWorks: "Jak to funguje",
    team: "Zaměstnanci",
    comparison: "Srovnání",
    faq: "Otázky",
    openApp: "Otevřít aplikaci",
    switchLanguage: "Switch to English",
    languageShort: "EN",
    toDark: "Tmavý vzhled",
    toLight: "Světlý vzhled",
  },
  hero: {
    eyebrow: "Platební terminál v telefonu",
    titleBefore: "Přijímejte platby ",
    titleAccent: "bez\u00a0provizí",
    titleAfter: "",
    subtitle:
      "Zákazník naskenuje QR kód a zaplatí převodem z banky, nebo bitcoinem přes Lightning či Cashu. Terminálem je váš telefon. Žádný server, žádný účet: data zůstávají ve vašich zařízeních.",
    primaryCta: "Otevřít aplikaci",
    secondaryCta: "Jak to funguje",
    methods: ["QR platba", "Lightning", "Cashu"],
    demoLabel: "Živé demo",
    demoHint: "Zadejte částku a vyzkoušejte si celou platbu.",
  },
  how: {
    eyebrow: "Jak to funguje",
    title: "Tři kroky a máte zaplaceno",
    steps: points([
      {
        icon: "QrCode",
        title: "Zadejte částku",
        body: "Naťukejte částku na velké klávesnici a stiskněte Požadovat platbu.",
      },
      {
        icon: "ScanLine",
        title: "Zákazník naskenuje QR",
        body: "Bankovní aplikací pro převod, nebo bitcoinovou peněženkou.",
      },
      {
        icon: "CircleCheck",
        title: "Potvrďte platbu",
        body: "Platba se uloží do historie i s tím, kdo ji vytvořil.",
      },
    ]),
    bank: {
      title: "Banka",
      pill: "Potvrzujete vy",
      body: "QR platba ve formátu SPD, kterou umí všechny české banky. Peníze jdou rovnou na váš účet. Jakmile je uvidíte, klepněte na Zaplaceno.",
    },
    bitcoin: {
      title: "Bitcoin",
      pill: "Potvrzeno automaticky",
      body: "Lightning i Cashu v jednom QR kódu (BIP-321). Aplikace platbu pozná sama a hned ukáže potvrzení.",
    },
  },
  history: {
    eyebrow: "Historie",
    title: "Každá platba na jednom místě",
    body: "Čas, částka, způsob platby, stav a kdo platbu vytvořil. Filtrujte podle zaměstnance a mějte přehled o tržbě za den.",
    points: points([
      {
        icon: "Users",
        title: "Filtr podle zaměstnance",
        body: "Kdo kolik dnes přijal, na jedno klepnutí.",
      },
      {
        icon: "Clock",
        title: "Součet za den",
        body: "Tržba v korunách, platby převodem i bitcoinem dohromady.",
      },
    ]),
  },
  team: {
    eyebrow: "Zaměstnanci",
    title: "Celý tým, jedna pokladna",
    body: "Zaměstnance přidáte naskenováním profilu v Linky. Zaměstnanec se pak na svém telefonu přihlásí přes Linky a může přijímat platby.",
    points: points([
      {
        icon: "LogIn",
        title: "Přihlášení přes Linky",
        body: "Žádná hesla ani nové účty. Zaměstnanec jen potvrdí přihlášení v Linky.",
      },
      {
        icon: "Eye",
        title: "Každý vidí jen svoje",
        body: "Zaměstnanec vidí jen svoje platby. Vy jako majitel vidíte všechno.",
      },
      {
        icon: "KeyRound",
        title: "Bitcoin putuje k vám",
        body: "Od zákazníka přes telefon zaměstnance k vám, uzamčený vaším klíčem. Utratit ho můžete jen vy.",
      },
    ]),
    flow: {
      label: "Cesta bitcoinové platby",
      customer: "Zákazník",
      employee: "Telefon zaměstnance",
      owner: "Majitel",
      lock: "Uzamčeno klíčem majitele",
    },
  },
  wallet: {
    eyebrow: "Peněženka",
    title: "Bitcoin, který máte opravdu u sebe",
    body: "Zůstatek v satoshi i v korunách. Platby od zaměstnanců se připíší samy. Vybírejte na Lightning adresu, nebo pošlete do Linky.",
    points: points([
      {
        icon: "Zap",
        title: "Výběr přes Lightning",
        body: "Zadáte Lightning adresu nebo fakturu, zkontrolujete poplatek a odešlete.",
      },
      {
        icon: "Send",
        title: "Poslat do Linky",
        body: "Naskenujte profil v Linky a pošlete satoshi jako zprávu.",
      },
    ]),
  },
  comparison: {
    eyebrow: "Srovnání",
    title: "Proč ne karetní terminál?",
    body: "Karetní terminál si z každé platby vezme procenta a potřebuje vlastní hardware. U fazole.fit odpadá obojí.",
    cardTerminal: "Karetní terminál",
    fazole: "fazole.fit",
    rows: [
      {
        label: "Poplatek z platby",
        cardTerminal: "1–2 % z každé platby",
        fazole: "Převodem 0 Kč, bitcoinem pár satoshi",
      },
      {
        label: "Hardware",
        cardTerminal: "Terminál ke koupi nebo pronájmu",
        fazole: "Telefon, který už máte",
      },
      {
        label: "Měsíční paušál",
        cardTerminal: "Často ano",
        fazole: "Žádný",
      },
      {
        label: "Smlouva",
        cardTerminal: "S bankou nebo poskytovatelem",
        fazole: "Žádná, stačí otevřít aplikaci",
      },
      {
        label: "Vaše data",
        cardTerminal: "U poskytovatele",
        fazole: "Jen ve vašich zařízeních",
      },
    ] satisfies ComparisonRow[],
    note: "Karty zatím nepřijímáme: zákazník potřebuje bankovní aplikaci nebo bitcoinovou peněženku.",
  },
  privacy: {
    eyebrow: "Soukromí",
    title: "Žádný účet. Žádný server. Vaše data.",
    body: "fazole.fit je local-first. Všechno se ukládá ve vašem telefonu a mezi vašimi zařízeními se synchronizuje šifrovaně přes Evolu.",
    points: points([
      {
        icon: "User",
        title: "Bez registrace",
        body: "Žádný e-mail, telefon ani heslo. Otevřete aplikaci a můžete začít.",
      },
      {
        icon: "Smartphone",
        title: "Bez serveru",
        body: "Nemáme server, na který by šly vaše platby. Nemáme co ztratit ani prodat.",
      },
      {
        icon: "ShieldCheck",
        title: "Šifrovaná synchronizace",
        body: "Zařízení se synchronizují end-to-end šifrovaně, relay vidí jen zašifrovaná data.",
      },
      {
        icon: "KeyRound",
        title: "Záložní fráze",
        body: "24 slov obnoví obchod, historii, peněženku i zaměstnance na novém telefonu.",
      },
    ]),
  },
  faq: {
    eyebrow: "Otázky",
    title: "Časté otázky",
    items: [
      {
        question: "Kolik to stojí?",
        answer:
          "Aplikace je zdarma a z plateb si nic nebere. Převod jde z účtu zákazníka rovnou na váš účet bez poplatků. U bitcoinu si mincovna Cashu účtuje malé poplatky, obvykle pár satoshi: když platbu přijmete, když ji telefon zaměstnance posílá vám a když peníze vybíráte.",
      },
      {
        question: "Co potřebuje zákazník?",
        answer:
          "Bankovní aplikaci, která umí QR platby (umí to všechny české banky), nebo bitcoinovou peněženku s Lightning či Cashu, třeba Linky.",
      },
      {
        question: "Jak poznám, že platba z banky dorazila?",
        answer:
          "Ověříte si ji ve své bance, třeba podle notifikace. Každá platba má vlastní variabilní symbol, takže ji snadno najdete. Pak klepnete na Zaplaceno.",
      },
      {
        question: "Co když ztratím telefon?",
        answer:
          "Na novém zařízení zadáte 24 slov záložní fráze a vše se obnoví: obchod, historie, peněženka i zaměstnanci.",
      },
      {
        question: "Co je Lightning a Cashu?",
        answer:
          "Lightning je síť pro rychlé a levné bitcoinové platby. Cashu je digitální hotovost krytá bitcoinem, která se posílá jako zpráva. Aplikace přijme obojí z jednoho QR kódu.",
      },
      {
        question: "Funguje to i na tabletu nebo počítači?",
        answer:
          "Ano. fazole.fit je webová aplikace, kterou si z prohlížeče nainstalujete na telefon, tablet i počítač.",
      },
      {
        question: "Je to open source?",
        answer: "Ano, celý zdrojový kód najdete na GitHubu.",
      },
      {
        question: "Proč zrovna fazole?",
        answer:
          "Fazole se říkalo prvním online penězům na českém internetu. Na ně navazujeme: peníze, které jdou z ruky do ruky bez prostředníka. A s fazolemi se počítá snadno.",
      },
    ] satisfies FaqItem[],
  },
  closing: {
    title: "Začněte přijímat platby ještě dnes",
    body: "Otevřete aplikaci, zadejte název obchodu a číslo účtu. Víc není potřeba.",
  },
  footer: {
    tagline: "Platební terminál pro české obchodníky.",
    linky: "Linky",
    github: "GitHub",
  },
  demo: {
    shopName: "Kavárna U Lípy",
    tabs: {
      label: "Hlavní sekce",
      terminal: "Terminál",
      history: "Historie",
      team: "Tým",
      wallet: "Peněženka",
      settings: "Nastavení",
    },
    close: "Zavřít",
    currency: "Kč",
    sat: "sat",
    amountCzk: (amount: string) => `${amount} Kč`,
    amountSats: (sats: string) => `${sats} sat`,
    amount: "Částka",
    decimal: "Desetinná čárka",
    backspace: "Smazat",
    requestPayment: "Požadovat platbu",
    payment: "Platba",
    method: "Způsob platby",
    bank: "Banka",
    bitcoin: "Bitcoin",
    lightning: "Lightning",
    cashu: "Cashu",
    bankQr: (amount: string) => `QR kód pro platbu ${amount} z banky`,
    bitcoinQr: (amount: string) => `QR kód pro platbu ${amount} bitcoinem`,
    variableSymbol: "Variabilní symbol",
    account: "Účet",
    recipient: "Příjemce",
    markPaid: "Zaplaceno",
    cancelPayment: "Zrušit platbu",
    inBitcoin: "V bitcoinu",
    rate: "Kurz",
    rateValue: (rate: string) => `1 BTC = ${rate} Kč`,
    waiting: "Čekám na platbu…",
    bitcoinHint:
      "Zaplaťte z jakékoli Lightning nebo Cashu peněženky, třeba z Linky.",
    autoPay: "V demu platba za chvíli dorazí sama.",
    demoData: "Demo data, neplaťte",
    paid: "Zaplaceno",
    newPayment: "Nová platba",
    status: { pending: "Čeká", paid: "Zaplaceno", cancelled: "Zrušeno" },
    historyEmptyTitle: "Zatím žádné platby",
    historyEmptyDescription:
      "Platby, které vytvoříte v terminálu, se objeví tady.",
    today: "Dnes",
    yesterday: "Včera",
    dayTotal: (amount: string) => `Přijato ${amount}`,
    me: "Já",
    employee: "Zaměstnanec",
    everyone: "Všichni",
    filterTitle: "Kdo platbu přijal",
    paymentDetail: "Detail platby",
    created: "Vytvořeno",
    paidAt: "Zaplaceno",
    createdBy: "Obsluha",
    funds: "Peníze",
    fundsInWallet: "V peněžence",
    addEmployee: "Přidat zaměstnance",
    addEmployeeDescription:
      "Naskenujte QR kód profilu v Linky, nebo vložte npub.",
    linkyProfile: "Profil v Linky",
    linkyProfileHint: "npub, nprofile nebo odkaz na profil v Linky",
    linkyProfileInvalid: "Tohle není profil v Linky.",
    alreadyAdded: "Tento zaměstnanec už v týmu je.",
    scan: "Naskenovat QR kód profilu",
    scanner: "Čtečka QR kódu",
    scanHint: "Namiřte kameru na QR kód profilu v Linky",
    profileMissing: "Profil v Linky bez jména",
    name: "Jméno",
    nameHint: "Uvidíte ho v historii plateb.",
    addToTeam: "Přidat do týmu",
    deviceWaiting: "Čeká na přihlášení",
    deviceLinked: "Propojeno",
    teamHint:
      "Jakmile se zaměstnanec na svém zařízení přihlásí přes Linky, zařízení se propojí samo.",
    balance: "Zůstatek",
    balanceCzk: (amount: string) => `≈ ${amount} Kč`,
    withdraw: "Vybrat přes Lightning",
    sendToLinky: "Poslat do Linky",
    activity: "Pohyby",
    activityIn: (sats: string) => `+${sats} sat`,
    activityOut: (sats: string) => `−${sats} sat`,
    withdrawalLightning: "Výběr přes Lightning",
    withdrawalLinky: "Posláno do Linky",
    withdrawTarget: "Lightning adresa nebo faktura",
    withdrawTargetPlaceholder: "jmeno@domena.cz",
    withdrawTargetInvalid: "Zadejte Lightning adresu nebo fakturu s částkou.",
    amountInvalid: "Zadejte celé číslo satoshi.",
    insufficient: "V peněžence na to není dost peněz i s poplatkem.",
    amountHint: (amount: string, sats: string) =>
      `≈ ${amount} Kč · k dispozici ${sats} sat`,
    available: (sats: string) => `K dispozici ${sats} sat`,
    send: "Odeslat",
    withdrawPaid: "Odesláno",
    withdrawPaidDetail: (sats: string) => `${sats} sat odešlo přes Lightning.`,
    linkySent: "Odesláno do Linky",
    linkySentDetail: (sats: string) => `${sats} sat dorazí do chatu v Linky.`,
    done: "Hotovo",
    language: "Jazyk",
    languageCs: "Čeština",
    languageEn: "English",
    theme: "Vzhled",
    themeSystem: "Systém",
    themeLight: "Světlý",
    themeDark: "Tmavý",
    shop: "Obchod",
    security: "Zabezpečení",
    backupPhrase: "Záložní fráze",
    backupNote:
      "Těchto 24 slov obnoví obchod, historii, peněženku i zaměstnance.",
    backupWarning: "Slova nikomu neukazujte. Kdo je zná, má přístup k obchodu.",
    backupWords: "Slova záložní fráze",
    word: (position: number) => `Slovo ${position}`,
    restore: "Obnovit ze zálohy",
    reset: "Resetovat toto zařízení",
    about: "O aplikaci",
    mint: "Mincovna",
    terminalDemo: "Živé demo terminálu",
    historyDemo: "Ukázka historie plateb",
    teamDemo: "Ukázka správy zaměstnanců",
    walletDemo: "Ukázka peněženky",
    settingsDemo: "Ukázka nastavení se záložní frází",
  },
};

export type SiteCopy = typeof cs;
