import { useState } from "react";
import * as UI from "@platitprosim/ui";
import type { Section } from "../section";

type Tab = "terminal" | "history" | "employees" | "wallet" | "settings";

const items: UI.NavItem<Tab>[] = [
  { value: "terminal", label: "Terminál", icon: "QrCode" },
  { value: "history", label: "Historie", icon: "History" },
  { value: "employees", label: "Zaměstnanci", icon: "Users" },
  { value: "wallet", label: "Peněženka", icon: "Wallet" },
];

const settings: UI.NavItem<Tab> = {
  value: "settings",
  label: "Nastavení",
  icon: "Settings",
};

export const navigation: Section = {
  title: "Navigation",
  entries: {
    TopBar: () => (
      <UI.Stack borderRadius="$control" overflow="hidden">
        <UI.TopBar
          title="Historie"
          subtitle="Kavárna U Lípy"
          leading={<UI.IconButton icon="ArrowLeft" accessibilityLabel="Back" />}
          trailing={<UI.IconButton icon="Ellipsis" accessibilityLabel="More" />}
        />
      </UI.Stack>
    ),
    TabBar: () => {
      const [tab, setTab] = useState<Tab>("terminal");
      return (
        <UI.Stack borderRadius="$control" overflow="hidden">
          <UI.TabBar
            accessibilityLabel="Sections"
            items={[...items, settings]}
            value={tab}
            onValueChange={setTab}
          />
        </UI.Stack>
      );
    },
    NavigationRail: () => {
      const [tab, setTab] = useState<Tab>("history");
      return (
        <UI.Row
          height={520}
          alignItems="stretch"
          borderRadius="$control"
          overflow="hidden"
          backgroundColor="$background"
        >
          <UI.NavigationRail
            accessibilityLabel="Sections"
            header={<UI.BrandMark size="control" />}
            items={items}
            footerItems={[settings]}
            value={tab}
            onValueChange={setTab}
          />
          <UI.Stack flex={1} />
        </UI.Row>
      );
    },
  },
};
