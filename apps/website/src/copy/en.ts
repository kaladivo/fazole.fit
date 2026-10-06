import { points } from "./cs";
import type { SiteCopy } from "./cs";

export const en: SiteCopy = {
  meta: {
    title: "Platit prosím – QR payments with no fees",
    description:
      "A payment terminal on your phone. Customers pay by bank transfer via a QR code or with Bitcoin. No fees, no server, your data stays on your devices.",
  },
  nav: {
    home: "Platit prosím, home",
    howItWorks: "How it works",
    team: "Employees",
    comparison: "Comparison",
    faq: "FAQ",
    openApp: "Open the app",
    switchLanguage: "Přepnout do češtiny",
    languageShort: "CS",
    toDark: "Dark appearance",
    toLight: "Light appearance",
  },
  hero: {
    eyebrow: "A payment terminal on your phone",
    titleBefore: "Accept payments ",
    titleAccent: "with no\u00a0fees",
    titleAfter: "",
    subtitle:
      "Customers scan a QR code and pay by bank transfer, or with Bitcoin over Lightning or Cashu. Your phone is the terminal. No server, no account: your data stays on your devices.",
    primaryCta: "Open the app",
    secondaryCta: "How it works",
    methods: ["Bank QR", "Lightning", "Cashu"],
    demoLabel: "Live demo",
    demoHint: "Type an amount and try a whole payment.",
  },
  how: {
    eyebrow: "How it works",
    title: "Three steps to paid",
    steps: points([
      {
        icon: "QrCode",
        title: "Enter the amount",
        body: "Tap the amount on the big keypad and press Request payment.",
      },
      {
        icon: "ScanLine",
        title: "The customer scans",
        body: "With their banking app for a transfer, or with a Bitcoin wallet.",
      },
      {
        icon: "CircleCheck",
        title: "Confirm",
        body: "The payment lands in the history, along with who took it.",
      },
    ]),
    bank: {
      title: "Bank",
      pill: "You confirm",
      body: "An SPD QR payment, which every Czech bank supports. The money goes straight to your account. Once you see it, tap Paid.",
    },
    bitcoin: {
      title: "Bitcoin",
      pill: "Confirmed automatically",
      body: "Lightning and Cashu in a single QR code (BIP-321). The app detects the payment by itself and shows the confirmation right away.",
    },
  },
  history: {
    eyebrow: "History",
    title: "Every payment in one place",
    body: "Time, amount, method, status and who created the payment. Filter by employee and keep track of the day's takings.",
    points: points([
      {
        icon: "Users",
        title: "Filter by employee",
        body: "Who took how much today, in one tap.",
      },
      {
        icon: "Clock",
        title: "Daily total",
        body: "Takings in crowns, bank and Bitcoin payments together.",
      },
    ]),
  },
  team: {
    eyebrow: "Employees",
    title: "One till for the whole team",
    body: "Add an employee by scanning their Linky profile. They log in with Linky on their own phone and can take payments right away.",
    points: points([
      {
        icon: "LogIn",
        title: "Log in with Linky",
        body: "No passwords and no new accounts. The employee just confirms the login in Linky.",
      },
      {
        icon: "Eye",
        title: "Everyone sees their part",
        body: "Employees see only their own payments. As the owner, you see everything.",
      },
      {
        icon: "KeyRound",
        title: "Bitcoin travels to you",
        body: "From the customer through the employee's phone to you, locked to your key. Only you can spend it.",
      },
    ]),
    flow: {
      label: "How a Bitcoin payment travels",
      customer: "Customer",
      employee: "Employee's phone",
      owner: "Owner",
      lock: "Locked to the owner's key",
    },
  },
  wallet: {
    eyebrow: "Wallet",
    title: "Bitcoin you actually hold",
    body: "The balance in sats and in crowns. Payments from employees arrive by themselves. Withdraw to a Lightning address, or send to Linky.",
    points: points([
      {
        icon: "Zap",
        title: "Withdraw to a Lightning address",
        body: "Enter the address and the amount, done.",
      },
      {
        icon: "Send",
        title: "Send to Linky",
        body: "Scan a Linky profile and send sats as a message.",
      },
    ]),
  },
  comparison: {
    eyebrow: "Comparison",
    title: "Why not a card terminal?",
    body: "A card terminal takes a percentage of every payment and needs its own hardware. Platit prosím needs neither.",
    cardTerminal: "Card terminal",
    platitProsim: "Platit prosím",
    rows: [
      {
        label: "Fee per payment",
        cardTerminal: "1–2 % of every payment",
        platitProsim: "CZK 0",
      },
      {
        label: "Hardware",
        cardTerminal: "A terminal to buy or rent",
        platitProsim: "The phone you already have",
      },
      {
        label: "Monthly fee",
        cardTerminal: "Often",
        platitProsim: "None",
      },
      {
        label: "Contract",
        cardTerminal: "With a bank or a provider",
        platitProsim: "None, just open the app",
      },
      {
        label: "Your data",
        cardTerminal: "With the provider",
        platitProsim: "Only on your devices",
      },
    ],
    note: "We don't take cards yet: the customer needs a banking app or a Bitcoin wallet.",
  },
  privacy: {
    eyebrow: "Privacy",
    title: "No account. No server. Your data.",
    body: "Platit prosím is local-first. Everything is stored on your phone and synced between your devices with end-to-end encryption through Evolu.",
    points: points([
      {
        icon: "User",
        title: "No sign-up",
        body: "No email, phone number or password. Open the app and start.",
      },
      {
        icon: "Smartphone",
        title: "No server",
        body: "There is no server your payments go through. We have nothing to lose or sell.",
      },
      {
        icon: "ShieldCheck",
        title: "Encrypted sync",
        body: "Devices sync end-to-end encrypted; the relay only sees ciphertext.",
      },
      {
        icon: "KeyRound",
        title: "Backup phrase",
        body: "12 words restore the shop, the history, the wallet and the employees on a new phone.",
      },
    ]),
  },
  faq: {
    eyebrow: "FAQ",
    title: "Frequently asked questions",
    items: [
      {
        question: "Is it really free?",
        answer:
          "Yes. A transfer goes from the customer's account straight to yours and nobody takes a cut. With Bitcoin you only pay a small network fee when you withdraw over Lightning.",
      },
      {
        question: "What does the customer need?",
        answer:
          "A banking app with QR payments (every Czech bank has them), or a Bitcoin wallet with Lightning or Cashu, such as Linky.",
      },
      {
        question: "How do I know a bank payment arrived?",
        answer:
          "Check it in your bank, for example by its notification. Every payment has its own variable symbol, so it is easy to find. Then tap Paid.",
      },
      {
        question: "What if I lose my phone?",
        answer:
          "Enter the 12 words of your backup phrase on a new device and everything comes back: the shop, the history, the wallet and the employees.",
      },
      {
        question: "What are Lightning and Cashu?",
        answer:
          "Lightning is a network for fast and cheap Bitcoin payments. Cashu is digital cash backed by Bitcoin that is sent as a message. The app accepts both from one QR code.",
      },
      {
        question: "Does it work on a tablet or a computer?",
        answer:
          "Yes. Platit prosím is a web app that you install from the browser on a phone, a tablet or a computer.",
      },
      {
        question: "Is it open source?",
        answer: "Yes, all of the source code is on GitHub.",
      },
    ],
  },
  closing: {
    title: "Start taking payments today",
    body: "Open the app, enter your shop name and bank account. That's all it takes.",
  },
  footer: {
    tagline: "A payment terminal for Czech merchants.",
    linky: "Linky",
    github: "GitHub",
  },
  demo: {
    shopName: "Linden Café",
    you: "You",
    owner: "Owner",
    tabs: {
      label: "App sections",
      terminal: "Terminal",
      history: "History",
      team: "Team",
      wallet: "Wallet",
      settings: "Settings",
    },
    currency: "CZK",
    sat: "sat",
    amount: "Amount",
    decimal: "Decimal comma",
    backspace: "Delete",
    requestPayment: "Request payment",
    payment: "Payment",
    cancel: "Cancel",
    markPaid: "Paid",
    method: "Payment method",
    bank: "Bank",
    bitcoin: "Bitcoin",
    lightning: "Lightning",
    cashu: "Cashu",
    account: "Account",
    variableSymbol: "VS",
    demoData: "Demo data, do not pay",
    bankQr: "QR code for a bank payment",
    bitcoinQr: "QR code for a Bitcoin payment",
    waiting: "Waiting for the payment…",
    rate: (rate: string) => `Demo rate 1 BTC = CZK ${rate}`,
    autoPay: "In the demo, the payment arrives by itself in a moment.",
    paid: "Paid",
    newPayment: "New payment",
    bankDetail: (vs: string) => `Bank · VS ${vs}`,
    bitcoinDetail: (sats: string) => `Lightning · ${sats} sat`,
    status: { pending: "Pending", paid: "Paid", cancelled: "Cancelled" },
    today: "Today",
    dayTotal: "Today's total",
    paymentCount: (count: number) =>
      `${count} ${count === 1 ? "payment" : "payments"}`,
    filter: "Filter by employee",
    everyone: "Everyone",
    employee: "Employee",
    addEmployee: "Add an employee",
    scanHint: "Point the camera at a Linky profile QR",
    scanner: "Profile scanner",
    profileFound: "Linky profile found",
    name: "Name",
    add: "Add",
    addedToday: "Added today",
    todayTotal: (amount: string) => `Today ${amount}`,
    balance: "Balance",
    withdraw: "Withdraw to a Lightning address",
    sendToLinky: "Send to Linky",
    lightningAddress: "Lightning address",
    linkyProfile: "Linky profile",
    withdrawAll: "Withdraw all",
    send: "Send",
    sent: "Sent",
    recent: "Recent income",
    received: "Received automatically",
    backupPhrase: "Backup phrase",
    backupNote:
      "These 12 words restore the shop, the history, the wallet and the employees.",
    word: (position: number) => `Word ${position}`,
    language: "Language",
    languageValue: "English",
    shop: "Shop",
    restore: "Restore from a backup phrase",
    reset: "Reset this device",
    terminalDemo: "Live terminal demo",
    historyDemo: "Payment history demo",
    teamDemo: "Employee management demo",
    walletDemo: "Wallet demo",
    settingsDemo: "Settings demo with the backup phrase",
  },
};
