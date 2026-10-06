import type { cs } from "./cs";

export const en: Record<keyof typeof cs, string> = {
  appName: "Platit prosím",
  appTagline: "A payment terminal for QR payments by bank or bitcoin.",

  welcomeSetupShop: "Set up a shop",
  welcomeSetupShopDescription: "I'm the owner and want to take payments.",
  welcomeEmployee: "I'm an employee",
  welcomeEmployeeDescription: "I'll log in with Linky.",
  welcomeRestore: "I have a backup phrase",
  welcomeRestoreDescription: "Restore a shop on this device.",

  navigation: "Main sections",
  sectionTerminal: "Terminal",
  sectionHistory: "History",
  sectionEmployees: "Team",
  sectionWallet: "Wallet",
  sectionSettings: "Settings",

  currencyCzk: "CZK",
  amount: "Amount",
  keypadDecimal: "Decimal comma",
  keypadBackspace: "Delete",
  requestPayment: "Request payment",

  historyEmptyTitle: "No payments yet",
  historyEmptyDescription: "Payments you create in the terminal appear here.",

  employeesEmptyTitle: "No employees yet",
  employeesEmptyDescription: "Add an employee by scanning their Linky profile.",
  employeesAdd: "Add employee",

  walletBalance: "Balance",
  walletBalanceSats: "{sats} sat",
  walletWithdraw: "Withdraw to a Lightning address",
  walletSendToLinky: "Send to Linky",

  settingsLanguage: "Language",
  settingsShop: "Shop",
  settingsShopDetails: "Shop details",
  settingsSecurity: "Security",
  settingsBackupPhrase: "Backup phrase",
  settingsRestore: "Restore from backup",
  settingsReset: "Reset this device",
  settingsAbout: "About",
  settingsMint: "Mint",
  languageCs: "Čeština",
  languageEn: "English",
  comingSoon: "Coming soon",
};
