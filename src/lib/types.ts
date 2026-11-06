export type Card = { id: string; claim: string; why: string; clip?: string; kind?: "claim" | "question" };
export type Prompt = { q: string; h: string };

/** What one shoot's questionnaire asks of the client. Lives on the round (= shoot). */
export type RoundConfig = {
  lede?: string;
  intro?: string;
  cards: Card[];
  prompts: Prompt[];
  shootOptions: string[];
  photoAsks: string[]; // "A photo of the listing we will film at"
  secondsPerPrompt?: number;
};

/** The shoot plan we send him once we have planned the day. */
export type ShootPlan = {
  date?: string; // "Sat 15 Nov"
  callTime?: string; // "9:00 AM"
  place?: string; // "Your place, then the office"
  runOfDay?: string; // free text, one line per stop
  wear?: string;
  bring?: string;
  checklist?: string[]; // day-before ticks
  note?: string;
};

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
  plan: ShootPlan;
  plan_status: "none" | "sent" | "accepted";
  plan_accepted_at: string | null;
  sent_at: string | null;
  checklist_done: string[];
  shoot_date: string | null;
  shoot_note: string | null;
  created_at: string;
  updated_at: string;
};

/** What HQ and the client strip show for a shoot. Derived, never stored. */
export type ShootStage = "not sent" | "live" | "answered" | "planned" | "confirmed" | "done";

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

export type Photo = {
  id: string;
  client_id: string;
  round_id: string | null;
  prompt: string;
  storage_path: string;
  mime: string;
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

export type Ask = {
  id: string;
  client_id: string;
  question: string;
  status: "open" | "answered";
  answer_text: string;
  recording_id: string | null;
  created_at: string;
  answered_at: string | null;
};

export type Event = {
  id: number;
  client_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};
