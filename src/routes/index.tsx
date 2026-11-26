import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type ReactNode } from "react";
import { useDb, uid, fmt, type Db, type Status, type Pojazd } from "@/lib/store";
import { lookupRoblox, type RobloxUser } from "@/lib/roblox.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Terminal KSP — Bluebird" },
      { name: "description", content: "Terminal mobilny patrolu KSP: legitymowanie, mandaty, pojazdy, komunikaty." },
      { property: "og:title", content: "Terminal KSP — Bluebird" },
      { property: "og:description", content: "Terminal mobilny patrolu KSP." },
    ],
  }),
  component: App,
});

type Screen = "home" | "legit" | "interwencja" | "komunikaty" | "zdarzenia" | "mandat" | "wyrok" | "bazaM" | "bazaW" | "meldunki" | "dyspozycje" | "pojazdy" | "dodajPojazd" | "status" | "dyspozytor";
type Up = (f: (d: Db) => Partial<Db>) => void;

const NAZWY: Record<Screen, string> = {
  home: "Strona główna", legit: "Legitymowania", interwencja: "Interwencja własna", komunikaty: "Komunikaty",
  zdarzenia: "Zdarzenia", mandat: "Mandat", wyrok: "Wyrok", bazaM: "Baza mandatów", bazaW: "Baza wyroków",
  meldunki: "Meldunki", dyspozycje: "Dyspozycje", pojazdy: "Pojazdy", dodajPojazd: "Dodaj pojazd",
  status: "Zmień status", dyspozytor: "Dyspozytor",
};
const PARENT: Partial<Record<Screen, Screen>> = { mandat: "zdarzenia", wyrok: "zdarzenia", bazaM: "zdarzenia", bazaW: "zdarzenia", dodajPojazd: "pojazdy", dyspozytor: "status" };

