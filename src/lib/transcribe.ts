import { supabaseAdmin, RECORDINGS_BUCKET } from "./supabase-admin";

const PROMPT =
  "Conversation about real estate in Melbourne, Australia. The speaker mixes Hindi, Punjabi and English. Keep the mix as spoken; write Hindi and Punjabi words in Latin script (Hinglish) rather than Devanagari or Gurmukhi. Place names: Truganina, Tarneit, Point Cook, Werribee, Melton, Craigieburn.";

/**
 * Downloads the audio from storage, sends it to OpenAI, stores the transcript.
 * Tries gpt-4o-transcribe first, falls back to whisper-1.
 */
export async function transcribeRecording(recordingId: string): Promise<string> {
  const sb = supabaseAdmin();
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const { data: rec } = await sb.from("recordings").select("*").eq("id", recordingId).single();
  if (!rec) throw new Error("recording not found");
  await sb.from("recordings").update({ transcript_status: "running", transcript_error: null }).eq("id", recordingId);

  try {
    const { data: file, error } = await sb.storage.from(RECORDINGS_BUCKET).download(rec.storage_path);
    if (error || !file) throw new Error(error?.message || "download failed");
    const ext = rec.storage_path.split(".").pop() || "webm";
    const text = await callOpenAI(key, file, `audio.${ext}`, rec.mime);
    await sb.from("recordings").update({ transcript: text, transcript_status: "done" }).eq("id", recordingId);
    return text;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sb.from("recordings").update({ transcript_status: "failed", transcript_error: msg.slice(0, 500) }).eq("id", recordingId);
    throw e;
  }
}

async function callOpenAI(key: string, blob: Blob, filename: string, mime: string): Promise<string> {
  const attempt = async (model: string) => {
    const fd = new FormData();
    fd.append("file", new File([blob], filename, { type: mime }));
    fd.append("model", model);
    fd.append("prompt", PROMPT);
    fd.append("response_format", "json");
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd });
    if (!r.ok) throw new Error(`${model}: ${r.status} ${(await r.text()).slice(0, 300)}`);
    const j = (await r.json()) as { text?: string };
    return (j.text || "").trim();
  };
  try {
    return await attempt("gpt-4o-transcribe");
  } catch (e) {
    console.warn("gpt-4o-transcribe failed, trying whisper-1:", e);
    return await attempt("whisper-1");
  }
}
