import type { RoundConfig } from "./types";

/**
 * Shoot 1 questionnaire. Built from the 14-question personal branding questionnaire:
 * the questions he can answer with a tap are cards, the ones that need a story are drive prompts.
 * HQ > New client starts from this; edit the cards for the person.
 *
 * Map to the questionnaire:
 *  cards   01 reputation, 02 people, 05 office, 09 belief, 10 voice, 11 content that feels like you, 12 off limits
 *  drive   03 turning point, 07 difficult decision (first pass), 04 responsibility, 06 working day, 08 trust, 13 and 14 optional
 */
export const defaultRound: RoundConfig = {
  lede: "We wrote your story from what we already know. You just tell us where we got it wrong. Thumbs only, no typing.",
  intro: "Each card is one line of the story we plan to build. Nothing here is public yet, and a yes on a card is not a yes to post it.",
  secondsPerPrompt: 75,
  cards: [
    { id: "name", claim: "Six months from now, when someone in your patch talks real estate, your name comes up first.", why: "That is the whole job. Recall, then trust. If there is something else you want people to remember after a few videos, say it on the mic." },
    { id: "who", claim: "The people you most want are first-home buyers and upgrading families in your area.", why: "The content is aimed at them. If you know the decision they are stuck on, tell us in a voice note." },
    { id: "proof", claim: "The numbers go first. Sold results, days on market, reviews.", why: "Results speak before introductions." },
    { id: "start", claim: "The story starts before real estate. How you got here is the hook.", why: "Contrast is what people remember. You tell the turning point on the drive." },
    { id: "office", claim: "The office is part of the story. There is a standard you want the team known for.", why: "One detail from the space, or one thing the people there should be known for. Say it on the mic if there is one." },
    { id: "line", claim: "You have a line you say to clients that you actually believe, and the experience behind it.", why: "If you have one, say it and where it came from. If not, Not quite is fine." },
    { id: "voice", claim: "You talk calm and straight, in whatever language the client speaks.", why: "Captions and voiceovers will sound like that too. A few phrases you actually use, and any words that feel unlike you, on the mic." },
    { id: "camera", claim: "You would rather be heard than perform. Voiceover-led reels, you on screen when it adds weight.", why: "We build your comfort slowly. No scripts to memorise." },
    { id: "format", claim: "Talking to a client feels more natural than talking to a lens. Conversations and walkthroughs first, direct to camera later.", why: "If there are two or three accounts or videos you enjoy, any industry, name them on the mic. What works there, and what would feel forced on you." },
    { id: "lifestyle", claim: "The car and the watch show up in the background. They are never the point.", why: "Polished, not manufactured." },
    { id: "family", claim: "Family stays off camera unless you say otherwise.", why: "Off limits by default. Anything else that should stay private, say it here or on the last drive prompt." },
    { id: "rhythm", claim: "Stories almost every day, 12 to 15 reels a month, and you check with us before reposting anything.", why: "That is the operating rhythm from day one." },
  ],
  prompts: [
    { q: "The moment real estate became serious for you.", h: "One turning point. Then how it still shows up in the way you work." },
    { q: "A deal or a client decision that got difficult.", h: "What was at stake, what you did, what happened. A trade-off, or something you could not control." },
    { q: "The experience that changed how you take responsibility.", h: "For a client or a team. What you learned, what you do differently now." },
    { q: "A working day people rarely see.", h: "A recent one. What happened before or after the inspections, calls or auctions. A moment your judgment mattered." },
    { q: "A client moment that shows what you bring.", h: "A handover, a hard conversation, a referral. What you did and any feedback you actually got." },
    { q: "Optional. A setback that changed how you work.", h: "Only the part you are comfortable with, and what changed after. Tap Next to skip." },
    { q: "Optional. An early moment in this city that explains who you are today.", h: "Belonging, ambition, finding your place. Leave it out if it feels too personal. Tap Next to skip." },
    { q: "What should stay private.", h: "Family, history, opinions, filming situations you do not want. Say background only for anything we should hear but never use." },
  ],
  shootOptions: [],
  photoAsks: ["A photo of a listing we could film at", "A photo of your desk or the office"],
};

