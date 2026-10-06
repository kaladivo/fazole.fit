export const cs = {
  appName: "Platit prosím",
  appTagline: "Platební terminál pro QR platby bankou i bitcoinem.",
  loading: "Načítám…",
  back: "Zpět",
  close: "Zavřít",
  cancel: "Zrušit",
  save: "Uložit",
  comingSoon: "Připravujeme",

  welcomeSetupShop: "Založit obchod",
  welcomeSetupShopDescription: "Jsem majitel a chci přijímat platby.",
  welcomeEmployee: "Jsem zaměstnanec",
  welcomeEmployeeDescription: "Přihlásím se přes Linky.",
  welcomeRestore: "Mám záložní frázi",
  welcomeRestoreDescription: "Obnovím obchod na tomto zařízení.",

  setupTitle: "Založit obchod",
  setupDescription:
    "Platby půjdou rovnou na váš bankovní účet. Údaje můžete později změnit v nastavení.",
  shopName: "Název obchodu",
  shopNamePlaceholder: "Kavárna U Lípy",
  shopNameHint: "Zákazník ho uvidí ve zprávě pro příjemce.",
  shopNameRequired: "Zadejte název obchodu.",
  bankAccount: "Číslo účtu",
  bankAccountPlaceholder: "123456789/0800",
  bankAccountHint: "Ve tvaru [předčíslí-]číslo/kód banky.",
  bankAccountValid: "{bank} · {iban}",
  bankAccountInvalidFormat:
    "Zadejte účet ve tvaru číslo/kód banky, např. 123456789/0800.",
  bankAccountInvalidChecksum:
    "Toto číslo účtu neexistuje. Zkontrolujte překlepy.",
  bankAccountUnknownBank: "Neznámý kód banky.",
  setupContinue: "Pokračovat",

  backupTitle: "Záložní fráze",
  backupDescription:
    "Těchto {count} slov je jediná záloha obchodu, jeho historie i peněženky. Napište si je na papír a uložte na bezpečné místo.",
  backupWarning: "Slova nikomu neukazujte. Kdo je zná, má přístup k obchodu.",
  backupWords: "Slova záložní fráze",
  backupWord: "Slovo {position}",
  backupDone: "Mám je zapsaná",
  backupLater: "Později",
  backupLaterHint: "Frázi najdete kdykoli v nastavení.",

  restoreTitle: "Obnovit ze záložní fráze",
  restoreDescription:
    "Zadejte {count} slov záložní fráze. Celou frázi můžete vložit do prvního pole.",
  restoreReplaceWarning:
    "Obnovou nahradíte obchod na tomto zařízení. Bez jeho záložní fráze ho už nepůjde vrátit.",
  restoreInvalid:
    "Tato slova nejsou platná záložní fráze. Zkontrolujte každé slovo.",
  restoreSubmit: "Obnovit",
  restoringTitle: "Obnovuji obchod…",
  restoringDescription:
    "Stahuji vaše data ze synchronizačního serveru. Nechte aplikaci otevřenou.",
  restoringSlowTitle: "Zatím nic nedorazilo",
  restoringSlowDescription:
    "Zkontrolujte připojení k internetu. Pokud tato fráze žádný obchod nezaložila, není co obnovit.",
  restoringStartOver: "Začít znovu",

  employeeTitle: "Přihlásit se přes Linky",
  employeeDescription:
    "Majitel obchodu vás přidá podle vašeho profilu v Linky. Přihlášení přes Linky přidáme v příští verzi.",
  employeeLogin: "Přihlásit se přes Linky",

  navigation: "Hlavní sekce",
  sectionTerminal: "Terminál",
  sectionHistory: "Historie",
  sectionEmployees: "Tým",
  sectionWallet: "Peněženka",
  sectionSettings: "Nastavení",

  currencyCzk: "Kč",
  amountCzk: "{amount} Kč",
  amount: "Částka",
  keypadDecimal: "Desetinná čárka",
  keypadBackspace: "Smazat",
  requestPayment: "Požadovat platbu",

  payment: "Platba",
  paymentMethod: "Způsob platby",
  methodBank: "Banka",
  methodBitcoinSoon: "Bitcoin (brzy)",
  methodLightning: "Lightning",
  methodCashu: "Cashu",
  paymentBankQr: "QR kód pro platbu {amount} z banky",
  paymentVs: "Variabilní symbol",
  paymentAccount: "Účet",
  paymentRecipient: "Příjemce",
  paymentMarkPaid: "Označit jako zaplacené",
  paymentCancel: "Zrušit platbu",
  paymentPaidTitle: "Zaplaceno",
  paymentPaidDetail: "Bankovní převod · {time}",
  paymentNew: "Nová platba",
  paymentNotFound: "Platba nenalezena",
  paymentNotFoundDescription:
    "Možná se ještě nesynchronizovala do tohoto zařízení.",
  paymentClosed: "Tato platba už není otevřená.",
  backToTerminal: "Zpět na terminál",

  statusPending: "Čeká",
  statusPaid: "Zaplaceno",
  statusCancelled: "Zrušeno",

  historyEmptyTitle: "Zatím žádné platby",
  historyEmptyDescription:
    "Platby, které vytvoříte v terminálu, se objeví tady.",
  historyToday: "Dnes",
  historyYesterday: "Včera",
  historyDayTotal: "Přijato {amount}",
  historyRow: "{time} · {creator}",
  historyMe: "Já",
  historyDetail: "Detail platby",
  historyStatus: "Stav",
  historyCreated: "Vytvořeno",
  historyPaidAt: "Zaplaceno",
  historyCreatedBy: "Vytvořil",
  historyShowQr: "Zobrazit QR kód",

  employeesEmptyTitle: "Zatím žádní zaměstnanci",
  employeesEmptyDescription:
    "Přidejte zaměstnance naskenováním jeho profilu v Linky.",
  employeesAdd: "Přidat zaměstnance",

  walletBalance: "Zůstatek",
  walletBalanceSats: "{sats} sat",
  walletWithdraw: "Vybrat na Lightning adresu",
  walletSendToLinky: "Poslat do Linky",

  settingsLanguage: "Jazyk",
  settingsTheme: "Vzhled",
  themeSystem: "Podle systému",
  themeLight: "Světlý",
  themeDark: "Tmavý",
  settingsShop: "Obchod",
  settingsShopEdit: "Upravit údaje obchodu",
  settingsSecurity: "Zabezpečení",
  settingsBackupPhrase: "Záložní fráze",
  settingsBackupConfirmTitle: "Zobrazit záložní frázi?",
  settingsBackupConfirmDescription:
    "Ujistěte se, že vám nikdo nevidí na obrazovku.",
  settingsBackupShow: "Zobrazit",
  settingsRestore: "Obnovit ze zálohy",
  settingsRestoreConfirmTitle: "Obnovit jiný obchod?",
  settingsRestoreConfirmDescription:
    "Obnova nahradí obchod na tomto zařízení. Než budete pokračovat, ujistěte se, že máte jeho záložní frázi.",
  settingsRestoreContinue: "Pokračovat",
  settingsReset: "Resetovat toto zařízení",
  settingsResetConfirmTitle: "Resetovat toto zařízení?",
  settingsResetConfirmDescription:
    "Z tohoto zařízení se smaže obchod, historie i peněženka. Bez záložní fráze je už nepůjde obnovit.",
  settingsResetConfirm: "Resetovat",
  settingsAbout: "O aplikaci",
  settingsMint: "Mincovna",
  languageCs: "Čeština",
  languageEn: "English",
};
