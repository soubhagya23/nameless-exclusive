/** What the client sees between rounds: nothing to do, and his shoot day if one is confirmed. */
export default function Quiet({ client, round }: { client: { name: string; first_name: string; portrait_url: string | null }; round: { title: string; shoot_date: string | null; shoot_note: string | null } | null }) {
  void round;
  return (
    <div>
      <header className="band dark hero" style={{ minHeight: "100vh", paddingBottom: 56 }}>
        <div className="in">
          <div className="nav"><span className="redact" aria-label="nameless" /><span className="label" style={{ color: "var(--dim)" }}>Exclusive / {client.name}</span></div>
          <div className="top">
            <div>
              <h1 style={{ marginTop: 14 }}>{client.first_name}.<br />Nothing to do <span className="acc">right now.</span></h1>
              <p className="lede">{round?.shoot_date ? "Your shoot day is locked. We will message you the morning before with the run of day." : "We are working on your side of the table. When the next step is ready, this page changes and we send you a note."}</p>
            </div>
            {client.portrait_url ? <figure><img src={client.portrait_url} alt={client.name} width={560} height={560} /></figure> : <div />}
          </div>
          {round?.shoot_date ? (
            <div className="job">
              <span className="label">Shoot day</span>
              <b>{round.shoot_date}</b>
              {round.shoot_note ? <span style={{ color: "var(--dim)" }}>{round.shoot_note}</span> : null}
            </div>
          ) : null}
        </div>
      </header>
    </div>
  );
}
