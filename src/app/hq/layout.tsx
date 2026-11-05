import Link from "next/link";
import { redirect } from "next/navigation";
import { hqUser } from "@/lib/supabase-server";

export default async function HQLayout({ children }: { children: React.ReactNode }) {
  const user = await hqUser();
  if (!user) redirect("/login");
  return (
    <div className="hq">
      <div className="hq-top">
        <Link href="/hq" className="label" style={{ display: "inline-flex", alignItems: "center", gap: 12 }}><span className="redact" /> HQ</Link>
        <div className="links label">
          <Link href="/hq/new">New client</Link>
          <span style={{ color: "var(--dim)" }}>{user.email}</span>
          <form action="/auth/signout" method="post"><button className="btn ghost small" style={{ color: "#fff", borderColor: "#fff" }} type="submit">Sign out</button></form>
        </div>
      </div>
      <main className="hq-main"><div className="in wide">{children}</div></main>
    </div>
  );
}
