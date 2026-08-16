export type SurfaceKind = "web" | "electron" | "os_desktop";

export type LeaseOwner =
  | "automation"
  | "transitioning_to_human"
  | "human"
  | "transitioning_to_automation";

export type ActionKind =
  | "navigate"
  | "click"
  | "fill"
  | "extract"
  | "wait"
  | "dismiss"
  | "read"
  | "submit_irreversible";

export type SemanticLocator = {
  kind: "semantic";
  role?: string;
  name?: string;
  label?: string;
  text?: string;
  nth?: number;
};

export type CssLocator = {
  kind: "css";
  selector: string;
  justification: string;
};

export type Locator = SemanticLocator | CssLocator;

export type RankedTarget = {
  framePath?: string[];
  candidates: Locator[];
};

export type ActionRequest = {
  kind: ActionKind;
  target?: RankedTarget;
  url?: string;
  value?: string;
  rationale?: string;
};

export type ActionResult = {
  ok: boolean;
  code?: string;
  message?: string;
  extracted?: Record<string, string>;
};

export type Observation = {
  url: string;
  title: string;
  ariaSnapshot: string;
  text: string;
};

export interface Surface {
  readonly kind: SurfaceKind;
  readonly sessionId: string;
  observe(): Promise<Observation>;
  act(request: ActionRequest): Promise<ActionResult>;
  screenshot(): Promise<Buffer>;
  close(): Promise<void>;
}
