import type { IconName } from "@platitprosim/ui";

export interface Point {
  icon: IconName;
  title: string;
  body: string;
}

export interface ComparisonRow {
  label: string;
  cardTerminal: string;
  platitProsim: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/** Types a list of points, so the icon names stay `IconName` rather than literals. */
export const points = (items: Point[]): Point[] => items;

export const cs = {
  meta: {
    title: "Platit prosím – platby QR kódem bez poplatků",
    description:
      "Platební terminál v telefonu. Zákazník zaplatí převodem přes QR kód nebo bitcoinem. Bez poplatků, bez serveru, data zůstávají ve vašich zařízeních.",
  },
  nav: {
    home: "Platit prosím, úvod",
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
    titleAccent: "bez\u00a0poplatků",
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
        body: "Kdo kolik dnes vybral, na jedno klepnutí.",
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
    body: "Přidejte zaměstnance naskenováním jeho profilu v Linky. Na svém telefonu se přihlásí přes Linky a může hned přijímat platby.",
    points: points([
      {
        icon: "LogIn",
        title: "Přihlášení přes Linky",
        body: "Žádná hesla ani nové účty. Zaměstnanec jen potvrdí přihlášení v Linky.",
      },
      {
        icon: "Eye",
        title: "Každý vidí, co má",
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
        title: "Výběr na Lightning adresu",
        body: "Zadáte adresu a částku, hotovo.",
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
    title: "Proč ne platební terminál?",
    body: "Karetní terminál si z každé platby vezme procenta a potřebuje vlastní hardware. Platit prosím nic z toho.",
    cardTerminal: "Karetní terminál",
    platitProsim: "Platit prosím",
    rows: [
      {
        label: "Poplatek z platby",
        cardTerminal: "1–2 % z každé platby",
        platitProsim: "0 Kč",
      },
      {
        label: "Hardware",
        cardTerminal: "Terminál ke koupi nebo pronájmu",
        platitProsim: "Telefon, který už máte",
      },
      {
        label: "Měsíční paušál",
        cardTerminal: "Často ano",
        platitProsim: "Žádný",
      },
      {
        label: "Smlouva",
        cardTerminal: "S bankou nebo poskytovatelem",
        platitProsim: "Žádná, stačí otevřít aplikaci",
      },
      {
        label: "Vaše data",
        cardTerminal: "U poskytovatele",
        platitProsim: "Jen ve vašich zařízeních",
      },
    ] satisfies ComparisonRow[],
    note: "Karty zatím nepřijímáme: zákazník potřebuje bankovní aplikaci nebo bitcoinovou peněženku.",
  },
  privacy: {
    eyebrow: "Soukromí",
    title: "Žádný účet. Žádný server. Vaše data.",
    body: "Platit prosím je local-first. Všechno se ukládá ve vašem telefonu a mezi vašimi zařízeními se synchronizuje šifrovaně přes Evolu.",
    points: points([
      {
        icon: "User",
        title: "Bez registrace",
        body: "Žádný e-mail, telefon ani heslo. Otevřete aplikaci a začnete.",
      },
      {
        icon: "Smartphone",
        title: "Bez serveru",
        body: "Nemáme server, na který by šly vaše platby. Nemáme co ztratit ani prodat.",
      },
      {
        icon: "ShieldCheck",
        title: "Šifrovaná synchronizace",
        body: "Zařízení se synchronizují end-to-end šifrovaně, relay vidí jen šifru.",
      },
      {
        icon: "KeyRound",
        title: "Záložní fráze",
        body: "12 slov obnoví obchod, historii, peněženku i zaměstnance na novém telefonu.",
      },
    ]),
  },
  faq: {
    eyebrow: "Otázky",
    title: "Časté otázky",
    items: [
      {
        question: "Opravdu to nic nestojí?",
        answer:
          "Ano. Převod jde z účtu zákazníka rovnou na váš účet a nikdo si z něj nic nebere. U bitcoinu zaplatíte jen malý síťový poplatek, když peníze vybíráte přes Lightning.",
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
          "Na novém zařízení zadáte 12 slov záložní fráze a vše se obnoví: obchod, historie, peněženka i zaměstnanci.",
      },
      {
        question: "Co je Lightning a Cashu?",
        answer:
          "Lightning je síť pro rychlé a levné bitcoinové platby. Cashu je digitální hotovost krytá bitcoinem, která se posílá jako zpráva. Aplikace přijme obojí z jednoho QR kódu.",
      },
      {
        question: "Funguje to i na tabletu nebo počítači?",
        answer:
          "Ano. Platit prosím je webová aplikace, kterou si z prohlížeče nainstalujete na telefon, tablet i počítač.",
      },
      {
        question: "Je to open source?",
        answer: "Ano, celý zdrojový kód najdete na GitHubu.",
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
    you: "Vy",
    owner: "Majitel",
    tabs: {
      label: "Sekce aplikace",
      terminal: "Terminál",
      history: "Historie",
      team: "Tým",
      wallet: "Peněženka",
      settings: "Nastavení",
    },
    currency: "Kč",
    sat: "sat",
    amount: "Částka",
    decimal: "Desetinná čárka",
    backspace: "Smazat",
    requestPayment: "Požadovat platbu",
    payment: "Platba",
    cancel: "Zrušit",
    markPaid: "Zaplaceno",
    method: "Způsob platby",
    bank: "Banka",
    bitcoin: "Bitcoin",
    lightning: "Lightning",
    cashu: "Cashu",
    account: "Účet",
    variableSymbol: "VS",
    demoData: "Demo data, neplaťte",
    bankQr: "QR kód pro platbu z banky",
    bitcoinQr: "QR kód pro platbu bitcoinem",
    waiting: "Čekáme na platbu…",
    rate: (rate: string) => `Demo kurz 1 BTC = ${rate} Kč`,
    autoPay: "V demu platba za chvíli dorazí sama.",
    paid: "Zaplaceno",
    newPayment: "Nová platba",
    bankDetail: (vs: string) => `Banka · VS ${vs}`,
    bitcoinDetail: (sats: string) => `Lightning · ${sats} sat`,
    status: { pending: "Čeká", paid: "Zaplaceno", cancelled: "Zrušeno" },
    today: "Dnes",
    dayTotal: "Dnes celkem",
    paymentCount: (count: number) =>
      `${count} ${count === 1 ? "platba" : count < 5 ? "platby" : "plateb"}`,
    filter: "Filtr podle zaměstnance",
    everyone: "Všichni",
    employee: "Zaměstnanec",
    addEmployee: "Přidat zaměstnance",
    scanHint: "Namiřte kameru na QR profilu v Linky",
    scanner: "Skener profilu",
    profileFound: "Profil v Linky nalezen",
    name: "Jméno",
    add: "Přidat",
    addedToday: "Přidán dnes",
    todayTotal: (amount: string) => `Dnes ${amount}`,
    balance: "Zůstatek",
    withdraw: "Vybrat na Lightning adresu",
    sendToLinky: "Poslat do Linky",
    lightningAddress: "Lightning adresa",
    linkyProfile: "Profil v Linky",
    withdrawAll: "Vybrat vše",
    send: "Poslat",
    sent: "Odesláno",
    recent: "Poslední příjmy",
    received: "Přijato automaticky",
    backupPhrase: "Záložní fráze",
    backupNote:
      "Těchto 12 slov obnoví obchod, historii, peněženku i zaměstnance.",
    word: (position: number) => `Slovo ${position}`,
    language: "Jazyk",
    languageValue: "Čeština",
    shop: "Obchod",
    restore: "Obnovit ze záložní fráze",
    reset: "Resetovat toto zařízení",
    terminalDemo: "Živé demo terminálu",
    historyDemo: "Ukázka historie plateb",
    teamDemo: "Ukázka správy zaměstnanců",
    walletDemo: "Ukázka peněženky",
    settingsDemo: "Ukázka nastavení se záložní frází",
  },
};

export type SiteCopy = typeof cs;
