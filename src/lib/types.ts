export type Card = { id: string; claim: string; why: string; clip?: string };
export type Prompt = { q: string; h: string };

/** What one round asks of the client. Lives on the round, not the client. */
export type RoundConfig = {
  lede?: string;
  intro?: string; // one line under "Is this you?"
  cards: Card[];
  prompts: Prompt[];
  shootOptions: string[];
  secondsPerPrompt?: number;
};

/** Client-level settings kept in clients.config. */
export type ClientConfig = {
  area?: string;
  akshayName?: string;
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

export type Round = {
  id: string;
  client_id: string;
  number: number;
  title: string;
  status: "draft" | "live" | "done";
  config: RoundConfig;
  shoot_date: string | null;
  shoot_note: string | null;
  created_at: string;
  updated_at: string;
};

export type CardAnswer = {
  id: string;
  client_id: string;
  round_id: string | null;
  card_id: string;
  verdict: "yes" | "no" | "skip";
  note: string;
  recording_id: string | null;
  updated_at: string;
};

export type Recording = {
  id: string;
  client_id: string;
  round_id: string | null;
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
