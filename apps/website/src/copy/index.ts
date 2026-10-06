import { cs } from "./cs";
import { en } from "./en";

export type { ComparisonRow, FaqItem, Point, SiteCopy } from "./cs";

export const copies = { cs, en };

export type Locale = keyof typeof copies;
