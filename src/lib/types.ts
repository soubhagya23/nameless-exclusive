export type Card = { id: string; claim: string; why: string; clip?: string };
export type Prompt = { q: string; h: string };

export type ClientConfig = {
  headline?: string; // defaults to "We did the homework."
  lede?: string;
  area?: string; // caption under the portrait, e.g. "Melbourne North and West"
  cards: Card[];
  prompts: Prompt[];
  shootOptions: string[]; // e.g. ["Sat 15 Nov", "Tue 18 Nov"]
  secondsPerPrompt?: number;
  akshayName?: string; // who "asks" the cards
};

export type Client = {
  id: string;
  slug: string;
  name: string;
  first_name: string;
  portrait_url: string | null;
  wa_number: string | null;
  status: "handshake" | "thinking" | "plan" | "shoot" | "running" | "paused";
  config: ClientConfig;
  shoot_days: string[];
  created_at: string;
  updated_at: string;
};

export type CardAnswer = {
  id: string;
  client_id: string;
  card_id: string;
  verdict: "yes" | "no" | "skip";
  note: string;
  recording_id: string | null;
  updated_at: string;
};

export type Recording = {
  id: string;
  client_id: string;
  kind: "fix" | "drive" | "answer";
  card_id: string | null;
  storage_path: string;
  mime: string;
  duration_secs: number;
  transcript: string | null;
  transcript_status: "pending" | "running" | "done" | "failed";
  transcript_error: string | null;
  created_at: string;
};

export type Brief = {
  id: string;
  client_id: string;
  content: string;
  model: string | null;
  edited_content: string | null;
  created_at: string;
};
