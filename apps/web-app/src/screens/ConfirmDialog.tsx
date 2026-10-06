import { Button, Dialog } from "@platitprosim/ui";
import type { ReactNode } from "react";
import { useI18n } from "../i18n";

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirm,
  destructive = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirm: string;
  destructive?: boolean;
  onConfirm: () => void;
  /** Sits between the description and the buttons, e.g. who is being removed. */
  children?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? undefined : onClose())}
      title={title}
      description={description}
      actions={
        <>
          <Button
            testID="confirm-dialog-confirm"
            variant={destructive ? "danger" : "primary"}
            onPress={onConfirm}
          >
            {confirm}
          </Button>
          <Button variant="secondary" onPress={onClose}>
            {t("cancel")}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
