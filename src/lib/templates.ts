import type { RoundConfig } from "./types";

/**
 * The onboarding questionnaire: the cards he taps when he is onboarded, once. Built from the
 * 14-question personal branding questionnaire. The story questions that need his voice go on
 * the shoot 1 drive (see shoot1 below), the ones he can confirm with a tap are cards here.
 * HQ > New client starts from this; edit the cards for the person.
 *
 * Map to the questionnaire:
 *  cards   01 reputation, 02 people, 05 office, 09 belief, 10 voice, 11 content that feels like you, 12 off limits
 *  drive   03 turning point, 07 difficult decision (first pass), 04 responsibility, 06 working day, 08 trust, 13 and 14 optional
 */
export const defaultQuestionnaire: RoundConfig = {
  lede: "We wrote your story from what we already know. You just tell us where we got it wrong. Thumbs only, no typing.",
  intro: "Each card is one line of the story we plan to build. Nothing here is public yet, and a yes on a card is not a yes to post it.",
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
  prompts: [],
  shootOptions: [],
  photoAsks: ["A photo of your desk or the office"],
};

export const defaultShoot1: RoundConfig = {
  lede: "Ten minutes in the car, a photo or two, and pick a day. We do the rest.",
  intro: "",
  secondsPerPrompt: 75,
  cards: [],
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
  photoAsks: ["A photo of a listing we could film at"],
  references: [],
};

export const jatinQuestionnaire: RoundConfig = {
  ...defaultQuestionnaire,
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
  prompts: [],
  shootOptions: [],
  photoAsks: ["A photo of your desk at the Truganina office"],
};

export const jatinShoot1: RoundConfig = {
  lede: "Ten minutes in the car, a photo of a listing, and pick a day. We do the rest.",
  intro: "",
  secondsPerPrompt: 75,
  cards: [],
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
  photoAsks: ["A photo of a listing we could film at"],
  references: [],
};

/**
 * Akshay's own personal brand questionnaire. Built only from what he has already told Soubh:
 * founder building in public, the operator to brand-builder storyline, raw and premium, Hinglish, no guru energy.
 * Nothing here is an invented fact. Numbers stay out until he gives them.
 */
export const akshayQuestionnaire: RoundConfig = {
  lede: "You have sat on the other side of this table for Jatin. Your turn. Thumbs only, no typing.",
  intro: "Each card is one line of the story we would build from what you have already told me. Nothing public yet, and a yes on a card is not a yes to post it.",
  cards: [
    { id: "name", claim: "Six months from now, people know you as the founder who builds businesses and turns them into brands people actually notice.", why: "Not a guru, not a coach, not a business page. A founder building in public. If there is something else you want people to remember, say it on the mic." },
    { id: "who", claim: "This is for young founders, business owners, ambitious Indians in Australia and overseas, and people building something of their own.", why: "Not only marketers. If you know who you most want watching, say it in a voice note." },
    { id: "start", claim: "The story starts in the store. India, Dubai, Melbourne, then years doing everything yourself at 30 Minutes Fix.", why: "Repairs, customers, staff, new locations. That is the proof you can build an operating business. The turning point itself, you tell us on the drive." },
    { id: "chapter", claim: "The storyline is the transition. Operator inside the store, to founder building products, brands and a studio.", why: "Every month of content documents where that is up to. This is the spine of the whole thing." },
    { id: "proof", claim: "Three proofs, three businesses. 30 Minutes Fix shows you can run one, Dropshieldz shows you can build a product brand, the studio shows you can build brands for others.", why: "Only what is true. No invented numbers, ever. When you want figures on screen, you give them." },
    { id: "unfinished", claim: "You do not have it figured out, and the content says so. Decisions, money pressure, mistakes, wins, uncertainty.", why: "The journey is the content. The moment it looks finished, it stops being interesting." },
    { id: "pov", claim: "People come away thinking this guy understands branding, without you ever claiming it. And you have opinions and say them.", why: "Business, employees, money, customer service, building in Australia, the immigrant journey. Not every post teaches. Some just make people think." },
    { id: "voice", claim: "You talk simple. English with Hindi mixed in, short sentences, slightly imperfect is fine.", why: "No polished corporate English. If a caption sounds like an agency wrote it, it is wrong. A few phrases you actually use, on the mic." },
    { id: "style", claim: "Raw and premium. Real phone footage, cinematic B-roll, voiceover, strong sound, clean type, good pacing.", why: "Raw because it is real, premium because the edit is good. Never raw because it is cheap." },
    { id: "visual", claim: "No Canva look, no black and gold, no AI luxury moodboards, no serif on everything, no templated carousels.", why: "Editorial, documentary, fashion-campaign influence, film grain where it earns it. Designed by people who get culture." },
    { id: "life", claim: "Life shows up. Family, travel, cars, gym, cafes, work days, quiet days, stress. Never as a flex.", why: "Success stays in the background. And not every life moment becomes business content. The roka was a moment, not a case study." },
    { id: "role", claim: "On camera you are the founder and creative director, not the editor. You see it, direct it, make the call, appear in it. The team executes.", why: "Your time goes to decisions and relationships, not to timelines." },
    { id: "objective", claim: "Attention, then trust, then reputation, then opportunities. The audience should never feel sold to.", why: "Studio clients, partnerships, podcasts and deals come from reputation, not from pitches in captions." },
    { id: "family", claim: "Family and the relationship appear on your terms, moment by moment. Nothing goes up without a yes from you.", why: "Off limits by default. You choose each one. Say on the last drive prompt what is always out." },
  ],
  prompts: [],
  shootOptions: [],
  photoAsks: ["Your desk, or wherever you actually work now"],
};

