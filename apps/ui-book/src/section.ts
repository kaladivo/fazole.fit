import type { ComponentType } from "react";

/** A book category whose entries are examples named after the component they show. */
export interface Section {
  title: string;
  entries: Record<string, ComponentType>;
}
