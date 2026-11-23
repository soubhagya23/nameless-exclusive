import type { Metadata } from "next";

export const metadata: Metadata = { title: "How HQ works", robots: { index: false, follow: false } };

const HQ = "https://hq.thenameless.studio";
const EX = "https://exclusive.thenameless.studio";

function Shot({ src, alt, phone, caption }: { src: string; alt: string; phone?: boolean; caption?: string }) {
  return (
    <figure style={{ margin: "22px 0 0", display: "grid", gap: 8, justifyItems: phone ? "start" : "stretch" }}>
      <img src={`/guide/${src}`} alt={alt} style={{ display: "block", width: phone ? 300 : "100%", maxWidth: "100%", border: "1px solid var(--line)", background: "#fff" }} />
      {caption ? <figcaption className="label" style={{ color: "var(--dim)" }}>{caption}</figcaption> : null}
    </figure>
  );
}

function Phones({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>{children}</div>;
}

let n = 0;
const num = () => `( 0${++n} )`;

export default function Guide() {
  n = 0;
  return (
    <div>
      <header className="band dark" style={{ paddingBlock: 64 }}>
        <div className="in">
          <div className="nav" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="redact" aria-label="nameless" /><span className="label" style={{ color: "var(--dim)" }}>HQ · how it works</span></div>
          <h1 style={{ marginTop: 40 }}>One page.<br />How we run <span className="acc">a client.</span></h1>
          <p className="lede">Everything the team needs to onboard a client, get his answers, plan the shoots and keep the work moving. Ten minutes to read, then you know the whole thing.</p>
          <div style={{ marginTop: 28, display: "grid", gap: 6 }}>
            <span className="label" style={{ color: "var(--dim)" }}>Two addresses</span>
            <span><b style={{ fontWeight: 500 }}>{HQ.replace("https://", "")}</b> <span style={{ color: "var(--dim)" }}>is ours. Sign in with your email.</span></span>
            <span><b style={{ fontWeight: 500 }}>{EX.replace("https://", "")}/name</b> <span style={{ color: "var(--dim)" }}>is the client&apos;s private page. Never share it with anyone but him.</span></span>
          </div>
        </div>
      </header>

      <section className="band">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>Sign <span className="acc">in.</span></h2><p>No passwords. Go to {HQ.replace("https://", "")}, type your email, open the link from the email on the same device. You are in. If it says your email is not on the list, ask Soubh or Akshay to add you under Team.</p></div></div>
        </div>
      </section>

      <section className="band grey">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>The <span className="acc">flow.</span></h2><p>Every client goes through the same four steps. HQ is built around them, so if you know this you know HQ.</p></div></div>
          <div className="stages">
            <div className="stage"><span className="label">Onboarded</span><div><b>New client in HQ.</b> Name, WhatsApp, his intro questions. Nothing reaches him yet.</div></div>
            <div className="stage"><span className="label">Intro questions</span><div><b>Sent once.</b> Fourteen cards, two taps each, a voice note if he wants. His answers land in HQ as he taps.</div></div>
            <div className="stage"><span className="label">Brief</span><div><b>Written from his answers.</b> One click, then edit it. This is the client brief every shoot is planned from.</div></div>
            <div className="stage"><span className="label">Shoots</span><div><b>Three per client.</b> Before each one his page shows what we are going for, a few questions, and the plan. He taps Works for me.</div></div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>Clients.</h2><p>The first thing you see. One tile per client with where he is right now. A tile turns amber when we sent him something and he has been quiet for two days.</p></div></div>
          <Shot src="hq-clients.jpg" alt="The Clients list in HQ" />
        </div>
      </section>

      <section className="band grey">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>A client&apos;s <span className="acc">page.</span></h2><p>Open a client and you get his journey as cards: Step 1 Intro questions, then one card per shoot, then Add a shoot. Each card says in one line what to do next, so you never have to guess where he is. Click a card to open that step. Under the cards: the brief, a box to ask him something, his Links, and what he did last.</p></div></div>
          <Shot src="hq-client.jpg" alt="A client overview in HQ with the step cards" />
        </div>
      </section>

      <section className="band">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>Step 1. Intro <span className="acc">questions.</span></h2><p>Open the Intro questions card. Press <b style={{ fontWeight: 500 }}>Send to him</b>, then <b style={{ fontWeight: 500 }}>Copy the WhatsApp</b> and paste it to him. That is the whole send. His cards fill in on this page as he taps, with his voice notes transcribed under each one. When all of them are in, press <b style={{ fontWeight: 500 }}>Write the first draft</b> on the right. Read it, fix it, Save edits. Then <b style={{ fontWeight: 500 }}>Mark done</b>.</p></div></div>
          <Shot src="hq-intro.jpg" alt="The Intro questions step in HQ" />
          <p style={{ marginTop: 28, maxWidth: "36em" }}>What he sees on his phone. His name, one job for the week, and the cards. Two taps per card, This is me or Not quite, and a line underneath if he wants to add his voice. He can go back and change a card until the last one is in.</p>
          <Phones>
            <Shot src="c-hero.jpg" alt="The client's page on a phone, the handshake" phone />
            <Shot src="c-card-after.jpg" alt="A card after he taps This is me" phone />
          </Phones>
        </div>
      </section>

      <section className="band grey">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>Step 2. A <span className="acc">shoot.</span></h2><p>Shoot 1 is drafted the moment a client is created. Open its card, press <b style={{ fontWeight: 500 }}>Edit what he sees</b> and fill three things: what we are trying to do on this shoot (two or three plain sentences, he reads this first), the content references (reel links, images, a Drive folder, with one line each on why), and the questions for this shoot. Save, back, <b style={{ fontWeight: 500 }}>Send to him</b>, Copy the WhatsApp.</p></div></div>
          <Shot src="hq-shoot.jpg" alt="A shoot step in HQ" />
          <Shot src="hq-edit.jpg" alt="Edit what he sees: the shoot editor" caption="Edit what he sees" />
          <p style={{ marginTop: 28, maxWidth: "36em" }}>His side. Once his intro cards are in, his page only shows the shoot: what we are going for with the references, then the questions one at a time. He types or records, presses Send, the next one appears. Sent is final, there is no going back, so answers are his and not polished. Everything lands under Questions on the shoot page in HQ, voice notes transcribed.</p>
          <Phones>
            <Shot src="c-going.jpg" alt="What we are going for, on his phone" phone />
            <Shot src="c-question.jpg" alt="One question at a time, on his phone" phone />
          </Phones>
          <p style={{ marginTop: 28, maxWidth: "36em" }}>Need one more thing from him at any point: <b style={{ fontWeight: 500 }}>Ask him something</b> at the bottom of the shoot page or on his overview. It appears on his page under From Akshay and his answer comes back the same way.</p>
          <p style={{ marginTop: 14, maxWidth: "36em" }}>Shoot 2 and 3: on his overview, Add a shoot, leave it on Draft with AI. It writes the questions from everything he has told us so far, the first one always about his day in the week of the shoot. Read them, edit them, add references, send.</p>
        </div>
      </section>

      <section className="band">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>The <span className="acc">plan.</span></h2><p>When his answers are in and the day is picked, fill the Shoot plan on the right of the shoot page: date, call time, where we meet, run of day, what to wear, what to bring, a day-before checklist. <b style={{ fontWeight: 500 }}>Send plan to his page</b>. He taps Works for me and ticks the list the day before; you see both in HQ. After the shoot, <b style={{ fontWeight: 500 }}>Mark done</b> and drop the footage folder in Links.</p></div></div>
          <Shot src="hq-shoot-plan.jpg" alt="The shoot plan form in HQ" />
          <Phones>
            <Shot src="c-plan.jpg" alt="The plan on his phone with Works for me" phone caption="His side: the plan, one button" />
          </Phones>
        </div>
      </section>

      <section className="band grey">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>Board.</h2><p>Where the work lives. To do, In progress, Review, Done. Add a card, drag it between columns, click it to set who is on it, which client, when it is due and any notes. Filter by client or by person. Late cards go red. If it is not on the board it is not happening.</p></div></div>
          <Shot src="hq-board.jpg" alt="The team board in HQ" />
        </div>
      </section>

      <section className="band">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>Links.</h2><p>Every Drive folder and shared link, grouped by client. Raw footage, edits, brand, docs. Add one from here or from the client&apos;s own page. When you are looking for footage, this is the only place to look.</p></div></div>
          <Shot src="hq-links.jpg" alt="The Links page in HQ" />
        </div>
      </section>

      <section className="band grey">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>Team.</h2><p>Who can sign in. Add an email and a first name and they are in, no passwords, no setup. The first name is what shows on the board.</p></div></div>
          <Shot src="hq-team.jpg" alt="The Team page in HQ" />
        </div>
      </section>

      <section className="band dark">
        <div className="in">
          <div className="head"><span className="label">{num()}</span><div><h2>Four <span className="acc">rules.</span></h2></div></div>
          <div className="stages">
            <div className="stage" style={{ borderColor: "var(--dline)" }}><span className="label">One</span><div><b style={{ color: "#fff" }}>His link is private.</b> It goes to him on WhatsApp and nowhere else. No screenshots of his page outside the team.</div></div>
            <div className="stage" style={{ borderColor: "var(--dline)" }}><span className="label">Two</span><div><b style={{ color: "#fff" }}>Reset everything means everything.</b> It wipes his answers, recordings and the brief. It is for tests, not for tidying.</div></div>
            <div className="stage" style={{ borderColor: "var(--dline)" }}><span className="label">Three</span><div><b style={{ color: "#fff" }}>Send means send.</b> The moment you press Send to him, his page changes and he may be reading it. Check the words first.</div></div>
            <div className="stage" style={{ borderColor: "var(--dline)" }}><span className="label">Four</span><div><b style={{ color: "#fff" }}>Our name never appears on his page.</b> The black bar is deliberate. Do not add the studio name, logo or handle to anything he sees.</div></div>
          </div>
        </div>
      </section>

      <footer className="band dark" style={{ paddingTop: 0 }}>
        <div className="in foot"><span className="label">Internal. Do not forward.</span><span className="label"><a href="mailto:hello@thenameless.studio" style={{ color: "#fff" }}>hello@thenameless.studio</a></span></div>
      </footer>
    </div>
  );
}