export const akshayShoot1: RoundConfig = {
  lede: "Ten minutes in the car, a photo or two, and pick a day. The team does the rest.",
  intro: "",
  secondsPerPrompt: 75,
  cards: [],
  prompts: [
    { q: "The day you decided to step out of the store.", h: "What you were doing, what you were tired of, what you wanted instead. How it still shows up in how you work." },
    { q: "A decision at 30 Minutes Fix that got hard.", h: "A location, a hire, a bad month. What was at stake, what you did, what happened. Something you could not control." },
    { q: "What most business owners get wrong about branding.", h: "Say it the way you would to a friend over coffee, not to a camera." },
    { q: "The Dropshieldz story so far.", h: "Why you started it, what is scary about it, where it is up to this week." },
    { q: "The studio, in your words.", h: "Why no name. Who it is for. What you refuse to do." },
    { q: "Optional. India, Dubai, Melbourne. One moment from the move that explains you.", h: "Belonging, ambition, being new somewhere. Leave it out if it feels too personal. Tap Next to skip." },
    { q: "What should stay private.", h: "People, money, history, filming situations you do not want. Say background only for anything we hear but never use." },
  ],
  shootOptions: ["Sat 15 Nov", "Tue 18 Nov", "Sat 22 Nov"],
  photoAsks: ["A photo from inside one of the stores, any one"],
  references: [],
};

/** Starting point for shoot 2 and 3 when the AI draft is not used. Short: what changed, what to film next. */
export const followUpRound: RoundConfig = {
  lede: "The last shoot is in. A few quick things before the next one, so we film the right day.",
  intro: "Questions first, in your voice. Then a few cards to tap.",
  secondsPerPrompt: 60,
  cards: [
    { id: "day", kind: "question", claim: "Walk us through a normal working day in the week of the shoot, start to finish.", why: "Where you are at 7, at 11, at 4, at 8. Where the day actually goes. We plan the shoot around it." },
    { id: "moments", kind: "question", claim: "What is coming up in the next two weeks that we should film?", why: "An inspection, an auction, a handover, a meeting. Dates if you know them." },
    { id: "feedback", kind: "question", claim: "What did people say about the reels so far?", why: "Clients, friends, other agents. The exact words if you remember them." },
    { id: "more-less", kind: "question", claim: "What do you want more of, and less of, next time?", why: "Be blunt. This is how the next shoot gets better." },
    { id: "feel", claim: "The reels so far feel like you, not like an ad.", why: "If they do not, we change the direction, not the volume." },
    { id: "comfort", claim: "You are more comfortable on camera than on the first shoot day.", why: "We push a little further each time, never a lot." },
    { id: "next-listing", claim: "There is at least one listing we can film at next time.", why: "Keys, light, a walkthrough. Send a photo below." },
    { id: "client-on-camera", claim: "A happy client would be fine saying a few words on camera.", why: "Two sentences is enough. We ask them, not you." },
  ],
  prompts: [],
  shootOptions: [],
  photoAsks: ["A photo of the listing for this shoot"],
  references: [],
};

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "card";
}

/** Which sets a client starts from. Named clients get their own, everyone else the house set. */
export function setsFor(slug: string): { questionnaire: RoundConfig; shoot1: RoundConfig } {
  if (slug === "jatin") return { questionnaire: jatinQuestionnaire, shoot1: jatinShoot1 };
  if (slug === "akshay") return { questionnaire: akshayQuestionnaire, shoot1: akshayShoot1 };
  return { questionnaire: defaultQuestionnaire, shoot1: defaultShoot1 };
}
