#!/usr/bin/env bash
# Builds an app locally and ships it to Vercel as a prebuilt static deployment.
# Usage: scripts/deploy.sh web-app|website
set -euo pipefail

target="${1:?usage: scripts/deploy.sh web-app|website}"
root="$(cd "$(dirname "$0")/.." && pwd)"
case "$target" in
  web-app) project="platitprosim-app" ;;
  website) project="platitprosim-website" ;;
  *) echo "unknown target: $target" >&2; exit 1 ;;
esac

app="$root/apps/$target"
out="$app/.vercel/output"

(cd "$root" && bun run --filter "@platitprosim/$target" build)

rm -rf "$out"
mkdir -p "$out"
cp -R "$app/dist" "$out/static"
cat > "$out/config.json" <<'JSON'
{
  "version": 3,
  "routes": [
    {
      "src": "/(.*)",
      "headers": {
        "Content-Security-Policy": "frame-ancestors 'none'",
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Permissions-Policy": "geolocation=(), microphone=(), payment=(), usb=(), camera=(self)",
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains"
      },
      "continue": true
    },
    {
      "src": "/assets/(.*)",
      "headers": { "Cache-Control": "public, max-age=31536000, immutable" },
      "continue": true
    },
    {
      "src": "/(sw\\.js|index\\.html|manifest\\.webmanifest)?",
      "headers": { "Cache-Control": "no-cache" },
      "continue": true
    },
    { "handle": "filesystem" }
  ]
}
JSON

(cd "$app" && vercel link --yes --project "$project" >/dev/null && vercel deploy --prebuilt --prod --yes)
