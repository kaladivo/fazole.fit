import * as UI from "@platitprosim/ui";
import type { Section } from "../section";

export const feedback: Section = {
  title: "Feedback",
  entries: {
    Notice: () => (
      <UI.Stack>
        <UI.Notice
          title="Waiting for the shop owner to add you"
          description="Show the owner your npub: npub1qy88…k0xs"
          tone="warning"
          icon="Clock"
        />
        <UI.Notice
          title="Back up your phrase"
          description="It is the only way to restore the shop on a new phone."
          tone="accent"
          icon="KeyRound"
          action={{ label: "Show phrase", onPress: () => {} }}
          dismiss={{ label: "Dismiss", onPress: () => {} }}
        />
        <UI.Notice title="Payment received" tone="success" />
        <UI.Notice
          title="The mint is unreachable"
          description="Bitcoin payments are paused."
          tone="danger"
        />
        <UI.Notice
          solid
          title="A new version of fazole.fit is available"
          icon="RefreshCcw"
          action={{ label: "Update", onPress: () => {} }}
        />
      </UI.Stack>
    ),
    Toast: () => (
      <UI.Stack alignItems="center">
        <UI.Toast title="Copied" />
        <UI.Toast title="Payment marked as paid" tone="success" />
        <UI.Toast
          title="Payment cancelled"
          action={{ label: "Undo", onPress: () => {} }}
        />
      </UI.Stack>
    ),
    ToastStack: () => (
      <UI.Stack
        height={120}
        position="relative"
        borderRadius="$control"
        backgroundColor="$background"
      >
        <UI.ToastStack>
          <UI.Toast title="Toasts stack at the top" />
        </UI.ToastStack>
      </UI.Stack>
    ),
    EmptyState: () => (
      <UI.EmptyState
        icon="History"
        title="No payments yet"
        description="Payments you request appear here."
        action={<UI.Button icon="Plus">New payment</UI.Button>}
      />
    ),
    Spinner: () => (
      <UI.Row>
        <UI.Spinner accessibilityLabel="Loading" />
        <UI.Spinner size="lg" accessibilityLabel="Loading" />
        <UI.Spinner color="$colorMuted" accessibilityLabel="Loading" />
      </UI.Row>
    ),
  },
};
