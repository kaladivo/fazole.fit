import { useState } from "react";
import * as UI from "@platitprosim/ui";
import type { Section } from "../section";
import { sampleWords } from "../sample-data";

export const controls: Section = {
  title: "Controls and fields",
  entries: {
    Button: () => (
      <UI.Stack>
        <UI.Row flexWrap="wrap">
          <UI.Button icon="Plus">Primary</UI.Button>
          <UI.Button variant="secondary">Secondary</UI.Button>
          <UI.Button variant="ghost">Ghost</UI.Button>
          <UI.Button variant="danger" icon="Trash2">
            Danger
          </UI.Button>
        </UI.Row>
        <UI.Row flexWrap="wrap">
          <UI.Button size="sm">Small</UI.Button>
          <UI.Button size="sm" variant="secondary" icon="Copy">
            Copy
          </UI.Button>
          <UI.Button loading>Loading</UI.Button>
          <UI.Button disabled>Disabled</UI.Button>
        </UI.Row>
        <UI.Button size="lg" icon="QrCode">
          Request payment
        </UI.Button>
      </UI.Stack>
    ),
    IconButton: () => (
      <UI.Row flexWrap="wrap">
        <UI.IconButton icon="Settings" accessibilityLabel="Settings" />
        <UI.IconButton
          icon="Copy"
          variant="secondary"
          accessibilityLabel="Copy"
        />
        <UI.IconButton
          icon="Plus"
          variant="primary"
          size="lg"
          accessibilityLabel="Add"
        />
        <UI.IconButton
          icon="Trash2"
          variant="danger"
          size="sm"
          accessibilityLabel="Remove"
        />
        <UI.IconButton icon="X" loading accessibilityLabel="Loading" />
      </UI.Row>
    ),
    Pressable: () => (
      <UI.Pressable
        alignSelf="flex-start"
        gap="$sm"
        padding="$md"
        borderRadius="$control"
        backgroundColor="$neutralSoft"
        tooltip="Any custom press target"
      >
        <UI.Icon name="Store" />
        <UI.Text variant="label">Custom press target</UI.Text>
      </UI.Pressable>
    ),
    SegmentedControl: () => {
      const [method, setMethod] = useState<"bank" | "bitcoin">("bank");
      const [range, setRange] = useState("today");
      return (
        <UI.Stack>
          <UI.SegmentedControl
            accessibilityLabel="Payment method"
            size="lg"
            value={method}
            onValueChange={setMethod}
            options={[
              { value: "bank", label: "Banka", icon: "Landmark" },
              { value: "bitcoin", label: "Bitcoin", icon: "Zap" },
            ]}
          />
          <UI.SegmentedControl
            accessibilityLabel="Range"
            value={range}
            onValueChange={setRange}
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "Week" },
              { value: "all", label: "All" },
            ]}
          />
        </UI.Stack>
      );
    },
    TextField: () => {
      const [name, setName] = useState("Kavárna U Lípy");
      return (
        <UI.Stack>
          <UI.TextField
            label="Shop name"
            value={name}
            onChangeText={setName}
            hint="Shown to customers in the bank app."
          />
          <UI.TextField
            label="Bank account"
            placeholder="19-2000145399/0800"
            error="This account number fails the checksum."
            defaultValue="2000145398/0800"
          />
          <UI.TextField
            label="Amount"
            defaultValue="250"
            inputMode="decimal"
            trailing="Kč"
          />
          <UI.TextField
            label="Employee npub"
            placeholder="npub1…"
            trailing={
              <UI.IconButton
                icon="ClipboardPaste"
                size="sm"
                accessibilityLabel="Paste"
              />
            }
          />
        </UI.Stack>
      );
    },
    MnemonicGrid: () => {
      const [words, setWords] = useState(() =>
        Array.from({ length: 12 }, () => ""),
      );
      return (
        <UI.Stack gap="$lg">
          <UI.MnemonicGrid
            accessibilityLabel="Backup phrase"
            words={sampleWords}
            wordLabel={(position) => `Word ${position}`}
          />
          <UI.Text variant="label" muted>
            Editable (paste a whole phrase into any cell):
          </UI.Text>
          <UI.MnemonicGrid
            accessibilityLabel="Enter backup phrase"
            words={words}
            onWordsChange={setWords}
            wordLabel={(position) => `Word ${position}`}
            invalid={words[1] === "" ? [] : [1]}
          />
        </UI.Stack>
      );
    },
  },
};