export const jatinRound: RoundConfig = {
  ...defaultRound,
  cards: [
    { id: "name", claim: "Six months from now, when someone in the West talks real estate, your name comes up first.", why: "That is the whole job. Recall, then trust. If there is something else you want people to remember after a few videos, say it on the mic." },
    { id: "who", claim: "The people you most want are first-home buyers and upgrading families in Melbourne's North and West.", why: "Truganina and around is the heart of it. If you know the decision they are stuck on and what they cannot find in an agent, tell us in a voice note." },
    { id: "community", claim: "You are at home with the Indian community, but the brand talks to everyone in the West.", why: "Comfortable there, not boxed in there." },
    { id: "proof", claim: "The numbers go first. 130-plus homes sold in a year, most as lead agent, five stars from over a hundred reviews.", why: "Results speak before introductions." },
    { id: "start", claim: "The story starts with the Uber years. You came to Australia, drove, did odd jobs, got into real estate and grew fast.", why: "The contrast is the hook. We tell it with your words, not ours. The turning point itself, you tell us on the drive." },
    { id: "office", claim: "The Truganina office is part of the story. There is a standard you want the team known for.", why: "One detail from the space, or one thing the people there should be known for. Say it on the mic if there is one." },
    { id: "line", claim: "Nothing is promised in three months. That line still holds.", why: "Say what it means to you and the experience behind it. If it no longer reflects your thinking, tap Not quite and tell us what you would say today." },
    { id: "voice", claim: "You talk calm and straight. Hindi, Punjabi or English, whatever the client speaks.", why: "The captions and voiceovers will sound like that too. A few phrases you actually use with clients, and any words that feel unlike you, on the mic." },
    { id: "camera", claim: "You would rather be heard than perform. Voiceover-led reels, you on screen when it adds weight, never a put-on accent.", why: "We build your comfort slowly. No scripts to memorise." },
    { id: "format", claim: "Talking to a client feels more natural than talking to a lens. Conversations and walkthroughs first, direct to camera later.", why: "If there are two or three accounts or videos you enjoy, any industry, name them on the mic. What works there, and what would feel forced on you." },
    { id: "lifestyle", claim: "The car and the watch show up in the background. They are never the point.", why: "Polished Jatin, not manufactured Jatin." },
    { id: "family", claim: "Family stays off camera unless you say otherwise.", why: "Off limits by default. Anything else that should stay private, say it here or on the last drive prompt." },
    { id: "rhythm", claim: "Stories almost every day, 12 to 15 reels a month, and you check with us before reposting anything.", why: "That is the operating rhythm from day one." },
  ],
  prompts: [
    { q: "The moment real estate became serious for you.", h: "One turning point. Then how it still shows up in the way you work." },
    { q: "A deal or a client decision that got difficult.", h: "What was at stake, what you did, what happened. A trade-off, or something you could not control." },
    { q: "The experience that changed how you take responsibility.", h: "For a client or the team. If working with Ravi is part of it, what you learned and what you do differently now." },
    { q: "A working day people rarely see.", h: "A recent one. What happened before or after the inspections, calls or auctions. A moment your judgment mattered." },
    { q: "A client moment that shows what you bring.", h: "A key handover, a hard conversation, a referral. What you did and any feedback you actually got." },
    { q: "Optional. A setback that changed how you work.", h: "Only the part you are comfortable with, and what changed after. Tap Next to skip." },
    { q: "Optional. An early moment in Melbourne that explains who you are today.", h: "Belonging, ambition, finding your place. Leave it out if it feels too personal. Tap Next to skip." },
    { q: "What should stay private.", h: "Family, history, opinions, filming situations you do not want. Say background only for anything we should hear but never use." },
  ],
  shootOptions: ["Sat 15 Nov", "Tue 18 Nov", "Sat 22 Nov"],
  photoAsks: ["A photo of a listing we could film at", "A photo of your desk at the Truganina office"],
};

/** Akshay's test client. The house set with a lede that says it is a test. No facts about Akshay invented. */
export const akshayDemoRound: RoundConfig = {
  ...defaultRound,
  lede: "This one is the test run. Tap through it the way a client would, record a short drive, send a photo, and break whatever you can.",
  intro: "Each card is one line of a story. Nothing here is real yet, it is the house set a new client would start from.",
  shootOptions: ["Sat 15 Nov", "Tue 18 Nov", "Sat 22 Nov"],
  photoAsks: ["Any photo, just to test the drop"],
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
