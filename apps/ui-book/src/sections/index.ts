import type { Section } from "../section";
import { controls } from "./controls";
import { display } from "./display";
import { feedback } from "./feedback";
import { layout } from "./layout";
import { navigation } from "./navigation";
import { overlays } from "./overlays";
import { payments } from "./payments";
import { setup } from "./setup";

export { tokens } from "./tokens";

export const componentSections: readonly Section[] = [
  setup,
  layout,
  controls,
  display,
  feedback,
  overlays,
  navigation,
  payments,
];
