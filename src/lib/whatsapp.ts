/** Ready-to-paste WhatsApp messages. Short, plain, in our voice. */

export function clientLink(slug: string) {
  const host = process.env.CLIENT_HOST;
  return host ? `https://${host}/${slug}` : `/c/${slug}`;
}

export function msgShootLive(firstName: string, shootNumber: number, slug: string, minutes = 3) {
  const link = clientLink(slug);
  if (shootNumber === 0) return `${firstName}, your page is ready. About ${minutes} minutes, voice notes welcome, Hindi or English, whatever comes out. Everything after that is on us.\n${link}`;
  return `${firstName}, shoot ${shootNumber} is coming up. Ten minutes on your page, most of it in the car, so we film the right things.\n${link}`;
}

export function msgPlanSent(firstName: string, shootNumber: number, date: string | undefined, slug: string) {
  const link = clientLink(slug);
  return `${firstName}, shoot ${shootNumber} is planned${date ? ` for ${date}` : ""}. The run of day is on your page. One tap if it works for you.\n${link}`;
}

export function msgNudge(firstName: string, shootNumber: number, slug: string) {
  const link = clientLink(slug);
  if (shootNumber === 0) return `${firstName}, whenever you get a quiet three minutes, your page is waiting. Thumbs only.\n${link}`;
  return `${firstName}, whenever you get a quiet ten minutes, the shoot ${shootNumber} page is waiting. Car ride is perfect for it.\n${link}`;
}

export function msgAsk(firstName: string, slug: string) {
  const link = clientLink(slug);
  return `${firstName}, one quick question on your page. Thirty seconds.\n${link}`;
}

export function waUrl(number: string | null, text: string) {
  return `https://wa.me/${number || ""}?text=${encodeURIComponent(text)}`;
}
