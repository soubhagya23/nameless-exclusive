"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AssetLink } from "@/lib/types";
import { actionDeleteLink } from "./actions";
import { CATEGORY_WORDS } from "./link-form";

function host(url: string) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } }

export default function LinksList({ links, back }: { links: AssetLink[]; back: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  if (!links.length) return <p className="label" style={{ color: "var(--dim)" }}>No links yet.</p>;
  return (
    <div className="rowlist">
      {links.map((l) => (
        <div key={l.id}>
          <span className="pill" style={{ whiteSpace: "nowrap" }}>{CATEGORY_WORDS[l.category] || l.category}</span>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <div>
              <a href={l.url} target="_blank" rel="noopener" style={{ color: "var(--ink)", fontWeight: 500 }}>{l.title}</a>
              <span className="label" style={{ color: "var(--dim)", marginLeft: 8 }}>{host(l.url)}</span>
              {l.note ? <div style={{ marginTop: 2, fontSize: 14 }}>{l.note}</div> : null}
            </div>
            <span style={{ display: "flex", gap: 6 }}>
              <button className="btn link" type="button" style={{ fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(l.url); }}>Copy</button>
              <button className="btn link" type="button" style={{ fontSize: 11 }} onClick={() => { if (confirm(`Remove "${l.title}"? The folder itself is untouched.`)) start(async () => { await actionDeleteLink(l.id, back); router.refresh(); }); }}>Remove</button>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