function App() {
  const { db, up, ready } = useDb();
  const [s, setS] = useState<Screen>("home");
  if (!ready) return <Shell><div /></Shell>;
  if (!db.zalogowany) return <Shell><Login onOk={() => up(() => ({ zalogowany: true }))} /></Shell>;
  const back = () => setS(PARENT[s] ?? "home");
  return (
    <Shell>
      {s !== "home" && (
        <div className="mb-2 flex items-center gap-2 bg-alert px-2 py-1 text-sm">
          <button onClick={back} className="font-bold">◀</button>
          <span>Prod &gt;&gt; {NAZWY[s]}</span>
        </div>
      )}
      {s === "home" && <Home db={db} up={up} go={setS} />}
      {s === "legit" && <Legit db={db} up={up} />}
      {s === "interwencja" && <Interwencja db={db} up={up} />}
      {s === "komunikaty" && <Komunikaty db={db} up={up} />}
      {s === "zdarzenia" && <Menu items={[["Mandat", () => setS("mandat")], ["Wyrok", () => setS("wyrok")], ["Baza Mandatów", () => setS("bazaM")], ["Baza Wyroków", () => setS("bazaW")]]} />}
      {s === "mandat" && <MandatForm up={up} done={() => setS("bazaM")} />}
      {s === "wyrok" && <WyrokForm up={up} done={() => setS("bazaW")} />}
      {s === "bazaM" && <Baza rows={db.mandaty.map((m) => ({ id: m.id, t: `${m.nick} (${m.pesel})`, d: `${m.kwota} zł · ${m.pkt} pkt · ${m.powod}`, c: m.czas }))} onDel={(id) => up((d) => ({ mandaty: d.mandaty.filter((x) => x.id !== id) }))} />}
      {s === "bazaW" && <Baza rows={db.wyroki.map((m) => ({ id: m.id, t: `${m.nick} (${m.pesel})`, d: `${m.czasKary} · ${m.powod}`, c: m.czas }))} onDel={(id) => up((d) => ({ wyroki: d.wyroki.filter((x) => x.id !== id) }))} />}
      {s === "meldunki" && <Meldunki db={db} up={up} />}
      {s === "dyspozycje" && <Dyspozycje db={db} up={up} />}
      {s === "pojazdy" && <Pojazdy db={db} up={up} add={() => setS("dodajPojazd")} />}
      {s === "dodajPojazd" && <DodajPojazd up={up} done={() => setS("pojazdy")} />}
      {s === "status" && <StatusScreen db={db} up={up} go={setS} />}
      {s === "dyspozytor" && <Dyspozytor db={db} up={up} />}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-screen max-w-md bg-background p-2 font-sans text-foreground">{children}</div>;
}

function Login({ onOk }: { onOk: () => void }) {
  const [l, setL] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(false);
  return (
    <form className="mt-16 space-y-3" onSubmit={(e) => { e.preventDefault(); if (l === "KSP" && p === "lodev") onOk(); else setErr(true); }}>
      <div className="bg-primary py-3 text-center text-lg font-bold text-primary-foreground">TERMINAL KSP</div>
      <input className="field" placeholder="Login" value={l} onChange={(e) => setL(e.target.value)} autoCapitalize="characters" />
      <input className="field" type="password" placeholder="Hasło" value={p} onChange={(e) => setP(e.target.value)} />
      {err && <p className="text-center text-sm text-destructive">Błędny login lub hasło</p>}
      <button className="go">Zaloguj</button>
    </form>
  );
}

function Home({ db, up, go }: { db: Db; up: Up; go: (s: Screen) => void }) {
  const wInt = db.interwencja !== null;
  const nowe = db.komunikaty.filter((k) => k.stan === "nowy").length;
  const T = (label: ReactNode, s: Screen, extra = "", dis = false) => (
    <button disabled={dis} onClick={() => go(s)} className={`tile ${extra}`}>{label}</button>
  );
  return (
    <div className="space-y-2">
      <div className="bg-primary py-1 text-center text-sm text-primary-foreground">Broadcaster: Połączony</div>
      <div className="bg-alert px-2 py-0.5 text-sm">Prod &gt;&gt; Strona główna</div>
      <button onClick={() => go("status")} className="go py-2">Status patrolu: <b>{db.status}</b> / Zmień status</button>
      <div className="grid grid-cols-2 gap-2">
        {T("Legitymowania", "legit", "h-20")}
        {T(<>Interwencja<br />własna</>, "interwencja", "h-20")}
        {T(<>Komunikaty{nowe > 0 && ` (${nowe})`}</>, "komunikaty", "h-12")}
        {T("Zdarzenia", "zdarzenia", "h-12")}
        {T(wInt ? "Meldunki" : <span className="text-xs normal-case">(tylko w interwencji)<br />MELDUNKI</span>, "meldunki", "h-12", !wInt)}
        {T(wInt ? "Dyspozycje" : <span className="text-xs normal-case">(tylko w interwencji)<br />DYSPOZYCJE</span>, "dyspozycje", "h-12", !wInt)}
        <button className="tile danger h-12" onClick={() => {
          if (!confirm("Wysłać sygnał RATUNEK?")) return;
          up((d) => ({ komunikaty: [{ id: uid(), powod: "RATUNEK — Potrzebne wsparcie", wzywajacy: d.nick, czas: Date.now(), stan: "nowy" }, ...d.komunikaty] }));
          alert("Sygnał ratunkowy wysłany");
        }}>Ratunek</button>
        {T("Pojazdy", "pojazdy", "h-12")}
      </div>
      <button className="mt-4 w-full text-xs text-muted-foreground underline" onClick={() => up(() => ({ zalogowany: false }))}>Wyloguj</button>
    </div>
  );
}

function Legit({ db, up }: { db: Db; up: Up }) {
  const look = useServerFn(lookupRoblox);
  const [pesel, setPesel] = useState(""); const [u, setU] = useState<RobloxUser | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const upr = u ? db.uprawnienia[String(u.id)] ?? { bron: false, prawko: false } : null;
  const toggle = (k: "bron" | "prawko") => u && up((d) => {
    const cur = d.uprawnienia[String(u.id)] ?? { bron: false, prawko: false };
    return { uprawnienia: { ...d.uprawnienia, [String(u.id)]: { ...cur, [k]: !cur[k] } } };
  });
  const mand = u ? db.mandaty.filter((m) => m.pesel === String(u.id)) : [];
  const wyr = u ? db.wyroki.filter((m) => m.pesel === String(u.id)) : [];
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-foreground bg-muted">
          {u?.avatar ? <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" /> : <span className="text-3xl text-muted-foreground">🖼</span>}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="field">{u ? u.name : "N/A"}</div>
          <div className="field">{u ? u.displayName : "N/A"}</div>
          <div className="field">{u ? `Ur. ${new Date(u.created).toLocaleDateString("pl-PL")}` : "N/A"}</div>
        </div>
      </div>
      <input className="field" inputMode="numeric" placeholder="Wpisz Pesel" value={pesel} onChange={(e) => setPesel(e.target.value.replace(/\D/g, ""))} />
      <button className="go" disabled={busy} onClick={async () => {
        setBusy(true); setErr(""); setU(null);
        try { const r = await look({ data: { id: pesel } }); if (r.ok) setU(r.user); else setErr(r.error); } catch { setErr("Nieprawidłowy PESEL"); }
        setBusy(false);
      }}>{busy ? "Sprawdzanie..." : "Sprawdź"}</button>
      {err && <p className="text-center text-sm text-destructive">{err}</p>}
      <button className="tile w-full normal-case" disabled={!u} onClick={() => toggle("bron")}>Pozwolenie na Broń{upr && `: ${upr.bron ? "TAK" : "NIE"}`}</button>
      <button className="tile w-full normal-case" disabled={!u} onClick={() => toggle("prawko")}>Prawo Jazdy{upr && `: ${upr.prawko ? "TAK" : "NIE"}`}</button>
      {u && (
        <div className="text-xs">
          <p className="font-bold">Mandaty: {mand.length} · Pkt karne: {mand.reduce((a, m) => a + m.pkt, 0)} · Wyroki: {wyr.length}</p>
          {db.pojazdy.filter((p) => p.wlascicielPesel === String(u.id)).map((p) => <p key={p.rej}>Pojazd: {p.rej} — {p.marka}</p>)}
        </div>
      )}
    </div>
  );
}

function Interwencja({ db, up }: { db: Db; up: Up }) {
  const on = db.interwencja !== null;
  return (
    <div className="space-y-2">
      <p className="text-center text-sm">{on ? `Interwencja od: ${fmt(db.interwencja!)}` : "Brak aktywnej interwencji"}</p>
      <button className={on ? "tile danger w-full py-3" : "go py-3"} onClick={() => up(() => on ? { interwencja: null, status: "Wolny" } : { interwencja: Date.now(), status: "W trakcie interwencji" })}>
        {on ? "Zakończ interwencję" : "Rozpocznij interwencję"}
      </button>
    </div>
  );
}

function Komunikaty({ db, up }: { db: Db; up: Up }) {
  const [p, setP] = useState(""); const [w, setW] = useState("");
  const set = (id: string, stan: "przyjety" | "odrzucony") => up((d) => ({
    komunikaty: d.komunikaty.map((k) => k.id === id ? { ...k, stan } : k),
    ...(stan === "przyjety" ? { status: "W drodze na interwencję" as Status } : {}),
  }));
  return (
    <div className="min-h-[70vh] space-y-2 bg-tile p-1">
      <div className="bg-muted py-1 text-center">KOMUNIKATY</div>
      {db.komunikaty.length === 0 && <p className="text-center text-sm">Brak komunikatów</p>}
      {db.komunikaty.map((k) => (
        <div key={k.id} className="bg-panel p-2 text-panel-foreground">
          <p className="text-sm font-bold">Powód: {k.powod}</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="text-xs">Wzywający: {k.wzywajacy}<br />{fmt(k.czas)}</p>
            {k.stan === "nowy" ? (
              <div className="flex w-28 flex-col gap-1">
                <button className="danger py-0.5 font-bold" onClick={() => set(k.id, "odrzucony")}>Odrzuć</button>
                <button className="bg-primary py-0.5 font-bold text-primary-foreground" onClick={() => set(k.id, "przyjety")}>Przyjmij</button>
              </div>
            ) : <span className="text-xs font-bold uppercase">{k.stan === "przyjety" ? "Przyjęty" : "Odrzucony"}</span>}
          </div>
        </div>
      ))}
      <div className="space-y-1 bg-background p-2">
        <input className="field" placeholder="Powód (nowy komunikat)" value={p} onChange={(e) => setP(e.target.value)} />
        <input className="field" placeholder="Wzywający (nick)" value={w} onChange={(e) => setW(e.target.value)} />
        <button className="go" onClick={() => { if (!p) return; up((d) => ({ komunikaty: [{ id: uid(), powod: p, wzywajacy: w || d.nick, czas: Date.now(), stan: "nowy" }, ...d.komunikaty] })); setP(""); setW(""); }}>Dodaj komunikat</button>
        {db.komunikaty.length > 0 && <button className="tile w-full text-xs" onClick={() => up(() => ({ komunikaty: [] }))}>Wyczyść</button>}
      </div>
    </div>
  );
}

function Menu({ items }: { items: [string, () => void][] }) {
  return <div className="space-y-2">{items.map(([l, f]) => <button key={l} className="tile w-full py-3 normal-case" onClick={f}>{l}</button>)}</div>;
}

function useNick() {
  const look = useServerFn(lookupRoblox);
  return async (pesel: string) => { try { const r = await look({ data: { id: pesel } }); return r.ok ? r.user.name : null; } catch { return null; } };
}

function MandatForm({ up, done }: { up: Up; done: () => void }) {
  const nick = useNick();
  const [f, setF] = useState({ pesel: "", kwota: "", pkt: "", powod: "" }); const [err, setErr] = useState("");
  return (
    <div className="space-y-2 pt-4">
      <input className="field" inputMode="numeric" placeholder="Pesel" value={f.pesel} onChange={(e) => setF({ ...f, pesel: e.target.value.replace(/\D/g, "") })} />
      <input className="field" inputMode="numeric" placeholder="kwota" value={f.kwota} onChange={(e) => setF({ ...f, kwota: e.target.value.replace(/\D/g, "") })} />
      <input className="field" inputMode="numeric" placeholder="Pkt Karne" value={f.pkt} onChange={(e) => setF({ ...f, pkt: e.target.value.replace(/\D/g, "") })} />
      <textarea className="field h-24" placeholder="Powód" value={f.powod} onChange={(e) => setF({ ...f, powod: e.target.value })} />
      {err && <p className="text-center text-sm text-destructive">{err}</p>}
      <button className="go" onClick={async () => {
        if (!f.pesel || !f.kwota || !f.powod) return setErr("Uzupełnij pola");
        const n = await nick(f.pesel); if (!n) return setErr("Brak osoby w bazie");
        up((d) => ({ mandaty: [{ id: uid(), pesel: f.pesel, nick: n, kwota: +f.kwota, pkt: +f.pkt || 0, powod: f.powod, czas: Date.now() }, ...d.mandaty] }));
        done();
      }}>Wystaw</button>
    </div>
  );
}

function WyrokForm({ up, done }: { up: Up; done: () => void }) {
  const nick = useNick();
  const [f, setF] = useState({ pesel: "", czas: "", powod: "" }); const [err, setErr] = useState("");
  return (
    <div className="space-y-2 pt-4">
      <input className="field" inputMode="numeric" placeholder="Pesel" value={f.pesel} onChange={(e) => setF({ ...f, pesel: e.target.value.replace(/\D/g, "") })} />
      <input className="field" placeholder="Czas" value={f.czas} onChange={(e) => setF({ ...f, czas: e.target.value })} />
      <textarea className="field h-28" placeholder="Powód" value={f.powod} onChange={(e) => setF({ ...f, powod: e.target.value })} />
      {err && <p className="text-center text-sm text-destructive">{err}</p>}
      <button className="go" onClick={async () => {
        if (!f.pesel || !f.czas || !f.powod) return setErr("Uzupełnij pola");
        const n = await nick(f.pesel); if (!n) return setErr("Brak osoby w bazie");
        up((d) => ({ wyroki: [{ id: uid(), pesel: f.pesel, nick: n, czasKary: f.czas, powod: f.powod, czas: Date.now() }, ...d.wyroki] }));
        done();
      }}>Wystaw</button>
    </div>
  );
}

function Baza({ rows, onDel }: { rows: { id: string; t: string; d: string; c: number }[]; onDel: (id: string) => void }) {
  const [q, setQ] = useState("");
  const f = rows.filter((r) => (r.t + r.d).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      <input className="field" placeholder="Szukaj (pesel / nick)" value={q} onChange={(e) => setQ(e.target.value)} />
      {f.length === 0 && <p className="text-center text-sm text-muted-foreground">Brak wpisów</p>}
      {f.map((r) => (
        <div key={r.id} className="bg-tile p-2 text-sm">
          <div className="flex justify-between"><b>{r.t}</b><button className="text-destructive" onClick={() => confirm("Usunąć?") && onDel(r.id)}>✕</button></div>
          <p>{r.d}</p><p className="text-xs">{fmt(r.c)}</p>
        </div>
      ))}
    </div>
  );
}

function Meldunki({ db, up }: { db: Db; up: Up }) {
  const [t, setT] = useState("");
  return (
    <div className="space-y-2">
      <textarea className="field h-28" placeholder="Treść meldunku" value={t} onChange={(e) => setT(e.target.value)} />
      <button className="go" onClick={() => { if (!t) return; up((d) => ({ meldunki: [{ id: uid(), tresc: t, czas: Date.now() }, ...d.meldunki] })); setT(""); }}>Wyślij meldunek</button>
      {db.meldunki.map((m) => <div key={m.id} className="bg-tile p-2 text-sm"><p>{m.tresc}</p><p className="text-xs">{fmt(m.czas)}</p></div>)}
    </div>
  );
}

function Dyspozycje({ db, up }: { db: Db; up: Up }) {
  const [t, setT] = useState("");
  return (
    <div className="space-y-2">
      <input className="field" placeholder="Nowa dyspozycja" value={t} onChange={(e) => setT(e.target.value)} />
      <button className="go" onClick={() => { if (!t) return; up((d) => ({ dyspozycje: [{ id: uid(), tresc: t, czas: Date.now(), wykonana: false }, ...d.dyspozycje] })); setT(""); }}>Dodaj</button>
      {db.dyspozycje.map((m) => (
        <button key={m.id} className={`tile w-full flex-col normal-case ${m.wykonana ? "opacity-50 line-through" : ""}`} onClick={() => up((d) => ({ dyspozycje: d.dyspozycje.map((x) => x.id === m.id ? { ...x, wykonana: !x.wykonana } : x) }))}>
          <span>{m.tresc}</span><span className="text-xs">{fmt(m.czas)}</span>
        </button>
      ))}
    </div>
  );
}

function Pojazdy({ db, up, add }: { db: Db; up: Up; add: () => void }) {
  const [q, setQ] = useState(""); const [p, setP] = useState<Pojazd | null>(null); const [err, setErr] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-foreground bg-muted">
          {p?.foto ? <img src={p.foto} alt={p.rej} className="h-full w-full object-cover" /> : <span className="text-3xl text-muted-foreground">🖼</span>}
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="field">{p ? p.marka : "N/A"}</div>
          <div className="field">{p ? p.kolor : "N/A"}</div>
          <div className="field">{p ? p.wlasciciel || p.wlascicielPesel : "N/A"}</div>
        </div>
      </div>
      <input className="field uppercase" placeholder="Wpisz rejestracje" value={q} onChange={(e) => setQ(e.target.value.toUpperCase().replace(/\s/g, ""))} />
      <button className="go" onClick={() => { const f = db.pojazdy.find((x) => x.rej === q) ?? null; setP(f); setErr(f ? "" : "Brak pojazdu w bazie"); }}>Sprawdź</button>
      {err && <p className="text-center text-sm text-destructive">{err}</p>}
      {p && (
        <div className="space-y-1 text-sm">
          <p>Rejestracja: <b>{p.rej}</b> · PESEL właściciela: {p.wlascicielPesel || "—"}</p>
          <p>OC: <b>{p.oc ? "Ważne" : "BRAK"}</b> · Przegląd: <b>{p.przeglad ? "Ważny" : "BRAK"}</b></p>
          {p.poszukiwany && <p className="danger p-1 text-center font-bold">POJAZD POSZUKIWANY</p>}
          <button className="tile w-full text-xs" onClick={() => { if (confirm("Usunąć pojazd?")) { up((d) => ({ pojazdy: d.pojazdy.filter((x) => x.rej !== p.rej) })); setP(null); } }}>Usuń pojazd</button>
        </div>
      )}
      <button className="tile w-full normal-case" onClick={add}>+ Dodaj pojazd ręcznie</button>
      <p className="text-xs text-muted-foreground">W bazie: {db.pojazdy.map((x) => x.rej).join(", ") || "brak"}</p>
    </div>
  );
}

