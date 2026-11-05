import type { ClientConfig } from "./types";

/**
 * Default handshake template for a real estate founder. HQ > New client starts from this,
 * then you edit the cards for the person. Jatin's set is the first real one.
 */
export const defaultConfig: ClientConfig = {
  headline: "We did the homework.",
  lede: "We wrote your story from what we already know. You just tell us where we got it wrong. Thumbs only, no typing.",
  area: "",
  secondsPerPrompt: 90,
  akshayName: "Akshay",
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
};

export const jatinConfig: ClientConfig = {
  ...defaultConfig,
  area: "Melbourne North and West",
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
};
