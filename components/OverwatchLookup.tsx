"use client";
import { useState } from "react";

export default function OverwatchLookup() {
  const [btag, setBtag] = useState("");
  const [platform, setPlatform] = useState("pc");
  const [region, setRegion] = useState("eu");
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  async function query() {
    setErr(""); setOut(null);
    try {
      const url = `/api/ow/profile?btag=${encodeURIComponent(btag)}&platform=${platform}&region=${region}`;
      const r = await fetch(url, { cache: "no-store" });
      const text = await r.text();
      if (!r.ok) throw new Error(text || r.statusText);
      const json = JSON.parse(text);
      setOut(json.data);
    } catch (e:any) {
      setErr(e.message ?? "Unknown error");
    }
  }

  return (
    <div style={{display:"grid", gap:12, maxWidth:560}}>
      <h2>Overwatch Lookup</h2>

      <label>BattleTag
        <input
          value={btag}
          onChange={e=>setBtag(e.target.value)}
          placeholder="Name#12345"
          style={{width:"100%"}}
        />
      </label>

      <label>Plattform
        <select value={platform} onChange={e=>setPlatform(e.target.value)}>
          <option value="pc">PC</option>
          <option value="xbl">Xbox</option>
          <option value="psn">PlayStation</option>
          <option value="switch">Switch</option>
        </select>
      </label>

      <label>Region (falls API es benötigt)
        <select value={region} onChange={e=>setRegion(e.target.value)}>
          <option value="eu">EU</option>
          <option value="us">US</option>
          <option value="asia">ASIA</option>
          <option value="kr">KR</option>
        </select>
      </label>

      <button onClick={query}>Suchen</button>

      {err && <pre style={{color:"crimson",whiteSpace:"pre-wrap"}}>{err}</pre>}
      {out && <pre style={{whiteSpace:"pre-wrap"}}>{JSON.stringify(out,null,2)}</pre>}
    </div>
  );
}
