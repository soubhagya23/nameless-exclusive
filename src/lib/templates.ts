import type { RoundConfig } from "./types";

/** Shoot 1 questionnaire for a real estate founder. HQ > New client starts from this; edit the cards for the person. */
export const defaultRound: RoundConfig = {
  lede: "We wrote your story from what we already know. You just tell us where we got it wrong. Thumbs only, no typing.",
  intro: "Each card is one line of the story we plan to build. Nothing here is public yet.",
  secondsPerPrompt: 90,
  cards: [
    { id: "name", claim: "Six months from now, when someone in your patch talks real estate, your name comes up first.", why: "That is the whole job. Recall, then trust." },
    { id: "who", claim: "The people you most want are first-home buyers and upgrading families in your area.", why: "The content is aimed at them, not at other agents." },
    { id: "proof", claim: "The numbers go first. Sold results, days on market, reviews.", why: "Results speak before introductions." },
    { id: "start", claim: "The story starts before real estate. How you got here is the hook.", why: "Contrast is what people remember." },
    { id: "camera", claim: "You would rather be heard than perform. Voiceover-led reels, you on screen when it adds weight.", why: "We build your comfort slowly. No scripts to memorise." },
    { id: "voice", claim: "You talk calm and straight, in whatever language the client speaks.", why: "Captions and voiceovers will sound like that too." },
    { id: "lifestyle", claim: "The car and the watch show up in the background. They are never the point.", why: "Polished, not manufactured." },
    { id: "family", claim: "Family stays off camera unless you say otherwise.", why: "Off limits by default. You decide if that ever changes." },
    { id: "rhythm", claim: "Stories almost every day, 12 to 15 reels a month, and you check with us before reposting anything.", why: "That is the operating rhythm from day one." },
  ],
  prompts: [
    { q: "The moment real estate became serious for you.", h: "One turning point. Then how it still shows up in the way you work." },
    { q: "A deal that got difficult.", h: "What was at stake, what you did, what happened. A trade-off, or something you could not control." },
    { q: "A client moment that shows what you bring.", h: "A handover, a hard conversation, a referral. What you did and what they said after." },
    { q: "A working day people never see.", h: "Before and after the inspections and calls. A moment your judgment mattered." },
    { q: "What should stay private.", h: "Family, history, opinions, filming situations you do not want. Say it once and we keep to it." },
  ],
  shootOptions: [],
  photoAsks: ["A photo of a listing we could film at", "A photo of your desk or the office"],
};

export const jatinRound: RoundConfig = {
  ...defaultRound,
  cards: [
    { id: "name", claim: "Six months from now, when someone in the West talks real estate, your name comes up first.", why: "That is the whole job. Recall, then trust." },
    { id: "who", claim: "The people you most want are first-home buyers and upgrading families in Melbourne's North and West.", why: "Truganina and around is the heart of it." },
    { id: "community", claim: "You are at home with the Indian community, but the brand talks to everyone in the West.", why: "Comfortable there, not boxed in there." },
    { id: "proof", claim: "The numbers go first. 130-plus homes sold in a year, most as lead agent, five stars from over a hundred reviews.", why: "Results speak before introductions." },
    { id: "start", claim: "The story starts with the Uber years. You came to Australia, drove, did odd jobs, got into real estate and grew fast.", why: "The contrast is the hook. We tell it with your words, not ours." },
    { id: "office", claim: "The Truganina office is part of the story. There is a standard you want the team known for.", why: "Team, desk, how the place runs." },
    { id: "camera", claim: "You would rather be heard than perform. Voiceover-led reels, you on screen when it adds weight, never a put-on accent.", why: "We build your comfort slowly. No scripts to memorise." },
    { id: "voice", claim: "You talk calm and straight. Hindi, Punjabi or English, whatever the client speaks.", why: "The captions and voiceovers will sound like that too." },
    { id: "lifestyle", claim: "The car and the watch show up in the background. They are never the point.", why: "Polished Jatin, not manufactured Jatin." },
    { id: "line", claim: "Nothing is promised in three months. That line still holds.", why: "If it does not, we drop it." },
    { id: "family", claim: "Family stays off camera unless you say otherwise.", why: "Off limits by default. You decide if that ever changes." },
    { id: "rhythm", claim: "Stories almost every day, 12 to 15 reels a month, and you check with us before reposting anything.", why: "That is the operating rhythm from day one." },
  ],
  shootOptions: ["Sat 15 Nov", "Tue 18 Nov", "Sat 22 Nov"],
  photoAsks: ["A photo of a listing we could film at", "A photo of your desk at the Truganina office"],
};

/** Starting point for shoot 2 and 3 when the AI draft is not used. Short: what changed, what to film next. */
export const followUpRound: RoundConfig = {
  lede: "The last shoot is in. A few quick checks before the next one, so we film the right things.",
  intro: "Tap through. Anything you are not sure about, say it in a voice note.",
  secondsPerPrompt: 60,
  cards: [
    { id: "feel", claim: "The reels so far feel like you, not like an ad.", why: "If they do not, we change the direction, not the volume." },
    { id: "comfort", claim: "You are more comfortable on camera than on the first shoot day.", why: "We push a little further each time, never a lot." },
    { id: "next-listing", claim: "There is at least one listing we can film at next time.", why: "Keys, light, a walkthrough." },
    { id: "client-on-camera", claim: "A happy client would be fine saying a few words on camera.", why: "Two sentences is enough. We ask them, not you." },
    { id: "topic", claim: "There is one thing you keep explaining to buyers that we should turn into a series.", why: "Say what it is in a voice note." },
  ],
  prompts: [
    { q: "What people said about the reels so far.", h: "Clients, friends, other agents. The exact words if you remember them." },
    { q: "One moment since the last shoot that should have been filmed.", h: "A negotiation, a handover, a surprise. What happened." },
    { q: "What you want more of, and less of, next time.", h: "Be blunt. This is how the next shoot gets better." },
  ],
  shootOptions: [],
  photoAsks: ["A photo of the listing for this shoot"],
};

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "card";
}
