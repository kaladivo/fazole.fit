import type { I18nKey } from "../i18n";

const parse = (url: string) => (URL.canParse(url) ? new URL(url) : null);

const isSameServer = (a: string, b: string) =>
  parse(a)?.href === parse(b)?.href;

/** Why a typed server address can't be added, `null` when it can. */
export const checkServerUrl = (
  input: string,
  listed: readonly string[],
  allowInsecureLocalhost: boolean,
): I18nKey | null => {
  const url = parse(input.trim());
  const secure =
    url?.protocol === "wss:" ||
    (allowInsecureLocalhost &&
      url?.protocol === "ws:" &&
      url.hostname === "localhost");
  if (!url || !secure || url.search || url.hash) return "serverUrlInvalid";
  return listed.some((server) => isSameServer(server, url.href))
    ? "serverUrlListed"
    : null;
};
