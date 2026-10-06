import { shortNpub } from "@platitprosim/core";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Notice,
  Pill,
  QRCode,
  Row,
  Screen,
  Stack,
  Text,
  TopBar,
} from "@platitprosim/ui";
import { useEffect, useReducer, useRef, useState } from "react";
import { appConfig } from "../config";
import { linkReducer } from "../employee/employeeFlow";
import { useEmployeeStep } from "../employee/useEmployeeStep";
import { useI18n } from "../i18n";
import type { I18nKey } from "../i18n";
import { useAppServices, useProfileOf } from "../services";
import type { LinkFailure } from "../services";
import {
  acceptShopOffer,
  cancelEmployeeLogin,
  declineShopOffer,
  needsForward,
  resetDevice,
  useAppEvolu,
  usePayments,
} from "../storage";
import type { EmployeeLogin, ShopOffer } from "../storage";
import { BackButton } from "./BackButton";
import { DetailRows } from "./DetailRows";

/** "I'm an employee": log in with Linky, wait for the owner, join the shop. */
export function EmployeeScreen() {
  const step = useEmployeeStep();
  switch (step.step) {
    case "login":
      return <LinkyLogin />;
    case "waiting":
      return <WaitingForOwner login={step.login} />;
    case "offer":
      return <JoinShop login={step.login} offer={step.offer} />;
    case "removed":
      return <RemovedFromShop shopName={step.shopName} />;
    case "member":
      return null;
  }
}

const failureTitles: Record<LinkFailure, I18nKey> = {
  timeout: "linkFailedTimeout",
  refused: "linkFailedRefused",
  unreachable: "linkFailedUnreachable",
  invalid: "linkFailedInvalid",
};

const COPIED_MS = 2_000;

const linkyLink = (uri: string) => `${appConfig.linkyUrl}/#${uri}`;
const openLinky = (uri: string) => {
  globalThis.open(linkyLink(uri), "_blank", "noopener");
};

function LinkyLogin() {
  const { t } = useI18n();
  const { employeeLink } = useAppServices();
  const [state, dispatch] = useReducer(linkReducer, { status: "idle" });
  const [copied, setCopied] = useState(false);
  const running = useRef<AbortController | null>(null);
  useEffect(() => () => running.current?.abort(), []);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const start = () => {
    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    dispatch({ type: "start" });
    void employeeLink
      .link((uri) => {
        dispatch({ type: "uri", uri });
        openLinky(uri);
      }, controller.signal)
      .then((failure) => {
        if (!controller.signal.aborted) dispatch({ type: "finished", failure });
      });
  };
  const cancel = () => {
    running.current?.abort();
    running.current = null;
    dispatch({ type: "cancel" });
  };

  if (state.status === "awaiting") {
    const copy = async () => {
      await navigator.clipboard.writeText(state.uri);
      setCopied(true);
    };
    return (
      <Stack flex={1} gap="$none">
        <TopBar title={t("employeeTitle")} />
        <Screen width="narrow" testID="employee-link-screen">
          <Stack gap="$sm" alignItems="center">
            <Text variant="title" textAlign="center" role="heading">
              {t("linkApproveTitle")}
            </Text>
            <Text muted textAlign="center">
              {t("linkApproveDescription")}
            </Text>
          </Stack>
          <Button
            testID="employee-open-linky"
            size="lg"
            icon="LogIn"
            onPress={() => openLinky(state.uri)}
          >
            {t("linkOpenLinky")}
          </Button>
          <Stack alignItems="center" gap="$md">
            <Text variant="label" muted textAlign="center">
              {t("linkOtherDevice")}
            </Text>
            <QRCode
              testID="employee-link-qr"
              value={state.uri}
              accessibilityLabel={t("linkQr")}
              tooltip={t("linkCopy")}
              onPress={() => void copy()}
            />
            <Row justifyContent="center">
              {copied ? (
                <Pill label={t("linkCopied")} tone="success" icon="Check" />
              ) : (
                <Pill label={t("linkWaiting")} tone="accent" busy />
              )}
            </Row>
          </Stack>
          <Stack gap="$sm">
            <Button
              testID="employee-link-copy"
              variant="secondary"
              icon="Copy"
              onPress={() => void copy()}
            >
              {t("linkCopy")}
            </Button>
            <Button
              testID="employee-link-cancel"
              variant="ghost"
              onPress={cancel}
            >
              {t("cancel")}
            </Button>
          </Stack>
        </Screen>
      </Stack>
    );
  }

  return (
    <Stack flex={1} gap="$none">
      <TopBar leading={<BackButton to="welcome" />} />
      <Screen width="narrow" centered testID="employee-screen">
        <EmptyState
          icon="LogIn"
          title={t("employeeTitle")}
          description={t("employeeDescription")}
          action={
            <Button
              testID="employee-login"
              size="lg"
              icon="LogIn"
              loading={state.status === "opening"}
              onPress={start}
            >
              {t("employeeLogin")}
            </Button>
          }
        />
        {state.status === "failed" ? (
          <Notice
            tone="danger"
            title={t(failureTitles[state.failure])}
            description={t("linkFailedHint")}
          />
        ) : null}
      </Screen>
    </Stack>
  );
}

