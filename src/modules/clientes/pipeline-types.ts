import type { Stage } from "./stages";

export interface PipelineCard {
  id: string;
  name: string;
  personType: "pf" | "pj";
  stage: Stage;
  estimatedValueCents: number | null;
  leadSource: string | null;
  lastContactAt: string | null;
  createdAt: string;
  lostReason: string | null;
}

export type PipelineBoard = Record<Stage, PipelineCard[]>;
