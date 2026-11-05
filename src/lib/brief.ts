import { supabaseAdmin } from "./supabase-admin";
import { getClientById, getAnswers, getRecordings } from "./db";

const MODEL = "claude-sonnet-4-5";

/**
 * Writes the first draft of the brand brief from the card verdicts and every transcript we have.
 * Akshay edits this; he does not start from a blank page.
 */
export async function generateBrief(clientId: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const client = await getClientById(clientId);
  if (!client) throw new Error("client not found");
  const [answers, recordings] = await Promise.all([getAnswers(clientId), getRecordings(clientId)]);

  const cardLines = client.config.cards.map((c) => {
    const a = answers.find((x) => x.card_id === c.id);
    const v = !a ? "not answered" : a.verdict === "yes" ? "THAT IS ME" : a.verdict === "no" ? `NOT QUITE${a.note ? ": " + a.note : ""}` : "DO NOT USE";
    const fix = a?.recording_id ? recordings.find((r) => r.id === a.recording_id) : null;
    return `- "${c.claim}" → ${v}${fix?.transcript ? `\n  Voice note on this card: ${fix.transcript}` : ""}`;
  });
  const drive = recordings.filter((r) => r.kind === "drive" && r.transcript).map((r) => r.transcript).join("\n\n");
  const otherVoice = recordings.filter((r) => r.kind === "answer" && r.transcript).map((r) => r.transcript).join("\n\n");

  const system = `You write internal brand briefs for NAMELESS, a personal brand advisory in Melbourne. You write in plain, direct English. Short sentences. No em dashes, no exclamation marks, no emoji, no buzzwords, no "not X but Y" constructions, no hollow praise. Never invent facts: if the material does not say it, you do not say it. Quote the client's own phrases where they are useful, in the language mix he used. The reader is Akshay, the strategist who will refine this, so write for someone who knows the client.`;

  const user = `Client: ${client.name}${client.config.area ? ", " + client.config.area : ""}.

CARD VERDICTS (our draft of his story, and what he said to each line):
${cardLines.join("\n")}

DRIVE RECORDING TRANSCRIPT (he answered these prompts while driving: ${client.config.prompts.map((p) => p.q).join(" / ")}):
${drive || "(none yet)"}

${otherVoice ? "OTHER VOICE NOTES:\n" + otherVoice + "\n" : ""}
Write the brand brief draft with these sections, as markdown headings:
1. Positioning in one line
2. Who he is for
3. The story (turning point, in his words where possible)
4. Proof and the difficult deal
5. How he talks (phrases he actually uses, language mix, words to avoid)
6. On camera (comfort, formats that fit)
7. Off limits
8. Two content pillars, with three example post ideas under each
9. Open questions for Akshay to ask on the call

Keep it under 900 words. Where a section has no material yet, write one line saying what is missing instead of guessing.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as { content: { type: string; text?: string }[] };
  const text = j.content.filter((c) => c.type === "text").map((c) => c.text || "").join("\n").trim();
  await supabaseAdmin().from("briefs").insert({ client_id: clientId, content: text, model: MODEL });
  return text;
}
