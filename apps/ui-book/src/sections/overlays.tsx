import { useState } from "react";
import * as UI from "@platitprosim/ui";
import type { Section } from "../section";

export const overlays: Section = {
  title: "Overlays",
  entries: {
    Dialog: () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <UI.Button
            variant="danger"
            alignSelf="flex-start"
            onPress={() => setOpen(true)}
          >
            Reset this device
          </UI.Button>
          <UI.Dialog
            open={open}
            onOpenChange={setOpen}
            title="Reset this device?"
            description="The shop, history and wallet are erased from this device. Restore them with the backup phrase."
            closeLabel="Close"
            actions={
              <>
                <UI.Button variant="danger" onPress={() => setOpen(false)}>
                  Reset
                </UI.Button>
                <UI.Button variant="ghost" onPress={() => setOpen(false)}>
                  Cancel
                </UI.Button>
              </>
            }
          />
        </>
      );
    },
    Sheet: () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <UI.Button
            variant="secondary"
            alignSelf="flex-start"
            onPress={() => setOpen(true)}
          >
            Open sheet
          </UI.Button>
          <UI.Sheet open={open} onOpenChange={setOpen} title="Filter">
            <UI.ListRow
              title="Everyone"
              icon="Users"
              onPress={() => setOpen(false)}
            />
            <UI.ListRow
              title="Jana Nováková"
              leading={<UI.Avatar name="Jana Nováková" size="sm" />}
              onPress={() => setOpen(false)}
            />
          </UI.Sheet>
        </>
      );
    },
    SuccessOverlay: () => {
      const [open, setOpen] = useState(false);
      return (
        <UI.Stack
          height={460}
          position="relative"
          borderRadius="$control"
          overflow="hidden"
          backgroundColor="$background"
          justifyContent="center"
          alignItems="center"
        >
          <UI.Button onPress={() => setOpen(true)}>Show success</UI.Button>
          {open ? (
            <UI.SuccessOverlay
              contained
              title="Zaplaceno"
              amount="1 250,50"
              unit="Kč"
              detail="Lightning · 2 431 sat"
              action={{ label: "Nová platba", onPress: () => setOpen(false) }}
              onDismiss={() => setOpen(false)}
            />
          ) : null}
        </UI.Stack>
      );
    },
  },
};