/** The employee's Linky identity: photo, name and short npub. */
function LinkyIdentity({ login }: { login: EmployeeLogin }) {
  const { t } = useI18n();
  const { profiles } = useAppServices();
  const profile = useProfileOf(profiles, login.employeePubkey);
  const npub = shortNpub(login.employeePubkey);
  return (
    <Card testID="employee-identity">
      <Row gap="$md" alignItems="center">
        <Avatar
          name={profile?.name ?? npub}
          uri={profile?.picture ?? undefined}
        />
        <Stack gap="$none" flex={1} minWidth={0}>
          <Text variant="label" numberOfLines={1}>
            {profile?.name ?? t("employeeLinkyAccount")}
          </Text>
          <Text variant="caption" muted>
            {npub}
          </Text>
        </Stack>
      </Row>
    </Card>
  );
}

type Publishing = "pending" | "done" | "failed";

function WaitingForOwner({ login }: { login: EmployeeLogin }) {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const { employeeLink } = useAppServices();
  const [publishing, setPublishing] = useState<Publishing>("pending");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    void employeeLink.publish(login).then((published) => {
      if (current) setPublishing(published ? "done" : "failed");
    });
    return () => {
      current = false;
    };
  }, [employeeLink, login, attempt]);

  return (
    <Stack flex={1} gap="$none">
      <TopBar title={t("appName")} />
      <Screen width="narrow" centered testID="employee-waiting-screen">
        <Stack alignItems="center" gap="$md">
          <Row justifyContent="center">
            <Pill
              label={t("employeeWaitingPill")}
              tone="success"
              icon="Check"
            />
          </Row>
          <Text variant="title" textAlign="center" role="heading">
            {t("employeeWaitingTitle")}
          </Text>
          <Text muted textAlign="center">
            {t("employeeWaitingDescription")}
          </Text>
        </Stack>
        <LinkyIdentity login={login} />
        {publishing === "failed" ? (
          <Notice
            tone="warning"
            title={t("employeePublishFailed")}
            description={t("employeePublishFailedHint")}
            action={{
              label: t("retry"),
              onPress: () => {
                setPublishing("pending");
                setAttempt((count) => count + 1);
              },
            }}
          />
        ) : null}
        <Button
          testID="employee-waiting-cancel"
          variant="ghost"
          onPress={() => void cancelEmployeeLogin(evolu)}
        >
          {t("employeeWaitingCancel")}
        </Button>
      </Screen>
    </Stack>
  );
}

function JoinShop({
  login,
  offer,
}: {
  login: EmployeeLogin;
  offer: ShopOffer;
}) {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const { profiles } = useAppServices();
  const owner = useProfileOf(profiles, offer.ownerPubkey);
  const [busy, setBusy] = useState(false);
  const { config } = offer;
  const join = async () => {
    setBusy(true);
    try {
      await acceptShopOffer(evolu, offer, login.employeePubkey);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Stack flex={1} gap="$none">
      <TopBar title={t("appName")} />
      <Screen width="narrow" centered testID="employee-join-screen">
        <Stack alignItems="center" gap="$md">
          <Avatar name={config.shopName} icon="Store" size="lg" />
          <Text variant="title" textAlign="center" role="heading">
            {t("employeeJoinTitle", { shop: config.shopName })}
          </Text>
          <Text muted textAlign="center">
            {t("employeeJoinDescription")}
          </Text>
        </Stack>
        <Card gap="$sm" paddingVertical="$lg">
          <DetailRows
            details={[
              { label: t("employeeJoinShop"), value: config.shopName },
              {
                label: t("employeeJoinOwner"),
                value: owner?.name
                  ? `${owner.name} · ${shortNpub(offer.ownerPubkey)}`
                  : shortNpub(offer.ownerPubkey),
              },
              { label: t("paymentAccount"), value: config.accountDisplay },
              ...(config.employeeName.trim() === ""
                ? []
                : [{ label: t("employeeJoinAs"), value: config.employeeName }]),
            ]}
          />
        </Card>
        <Stack gap="$sm">
          <Button
            testID="employee-join"
            size="lg"
            icon="Check"
            loading={busy}
            onPress={() => void join()}
          >
            {t("employeeJoin")}
          </Button>
          <Button
            testID="employee-decline"
            variant="ghost"
            disabled={busy}
            onPress={() => void declineShopOffer(evolu, offer.id)}
          >
            {t("employeeDecline")}
          </Button>
        </Stack>
      </Screen>
    </Stack>
  );
}

function RemovedFromShop({ shopName }: { shopName: string }) {
  const { t } = useI18n();
  const evolu = useAppEvolu();
  const forwarding = usePayments().some(needsForward);
  return (
    <Screen width="narrow" centered testID="employee-removed-screen">
      <EmptyState
        icon="LogOut"
        title={t("employeeRemovedTitle", { shop: shopName })}
        description={t("employeeRemovedDescription")}
        action={
          <Button
            testID="employee-removed-start-over"
            size="lg"
            disabled={forwarding}
            onPress={() => void resetDevice(evolu)}
          >
            {t("employeeRemovedStartOver")}
          </Button>
        }
      />
      {forwarding ? (
        <Notice tone="warning" title={t("employeeForwardingFunds")} />
      ) : null}
    </Screen>
  );
}
