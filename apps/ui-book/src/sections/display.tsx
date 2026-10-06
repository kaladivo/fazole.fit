import * as UI from "@platitprosim/ui";
import type { Section } from "../section";

export const display: Section = {
  title: "Display and lists",
  entries: {
    AmountDisplay: () => (
      <UI.Stack gap="$xl">
        <UI.AmountDisplay value="0" unit="Kč" placeholder />
        <UI.AmountDisplay
          value="1 250,50"
          unit="Kč"
          secondary="≈ 2 431 sat · 1 BTC = 2 062 000 Kč"
        />
        <UI.AmountDisplay value="12 345 678,90" unit="Kč" />
        <UI.AmountDisplay value="349" unit="Kč" size="md" secondary="Today" />
      </UI.Stack>
    ),
    Avatar: () => (
      <UI.Row>
        <UI.Avatar name="Jana Nováková" size="sm" />
        <UI.Avatar name="Petr Svoboda" />
        <UI.Avatar name="Kavárna" icon="Store" />
        <UI.Avatar name="Kavárna U Lípy" size="lg" />
      </UI.Row>
    ),
    Pill: () => (
      <UI.Row flexWrap="wrap">
        <UI.Pill label="Banka" icon="Landmark" />
        <UI.Pill label="Lightning" icon="Zap" tone="accent" />
        <UI.Pill label="Cashu" icon="Bitcoin" tone="info" />
        <UI.Pill label="Odesílám" tone="warning" busy />
        <UI.Pill label="Chyba" tone="danger" dot />
      </UI.Row>
    ),
    StatusBadge: () => (
      <UI.Row>
        <UI.StatusBadge status="pending" label="Čeká" />
        <UI.StatusBadge status="paid" label="Zaplaceno" />
        <UI.StatusBadge status="cancelled" label="Zrušeno" />
      </UI.Row>
    ),
    ListRow: () => (
      <UI.Stack gap="$none">
        <UI.ListRow
          title="1 250,50 Kč"
          description="14:32 · Jana Nováková"
          leading={<UI.Avatar name="Jana Nováková" />}
          trailing={<UI.StatusBadge status="paid" label="Zaplaceno" />}
        />
        <UI.ListRow
          title="349 Kč"
          description="14:05 · Lightning · 677 sat"
          icon="Zap"
          trailing={<UI.StatusBadge status="pending" label="Čeká" />}
        />
        <UI.ListRow
          title="Language"
          icon="Languages"
          value="Čeština"
          onPress={() => {}}
        />
        <UI.ListRow
          title="Reset this device"
          description="Erases the shop from this phone."
          icon="Trash2"
          destructive
          onPress={() => {}}
        />
      </UI.Stack>
    ),
  },
};
