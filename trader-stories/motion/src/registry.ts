import React from "react";
import { NumberCard, QuoteCard, TitleCard, TagOverlay } from "./components/Cards";
import { DocCard } from "./components/DocCard";
import { CompareBars, LineChart, RankList } from "./components/Charts";
import { MapCard, PinDistance } from "./components/Maps";
import { Scoreboard } from "./components/Scoreboard";
import { SceneMove } from "./components/SceneMove";
import { CaptionOverlay } from "./components/CaptionOverlay";
import { LimitDiagram, NodeWeb, OrderQueue, StepFlow } from "./diagrams/Diagrams";

// Every template, by name. Film files refer to templates by these names.
export const TEMPLATES = {
  TitleCard, NumberCard, QuoteCard, DocCard, TagOverlay, CaptionOverlay,
  LineChart, CompareBars, RankList, MapCard, PinDistance,
  LimitDiagram, OrderQueue, StepFlow, NodeWeb, Scoreboard, SceneMove,
} as const;
export type TemplateName = keyof typeof TEMPLATES;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ShotSpec = { t: TemplateName; props: any };
export const component = (t: TemplateName) => TEMPLATES[t] as unknown as React.FC<Record<string, unknown>>;