function DodajPojazd({ up, done }: { up: Up; done: () => void }) {
  const nick = useNick();
  const [f, setF] = useState<Pojazd>({ rej: "", marka: "", kolor: "", wlascicielPesel: "", wlasciciel: "", oc: true, przeglad: true, poszukiwany: false, foto: "" });
  const [busy, setBusy] = useState(false);
  const inp = (k: keyof Pojazd, ph: string) => <input className="field" placeholder={ph} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: k === "rej" ? e.target.value.toUpperCase().replace(/\s/g, "") : e.target.value })} />;
  const chk = (k: "oc" | "przeglad" | "poszukiwany", l: string) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />{l}</label>;
  return (
    <div className="space-y-2">
      {inp("rej", "Rejestracja")}{inp("marka", "Marka / model")}{inp("kolor", "Kolor")}
      {inp("wlascicielPesel", "PESEL właściciela (ID Roblox)")}{inp("foto", "Link do zdjęcia (opcjonalnie)")}
      {chk("oc", "Ważne OC")}{chk("przeglad", "Ważny przegląd")}{chk("poszukiwany", "Poszukiwany")}
      <button className="go" disabled={busy} onClick={async () => {
        if (!f.rej || !f.marka) return alert("Podaj rejestrację i markę");
        setBusy(true);
        const w = f.wlascicielPesel ? (await nick(f.wlascicielPesel)) ?? "" : "";
        up((d) => ({ pojazdy: [{ ...f, wlasciciel: w }, ...d.pojazdy.filter((x) => x.rej !== f.rej)] }));
        setBusy(false); done();
      }}>Zapisz pojazd</button>
    </div>
  );
}

function StatusScreen({ db, up, go }: { db: Db; up: Up; go: (s: Screen) => void }) {
  const opts: Status[] = ["W trakcie interwencji", "W drodze na interwencję", "Wolny", "Przerwa", "Zajęty"];
  return (
    <div className="space-y-2">
      {opts.map((o) => <button key={o} className={`tile w-full normal-case ${db.status === o ? "ring-2 ring-primary" : ""}`} onClick={() => { up(() => ({ status: o })); go("home"); }}>{o}</button>)}
      <button className="tile h-40 w-full normal-case" onClick={() => go("dyspozytor")}>Dyspozytor</button>
    </div>
  );
}

function Dyspozytor({ db, up }: { db: Db; up: Up }) {
  return (
    <div className="min-h-[70vh] space-y-2 bg-tile p-1">
      <div className="bg-panel p-2 text-panel-foreground">
        <input className="w-full bg-transparent text-lg outline-none" value={db.nick} onChange={(e) => up(() => ({ nick: e.target.value }))} />
        <p className={`text-xl uppercase ${db.status === "Wolny" ? "text-ok" : "text-alert"}`}>{db.status}</p>
      </div>
      <p className="text-center text-xs">Dotknij nicku, aby go zmienić</p>
    </div>
  );
}
