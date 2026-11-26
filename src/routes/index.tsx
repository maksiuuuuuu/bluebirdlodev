import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Clock3,
  FileText,
  Fingerprint,
  IdCard,
  KeyRound,
  LifeBuoy,
  ListChecks,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  Navigation,
  NotebookPen,
  Plus,
  Radio,
  RadioTower,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Siren,
  Trash2,
  UserRound,
  UserRoundSearch,
  X,
  type LucideIcon,
} from "lucide-react";
import { useDb, uid, fmt, type Db, type Status, type Pojazd, type Mandat as MandatType } from "@/lib/store";
import { lookupRoblox, type RobloxUser } from "@/lib/roblox.functions";
import { randomDrivingLicense } from "@/lib/permissions";
import dowodFront from "@/assets/dowod-front.png.asset.json";
import dowodBack from "@/assets/dowod-back.png.asset.json";
import legitymacjaPolicji from "@/assets/legitymacja-policji.png.asset.json";
import prawoJazdyFront from "@/assets/prawo-jazdy-front.png.asset.json";
import prawoJazdyBack from "@/assets/prawo-jazdy-back.png.asset.json";
import mandatKarny from "@/assets/mandat-karny.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Terminal KSP — Policyjny terminal mobilny" },
      { name: "description", content: "Policyjny terminal mobilny KSP: legitymowanie, mandaty, pojazdy, komunikaty i status patrolu." },
      { property: "og:title", content: "Terminal KSP — Policyjny terminal mobilny" },
      { property: "og:description", content: "Mobilny panel patrolu KSP do legitymowania, obsługi zdarzeń i komunikatów." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Screen = "home" | "legit" | "legitymacja" | "interwencja" | "komunikaty" | "zdarzenia" | "mandat" | "mandatPodglad" | "wyrok" | "bazaM" | "bazaW" | "meldunki" | "dyspozycje" | "pojazdy" | "dodajPojazd" | "status" | "dyspozytor";
type Up = (f: (d: Db) => Partial<Db>) => void;

const NAZWY: Record<Screen, string> = {
  home: "Panel główny", legit: "Legitymowanie", legitymacja: "Legitymacja służbowa", interwencja: "Interwencja własna", komunikaty: "Komunikaty",
  zdarzenia: "Zdarzenia", mandat: "Wystaw mandat", mandatPodglad: "Podgląd mandatu", wyrok: "Wystaw wyrok", bazaM: "Baza mandatów", bazaW: "Baza wyroków",
  meldunki: "Meldunki", dyspozycje: "Dyspozycje", pojazdy: "Baza pojazdów", dodajPojazd: "Rejestracja pojazdu",
  status: "Status patrolu", dyspozytor: "Dyspozytor",
};
const PARENT: Partial<Record<Screen, Screen>> = { mandat: "zdarzenia", mandatPodglad: "zdarzenia", wyrok: "zdarzenia", bazaM: "zdarzenia", bazaW: "zdarzenia", dodajPojazd: "pojazdy", dyspozytor: "status" };

function App() {
  const { db, up, ready } = useDb();
  const [s, setS] = useState<Screen>("home");
  const [ostatniMandat, setOstatniMandat] = useState<MandatType | null>(null);
  if (!ready) return <Shell><div className="min-h-[60vh]" /></Shell>;
  if (!db.zalogowany) return <Shell><Login onOk={() => up(() => ({ zalogowany: true }))} /></Shell>;
  const back = () => setS(PARENT[s] ?? "home");
  return (
    <Shell>
      {s !== "home" && (
        <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
          <button onClick={back} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-card text-primary active:bg-secondary" aria-label="Wróć">
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Terminal KSP / Moduł</p>
            <p className="truncate text-sm font-bold text-foreground">{NAZWY[s]}</p>
          </div>
        </div>
      )}
      {s === "home" && <Home db={db} up={up} go={setS} />}
      {s === "legit" && <Legit db={db} up={up} />}
      {s === "legitymacja" && <LegitymacjaScreen db={db} />}
      {s === "interwencja" && <Interwencja db={db} up={up} />}
      {s === "komunikaty" && <Komunikaty db={db} up={up} />}
      {s === "zdarzenia" && <Menu items={[["Wystaw mandat", () => setS("mandat")], ["Wystaw wyrok", () => setS("wyrok")], ["Baza mandatów", () => setS("bazaM")], ["Baza wyroków", () => setS("bazaW")]]} />}
      {s === "mandat" && <MandatForm up={up} officer={db.nick} done={(m) => { setOstatniMandat(m); setS("mandatPodglad"); }} />}
      {s === "mandatPodglad" && ostatniMandat && <MandatPodglad mandat={ostatniMandat} go={setS} />}
      {s === "wyrok" && <WyrokForm up={up} done={() => setS("bazaW")} />}
      {s === "bazaM" && <Baza title="Baza mandatów" rows={db.mandaty.map((m) => ({ id: m.id, t: `${m.nick} (${m.pesel})`, d: `${m.kwota} zł · ${m.pkt} pkt · ${m.powod}`, c: m.czas }))} onDel={(id) => up((d) => ({ mandaty: d.mandaty.filter((x) => x.id !== id) }))} />}
      {s === "bazaW" && <Baza title="Baza wyroków" rows={db.wyroki.map((m) => ({ id: m.id, t: `${m.nick} (${m.pesel})`, d: `${m.czasKary} · ${m.powod}`, c: m.czas }))} onDel={(id) => up((d) => ({ wyroki: d.wyroki.filter((x) => x.id !== id) }))} />}
      {s === "meldunki" && <Meldunki db={db} up={up} />}
      {s === "dyspozycje" && <Dyspozycje db={db} up={up} />}
      {s === "pojazdy" && <Pojazdy db={db} up={up} add={() => setS("dodajPojazd")} />}
      {s === "dodajPojazd" && <DodajPojazd up={up} done={() => setS("pojazdy")} />}
      {s === "status" && <StatusScreen db={db} up={up} go={setS} />}
      {s === "dyspozytor" && <Dyspozytor db={db} up={up} />}
    </Shell>
  );
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function PoliceBadge({ small = false }: { small?: boolean }) {
  return (
    <div className={`${small ? "h-9 w-9" : "h-12 w-12"} flex shrink-0 items-center justify-center rounded-full border border-police-foreground/30 bg-police-foreground/10`}>
      <Shield size={small ? 22 : 30} strokeWidth={1.7} className="text-police-foreground" />
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const now = useClock();
  return (
    <div className="min-h-screen bg-secondary sm:px-4 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-background sm:min-h-[calc(100vh-3rem)] sm:rounded-lg sm:border sm:border-border sm:shadow-xl">
        <header className="masthead text-police-foreground">
          <div className="flex items-center justify-between border-b border-police-foreground/15 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em]">
            <span className="flex items-center gap-1.5"><RadioTower size={12} /> Terminal mobilny</span>
            <span className="flex items-center gap-1.5 tabular-nums"><Clock3 size={12} /> {now ? now.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "--:--"}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <PoliceBadge />
            <div className="min-w-0 flex-1">
              <p className="text-[22px] font-bold leading-none tracking-[0.22em]">POLICJA</p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-police-foreground/80">Komenda Stołeczna Policji</p>
            </div>
            <div className="border-l border-police-foreground/25 pl-3 text-right">
              <p className="text-xs font-bold tracking-widest">KSP</p>
              <p className="mt-0.5 text-[9px] uppercase text-police-foreground/70">Warszawa</p>
            </div>
          </div>
          <div className="h-1 bg-police-accent" />
        </header>
        <main className="flex-1 p-3">{children}</main>
        <footer className="flex items-center justify-between border-t border-border bg-card px-4 py-2 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <span>System KSP · Roblox</span>
          <span className="flex items-center gap-1.5"><CircleDot size={10} className="text-ok" /> Zapis lokalny aktywny</span>
        </footer>
      </div>
    </div>
  );
}

function Login({ onOk }: { onOk: () => void }) {
  const [l, setL] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState(false);
  return (
    <div className="flex min-h-[65vh] flex-col justify-center py-6">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground"><LockKeyhole size={25} /></div>
        <h1 className="text-xl font-bold tracking-tight">Logowanie do terminala</h1>
        <p className="mt-1 text-xs text-muted-foreground">Uwierzytelnianie funkcjonariusza</p>
      </div>
      <form className="rounded-md border border-border bg-card p-4 shadow-sm" onSubmit={(e) => { e.preventDefault(); if (l === "KSP" && p === "lodev") onOk(); else setErr(true); }}>
        <div className="space-y-4">
          <label className="block">
            <span className="form-label">Identyfikator służbowy</span>
            <div className="relative"><UserRound size={17} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" /><input className="field pl-10" placeholder="Login" value={l} onChange={(e) => { setL(e.target.value); setErr(false); }} autoCapitalize="characters" autoComplete="username" /></div>
          </label>
          <label className="block">
            <span className="form-label">Hasło</span>
            <div className="relative"><KeyRound size={17} className="pointer-events-none absolute left-3 top-3 text-muted-foreground" /><input className="field pl-10" type="password" placeholder="Hasło" value={p} onChange={(e) => { setP(e.target.value); setErr(false); }} autoComplete="current-password" /></div>
          </label>
          {err && <p className="flex items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"><AlertTriangle size={15} /> Błędny login lub hasło</p>}
          <button className="go flex items-center justify-center gap-2 py-2.5">Zaloguj do terminala <ChevronRight size={18} /></button>
        </div>
      </form>
      <p className="mt-5 text-center text-[10px] uppercase leading-relaxed tracking-wider text-muted-foreground">Dostęp wyłącznie dla upoważnionych użytkowników</p>
    </div>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border pb-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary"><Icon size={22} /></div>
      <div><h1 className="text-base font-bold leading-tight">{title}</h1><p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

function Panel({ title, icon: Icon, children, action }: { title?: string; icon?: LucideIcon; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card shadow-sm">
      {title && <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-3 py-2"><h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">{Icon && <Icon size={15} className="text-primary" />}{title}</h2>{action}</div>}
      <div className="p-3">{children}</div>
    </section>
  );
}

function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex items-start justify-between gap-3 border-b border-border py-2 text-xs last:border-0 last:pb-0 first:pt-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-semibold text-foreground">{value}</span></div>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "danger" | "primary" }) {
  const tones = { neutral: "bg-secondary text-secondary-foreground", ok: "bg-ok/15 text-ok", danger: "bg-destructive/10 text-destructive", primary: "bg-primary/10 text-primary" };
  return <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>;
}

function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="rounded-md border border-dashed border-border bg-card px-4 py-7 text-center"><Icon size={30} strokeWidth={1.4} className="mx-auto text-muted-foreground" /><p className="mt-2 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p></div>;
}

function DocumentSides({ side, onChange }: { side: "front" | "back"; onChange: (side: "front" | "back") => void }) {
  return (
    <div className="mb-2 grid grid-cols-2 gap-1 rounded-sm bg-secondary p-1">
      <button className={`rounded-sm py-1.5 text-[10px] font-bold uppercase tracking-wider ${side === "front" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => onChange("front")}>Awers</button>
      <button className={`rounded-sm py-1.5 text-[10px] font-bold uppercase tracking-wider ${side === "back" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`} onClick={() => onChange("back")}>Rewers</button>
    </div>
  );
}

function DowodDokument({ u }: { u: RobloxUser }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const numer = `RBX ${u.id}`;
  const dataUr = new Date(u.created).toLocaleDateString("pl-PL");
  const dataWydania = new Date().toLocaleDateString("pl-PL");
  return (
    <div>
      <DocumentSides side={side} onChange={setSide} />
      <div className="document-card" style={{ aspectRatio: "358 / 231" }}>
        <img src={side === "front" ? dowodFront.url : dowodBack.url} alt={side === "front" ? "Wzór przodu dowodu osobistego" : "Wzór tyłu dowodu osobistego"} className="h-auto w-full" draggable={false} />
        {side === "front" ? (
          <>
            <span className="document-value" style={{ left: "39%", top: "26%", width: "43%" }}>{u.name}</span>
            <span className="document-value" style={{ left: "39%", top: "43%", width: "43%" }}>{u.displayName}</span>
            <span className="document-value" style={{ left: "39%", top: "61%", width: "24%" }}>polskie</span>
            <span className="document-value" style={{ left: "65%", top: "61%", width: "25%" }}>{dataUr}</span>
            <span className="document-value" style={{ left: "39%", top: "74%", width: "39%" }}>{numer}</span>
            <span className="document-value" style={{ left: "39%", top: "84%", width: "34%" }}>31.12.2035</span>
            {u.avatar && <img src={u.avatar} alt={`Zdjęcie ${u.name}`} className="document-photo" style={{ left: "76%", top: "44%", width: "18%", height: "31%" }} />}
          </>
        ) : (
          <>
            <span className="document-value" style={{ left: "5%", top: "17%", width: "48%" }}>{u.id}</span>
            <span className="document-value" style={{ left: "65%", top: "17%", width: "31%" }}>{numer}</span>
            <span className="document-value" style={{ left: "5%", top: "30%", width: "48%" }}>Roblox</span>
            <span className="document-value" style={{ left: "5%", top: "42%", width: "50%" }}>{u.name}</span>
            <span className="document-value" style={{ left: "5%", top: "54%", width: "50%" }}>Nie podano</span>
            <span className="document-value" style={{ left: "67%", top: "54%", width: "28%" }}>{dataWydania}</span>
            <span className="document-value" style={{ left: "5%", top: "65%", width: "65%" }}>Komendant Stołeczny Policji</span>
          </>
        )}
      </div>
    </div>
  );
}

function PrawoJazdyDokument({ u }: { u: RobloxUser }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const numer = `RBX${u.id}`.slice(0, 20);
  const dataUr = new Date(u.created).toLocaleDateString("pl-PL");
  return (
    <div>
      <DocumentSides side={side} onChange={setSide} />
      <div className="document-card" style={{ aspectRatio: "736 / 469" }}>
        <img src={side === "front" ? prawoJazdyFront.url : prawoJazdyBack.url} alt={side === "front" ? "Wzór przodu prawa jazdy" : "Wzór tyłu prawa jazdy"} className="h-auto w-full" draggable={false} />
        {side === "front" ? (
          <>
            <span className="document-value" style={{ left: "38%", top: "27%", width: "48%" }}>{u.name}</span>
            <span className="document-value" style={{ left: "38%", top: "35%", width: "48%" }}>{u.displayName}</span>
            <span className="document-value" style={{ left: "38%", top: "43%", width: "52%" }}>{dataUr} · Roblox</span>
            <span className="document-value" style={{ left: "38%", top: "52%", width: "40%" }}>{new Date().toLocaleDateString("pl-PL")}</span>
            <span className="document-value" style={{ left: "38%", top: "60%", width: "40%" }}>31.12.2035</span>
            <span className="document-value" style={{ left: "38%", top: "68%", width: "48%" }}>Komendant Stołeczny Policji</span>
            <span className="document-value" style={{ left: "38%", top: "77%", width: "45%" }}>{numer}</span>
            {u.avatar && <img src={u.avatar} alt={`Zdjęcie ${u.name}`} className="document-photo" style={{ left: "5%", top: "24%", width: "20%", height: "48%" }} />}
          </>
        ) : (
          <>
            <span className="document-value document-value-small" style={{ left: "43%", top: "59%", width: "16%" }}>{new Date().toLocaleDateString("pl-PL")}</span>
            <span className="document-value document-value-small" style={{ left: "60%", top: "59%", width: "16%" }}>31.12.2035</span>
            <span className="document-value document-value-small" style={{ left: "78%", top: "59%", width: "17%" }}>KSP</span>
          </>
        )}
      </div>
    </div>
  );
}

function LegitymacjaScreen({ db }: { db: Db }) {
  return (
    <div className="space-y-3">
      <SectionHeading icon={BadgeCheck} title="Legitymacja służbowa" subtitle="Dokument funkcjonariusza Policji" />
      <div className="document-card mx-auto max-w-[290px] shadow-lg" style={{ aspectRatio: "279 / 450" }}>
        <img src={legitymacjaPolicji.url} alt="Wzór legitymacji Policji obowiązujący od 2019 roku" className="h-auto w-full" draggable={false} />
        <div className="document-photo flex items-center justify-center bg-secondary" style={{ left: "7%", top: "17%", width: "43%", height: "36%" }}><Shield size={52} strokeWidth={1.2} className="text-primary" /></div>
        <span className="document-value" style={{ left: "57%", top: "45%", width: "38%" }}>KSP-217</span>
        <span className="document-value" style={{ left: "57%", top: "55%", width: "38%" }}>31.12.2030</span>
        <span className="document-value" style={{ left: "8%", top: "64%", width: "78%" }}>KSP-217</span>
        <span className="document-value" style={{ left: "8%", top: "73%", width: "78%" }}>{db.nick}</span>
        <span className="document-value" style={{ left: "8%", top: "81%", width: "78%" }}>Funkcjonariusz KSP</span>
        <span className="document-value" style={{ left: "8%", top: "88%", width: "78%" }}>Aspirant</span>
      </div>
      <Panel title="Dane funkcjonariusza" icon={IdCard}>
        <DataRow label="Jednostka" value="Komenda Stołeczna Policji" />
        <DataRow label="Numer służbowy" value="KSP-217" />
        <DataRow label="Nick" value={db.nick} />
        <DataRow label="Stopień" value="Aspirant" />
      </Panel>
    </div>
  );
}

function MandatDokument({ mandat: m }: { mandat: MandatType }) {
  const numer = String(m.czas).slice(-7);
  return (
    <div className="document-card mandate-card" style={{ aspectRatio: "1765 / 1233" }}>
      <img src={mandatKarny.url} alt="Wypełniony mandat karny" className="h-auto w-full" draggable={false} />
      <span className="document-value document-mask" style={{ left: "77%", top: "2%", width: "19%", padding: "0.5%" }}>{numer}</span>
      <span className="document-value" style={{ left: "4%", top: "22%", width: "28%" }}>{m.kwota} zł</span>
      <span className="document-value" style={{ left: "14%", top: "33%", width: "65%" }}>{m.nick}</span>
      <span className="document-value" style={{ left: "13%", top: "41%", width: "56%" }}>{m.pesel}</span>
      <span className="document-value" style={{ left: "43%", top: "47%", width: "48%" }}>Dowód osobisty RBX {m.pesel}</span>
      <span className="document-value mandate-reason" style={{ left: "4%", top: "61%", width: "88%" }}>{m.powod}</span>
      <span className="document-value" style={{ left: "84%", top: "77%", width: "10%" }}>{m.pkt}</span>
      <span className="document-value document-value-small" style={{ left: "4%", top: "86%", width: "23%" }}>{m.funkcjonariusz ?? "Funkcjonariusz KSP"}</span>
      <span className="document-value" style={{ left: "35%", top: "85%", width: "26%" }}>{new Date(m.czas).toLocaleDateString("pl-PL")}</span>
      <span className="document-value document-value-small" style={{ left: "4%", top: "94%", width: "23%" }}>{m.funkcjonariusz ?? "KSP"}</span>
      <span className="document-value document-value-small" style={{ left: "35%", top: "94%", width: "24%" }}>{m.nick}</span>
    </div>
  );
}

function Home({ db, up, go }: { db: Db; up: Up; go: (s: Screen) => void }) {
  const wInt = db.interwencja !== null;
  const nowe = db.komunikaty.filter((k) => k.stan === "nowy").length;
  const T = (label: string, s: Screen, icon: LucideIcon, dis = false, badge?: number) => (
    <button disabled={dis} onClick={() => go(s)} className="menu-tile">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
        {(() => { const Icon = icon; return <Icon size={21} strokeWidth={1.8} />; })()}
        {badge ? <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{badge}</span> : null}
      </div>
      <span className="text-left text-[11px] font-bold uppercase leading-tight tracking-wide">{label}</span>
      <ChevronRight size={15} className="ml-auto text-muted-foreground" />
    </button>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-sm border border-ok/20 bg-ok/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-foreground">
        <span className="flex items-center gap-2"><Radio size={14} className="text-ok" /> Łączność z dyspozytorem</span><span className="flex items-center gap-1.5 text-ok"><span className="h-1.5 w-1.5 rounded-full bg-ok" /> Połączono</span>
      </div>
      <div className="rounded-md bg-police p-3.5 text-police-foreground shadow-sm">
        <div className="flex items-center justify-between">
          <div><p className="text-[10px] uppercase tracking-[0.15em] text-police-foreground/65">Patrol służbowy</p><p className="mt-1 text-lg font-bold tracking-wide">KSP-217</p></div>
          <PoliceBadge small />
        </div>
        <div className="mt-3 flex items-end justify-between border-t border-police-foreground/15 pt-2.5">
          <div><p className="text-[9px] uppercase tracking-wider text-police-foreground/60">Funkcjonariusz</p><p className="mt-0.5 text-xs font-semibold">{db.nick}</p></div>
          <button onClick={() => go("status")} className="rounded-sm bg-police-foreground/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-police-foreground active:bg-police-foreground/20">Zmień status</button>
        </div>
      </div>
      <button onClick={() => go("status")} className="flex w-full items-center gap-3 rounded-md border border-primary/25 bg-primary/10 px-3 py-3 text-left active:bg-primary/15">
        <Navigation size={21} className="text-primary" /><div className="flex-1"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Aktualny status patrolu</p><p className="mt-0.5 text-sm font-bold text-primary">{db.status}</p></div><ChevronRight size={18} className="text-primary" />
      </button>
      <div>
        <p className="form-label mb-2">Panel operacyjny</p>
        <div className="grid grid-cols-2 gap-2">
          {T("Legitymowanie", "legit", UserRoundSearch)}
          {T("Legitymacja służbowa", "legitymacja", BadgeCheck)}
          {T("Interwencja własna", "interwencja", ShieldCheck)}
          {T("Komunikaty", "komunikaty", MessageSquareText, false, nowe)}
          {T("Zdarzenia", "zdarzenia", ClipboardList)}
          {T(wInt ? "Meldunki" : "Meldunki · w interwencji", "meldunki", NotebookPen, !wInt)}
          {T(wInt ? "Dyspozycje" : "Dyspozycje · w interwencji", "dyspozycje", ListChecks, !wInt)}
          {T("Baza pojazdów", "pojazdy", CarFront)}
          {T("Dyspozytor", "dyspozytor", RadioTower)}
        </div>
      </div>
      <button className="flex w-full items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive px-4 py-3 text-destructive-foreground shadow-sm active:brightness-95" onClick={() => {
        if (!confirm("Wysłać sygnał RATUNEK?")) return;
        up((d) => ({ komunikaty: [{ id: uid(), powod: "RATUNEK — Potrzebne natychmiastowe wsparcie", wzywajacy: d.nick, czas: Date.now(), stan: "nowy" }, ...d.komunikaty] }));
        alert("Sygnał ratunkowy wysłany");
      }}><LifeBuoy size={24} /><span className="text-left"><span className="block text-sm font-bold uppercase tracking-[0.16em]">Ratunek</span><span className="block text-[9px] uppercase tracking-wide opacity-80">Natychmiastowe wezwanie wsparcia</span></span></button>
      <button className="mx-auto flex items-center gap-1.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground" onClick={() => up(() => ({ zalogowany: false }))}><LogOut size={13} /> Zakończ służbę</button>
    </div>
  );
}

function Legit({ db, up }: { db: Db; up: Up }) {
  const look = useServerFn(lookupRoblox);
  const [pesel, setPesel] = useState(""); const [u, setU] = useState<RobloxUser | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [prawko, setPrawko] = useState(false);
  const upr = u ? db.uprawnienia[String(u.id)] ?? { bron: false, prawko: false } : null;
  const sprawdz = async () => {
    if (!pesel || busy) return;
    setBusy(true); setErr(""); setU(null); setPrawko(false);
    try {
      const r = await look({ data: { id: pesel } });
      if (r.ok) { setU(r.user); setPrawko(randomDrivingLicense()); }
      else setErr(r.error);
    } catch { setErr("Nieprawidłowy PESEL"); }
    setBusy(false);
  };
  const toggleBron = () => u && up((d) => {
    const cur = d.uprawnienia[String(u.id)] ?? { bron: false, prawko: false };
    return { uprawnienia: { ...d.uprawnienia, [String(u.id)]: { ...cur, bron: !cur.bron } } };
  });
  const mand = u ? db.mandaty.filter((m) => m.pesel === String(u.id)) : [];
  const wyr = u ? db.wyroki.filter((m) => m.pesel === String(u.id)) : [];
  return (
    <div className="space-y-3">
      <SectionHeading icon={IdCard} title="Legitymowanie" subtitle="Wyszukiwanie osoby i weryfikacja dokumentów" />
      <Panel title="Identyfikator osoby" icon={Fingerprint}>
        <label className="block"><span className="form-label">PESEL / ID gracza Roblox</span><input className="field text-base font-semibold tracking-wider" inputMode="numeric" placeholder="Wpisz numer identyfikacyjny" value={pesel} onChange={(e) => setPesel(e.target.value.replace(/\D/g, ""))} /></label>
        <button className="go mt-3 flex items-center justify-center gap-2" disabled={busy || !pesel} onClick={() => void sprawdz()}><Search size={17} />{busy ? "Trwa sprawdzanie..." : "Sprawdź w bazie"}</button>
        {err && <p className="mt-2 flex items-center gap-2 text-xs font-medium text-destructive"><AlertTriangle size={14} />{err}</p>}
      </Panel>
      {!u ? <EmptyState icon={UserRoundSearch} title="Brak danych do wyświetlenia" text="Wpisz ID gracza Roblox i wybierz „Sprawdź w bazie”, aby wygenerować dokumenty osoby." /> : (
        <>
          <Panel title="Dowód osobisty" icon={IdCard} action={<Badge tone="ok"><Check size={11} /> Znaleziono</Badge>}>
            <DowodDokument u={u} />
          </Panel>
          <Panel title="Uprawnienia" icon={BadgeCheck}>
            <div className="space-y-2">
              <button className="flex w-full items-center justify-between rounded-sm border border-border bg-background px-3 py-2.5 text-left" onClick={toggleBron}><span className="text-xs font-semibold">Pozwolenie na broń</span><Badge tone={upr?.bron ? "ok" : "danger"}>{upr?.bron ? "TAK" : "NIE"}</Badge></button>
              <div className="flex w-full items-center justify-between rounded-sm border border-border bg-background px-3 py-2.5"><span className="text-xs font-semibold">Prawo jazdy</span><Badge tone={prawko ? "ok" : "danger"}>{prawko ? "TAK" : "NIE"}</Badge></div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Prawo jazdy jest losowane 50/50 przy każdym sprawdzeniu dowodu.</p>
            <button className="mt-2 flex w-full items-center justify-center gap-2 rounded-sm border border-primary/30 py-2 text-[10px] font-bold uppercase tracking-wide text-primary" disabled={busy} onClick={() => void sprawdz()}><Search size={14} /> Sprawdź ponownie — nowe losowanie</button>
          </Panel>
          {prawko ? <Panel title="Prawo jazdy" icon={CarFront} action={<Badge tone="ok">Kategoria B</Badge>}><PrawoJazdyDokument u={u} /></Panel> : (
            <div className="flex items-start gap-3 rounded-md border border-destructive/25 bg-destructive/10 p-3"><AlertTriangle size={21} className="shrink-0 text-destructive" /><div><p className="text-xs font-bold uppercase tracking-wide text-destructive">Brak prawa jazdy</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Przy tym sprawdzeniu nie wylosowano uprawnienia. Kolejne sprawdzenie ponownie losuje wynik 50/50.</p></div></div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-border bg-card p-2 text-center"><p className="text-xl font-bold text-primary">{mand.length}</p><p className="text-[9px] uppercase tracking-wide text-muted-foreground">Mandaty</p></div>
            <div className="rounded-md border border-border bg-card p-2 text-center"><p className="text-xl font-bold text-primary">{mand.reduce((a, m) => a + m.pkt, 0)}</p><p className="text-[9px] uppercase tracking-wide text-muted-foreground">Punkty karne</p></div>
            <div className="rounded-md border border-border bg-card p-2 text-center"><p className="text-xl font-bold text-primary">{wyr.length}</p><p className="text-[9px] uppercase tracking-wide text-muted-foreground">Wyroki</p></div>
          </div>
        </>
      )}
    </div>
  );
}

function Interwencja({ db, up }: { db: Db; up: Up }) {
  const on = db.interwencja !== null;
  return (
    <div className="space-y-3">
      <SectionHeading icon={ShieldCheck} title="Interwencja własna" subtitle="Rejestrowanie czasu obsługi zdarzenia" />
      <Panel>
        <div className="py-4 text-center">
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${on ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}><Siren size={32} /></div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Stan interwencji</p>
          <p className="mt-1 text-lg font-bold">{on ? "Interwencja aktywna" : "Brak aktywnej interwencji"}</p>
          {on && <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><Clock3 size={14} /> Rozpoczęto: {fmt(db.interwencja!)}</p>}
        </div>
      </Panel>
      <button className={on ? "flex w-full items-center justify-center gap-2 rounded-md bg-destructive py-3 text-sm font-bold text-destructive-foreground" : "go flex items-center justify-center gap-2 py-3"} onClick={() => up(() => on ? { interwencja: null, status: "Wolny" } : { interwencja: Date.now(), status: "W trakcie interwencji" })}>
        {on ? <X size={18} /> : <Plus size={18} />}{on ? "Zakończ interwencję" : "Rozpocznij interwencję"}
      </button>
      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">Rozpoczęcie interwencji automatycznie zmienia status patrolu i odblokowuje meldunki oraz dyspozycje.</p>
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
    <div className="space-y-3">
      <SectionHeading icon={MessageSquareText} title="Komunikaty" subtitle="Zgłoszenia przyjęte przez dyspozytora" />
      {db.komunikaty.length === 0 ? <EmptyState icon={MessageSquareText} title="Brak komunikatów" text="Nowe zgłoszenia i komunikaty dyspozytora pojawią się w tym miejscu." /> : db.komunikaty.map((k) => (
        <article key={k.id} className={`overflow-hidden rounded-md border bg-card shadow-sm ${k.powod.startsWith("RATUNEK") ? "border-destructive" : "border-border"}`}>
          <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-3 py-2"><span className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground"><Clock3 size={12} />{fmt(k.czas)}</span><Badge tone={k.stan === "przyjety" ? "ok" : k.stan === "odrzucony" ? "danger" : "primary"}>{k.stan === "przyjety" ? "Przyjęty" : k.stan === "odrzucony" ? "Odrzucony" : "Nowy"}</Badge></div>
          <div className="p-3">
            <p className={`text-sm font-bold ${k.powod.startsWith("RATUNEK") ? "text-destructive" : "text-foreground"}`}>{k.powod}</p>
            <p className="mt-2 text-xs text-muted-foreground">Zgłaszający: <span className="font-semibold text-foreground">{k.wzywajacy}</span></p>
            {k.stan === "nowy" && <div className="mt-3 grid grid-cols-2 gap-2"><button className="flex items-center justify-center gap-1.5 rounded-sm border border-destructive/30 py-2 text-xs font-bold text-destructive" onClick={() => set(k.id, "odrzucony")}><X size={15} /> Odrzuć</button><button className="go flex items-center justify-center gap-1.5" onClick={() => set(k.id, "przyjety")}><Check size={15} /> Przyjmij zgłoszenie</button></div>}
          </div>
        </article>
      ))}
      <Panel title="Nowy komunikat" icon={Plus}>
        <div className="space-y-3">
          <label className="block"><span className="form-label">Treść zgłoszenia</span><textarea className="field h-20 resize-none" placeholder="Opisz zdarzenie" value={p} onChange={(e) => setP(e.target.value)} /></label>
          <label className="block"><span className="form-label">Zgłaszający</span><input className="field" placeholder="Nick zgłaszającego" value={w} onChange={(e) => setW(e.target.value)} /></label>
          <button className="go flex items-center justify-center gap-2" disabled={!p} onClick={() => { up((d) => ({ komunikaty: [{ id: uid(), powod: p, wzywajacy: w || d.nick, czas: Date.now(), stan: "nowy" }, ...d.komunikaty] })); setP(""); setW(""); }}><Send size={16} /> Dodaj komunikat</button>
          {db.komunikaty.length > 0 && <button className="flex w-full items-center justify-center gap-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground" onClick={() => up(() => ({ komunikaty: [] }))}><Trash2 size={13} /> Wyczyść historię</button>}
        </div>
      </Panel>
    </div>
  );
}

function Menu({ items }: { items: [string, () => void][] }) {
  return (
    <div className="space-y-3">
      <SectionHeading icon={ClipboardList} title="Zdarzenia" subtitle="Dokumentacja i historia działań patrolu" />
      <div className="space-y-2">{items.map(([l, f], index) => <button key={l} className="flex w-full items-center gap-3 rounded-md border border-border bg-card p-3 text-left shadow-sm active:bg-secondary" onClick={f}><div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">{index < 2 ? <FileText size={20} /> : <Search size={20} />}</div><span className="flex-1 text-sm font-semibold">{l}</span><ChevronRight size={17} className="text-muted-foreground" /></button>)}</div>
    </div>
  );
}

function useNick() {
  const look = useServerFn(lookupRoblox);
  return async (pesel: string) => { try { const r = await look({ data: { id: pesel } }); return r.ok ? r.user.name : null; } catch { return null; } };
}

function MandatForm({ up, officer, done }: { up: Up; officer: string; done: (m: MandatType) => void }) {
  const nick = useNick();
  const [f, setF] = useState({ pesel: "", kwota: "", pkt: "", powod: "" }); const [err, setErr] = useState("");
  return (
    <div className="space-y-3">
      <SectionHeading icon={FileText} title="Mandat karny" subtitle="Wystawianie dokumentu dla zidentyfikowanej osoby" />
      <Panel title="Dane mandatu" icon={ClipboardList}>
        <div className="space-y-3">
          <label className="block"><span className="form-label">PESEL / ID gracza Roblox</span><input className="field" inputMode="numeric" placeholder="Numer identyfikacyjny" value={f.pesel} onChange={(e) => setF({ ...f, pesel: e.target.value.replace(/\D/g, "") })} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="form-label">Kwota grzywny (zł)</span><input className="field" inputMode="numeric" placeholder="0" value={f.kwota} onChange={(e) => setF({ ...f, kwota: e.target.value.replace(/\D/g, "") })} /></label>
            <label className="block"><span className="form-label">Punkty karne</span><input className="field" inputMode="numeric" placeholder="0" value={f.pkt} onChange={(e) => setF({ ...f, pkt: e.target.value.replace(/\D/g, "") })} /></label>
          </div>
          <label className="block"><span className="form-label">Opis wykroczenia</span><textarea className="field h-28 resize-none" placeholder="Opisz popełnione wykroczenie" value={f.powod} onChange={(e) => setF({ ...f, powod: e.target.value })} /></label>
          {err && <p className="flex items-center gap-2 text-xs font-medium text-destructive"><AlertTriangle size={14} />{err}</p>}
          <button className="go flex items-center justify-center gap-2 py-2.5" onClick={async () => {
            if (!f.pesel || !f.kwota || !f.powod) return setErr("Uzupełnij wszystkie wymagane pola");
            const n = await nick(f.pesel); if (!n) return setErr("Brak osoby w bazie");
            const m: MandatType = { id: uid(), pesel: f.pesel, nick: n, kwota: +f.kwota, pkt: +f.pkt || 0, powod: f.powod, czas: Date.now(), funkcjonariusz: officer };
            up((d) => ({ mandaty: [m, ...d.mandaty] }));
            done(m);
          }}><FileText size={17} /> Wystaw mandat</button>
        </div>
      </Panel>
    </div>
  );
}

function MandatPodglad({ mandat, go }: { mandat: MandatType; go: (s: Screen) => void }) {
  return (
    <div className="space-y-3">
      <SectionHeading icon={FileText} title="Mandat wystawiony" subtitle="Dokument został zapisany w bazie mandatów" />
      <div className="flex items-center gap-2 rounded-sm border border-ok/25 bg-ok/10 px-3 py-2 text-xs font-semibold text-ok"><Check size={17} /> Mandat karny został poprawnie wystawiony</div>
      <MandatDokument mandat={mandat} />
      <p className="text-center text-[10px] text-muted-foreground">Dokument jest widokiem szkoleniowym na podstawie przesłanego wzoru.</p>
      <div className="grid grid-cols-2 gap-2">
        <button className="tile" onClick={() => go("bazaM")}>Baza mandatów</button>
        <button className="go" onClick={() => go("home")}>Panel główny</button>
      </div>
    </div>
  );
}

function WyrokForm({ up, done }: { up: Up; done: () => void }) {
  const nick = useNick();
  const [f, setF] = useState({ pesel: "", czas: "", powod: "" }); const [err, setErr] = useState("");
  return (
    <div className="space-y-3">
      <SectionHeading icon={FileText} title="Wyrok" subtitle="Rejestrowanie orzeczenia w bazie zdarzeń" />
      <Panel title="Dane orzeczenia" icon={ClipboardList}>
        <div className="space-y-3">
          <label className="block"><span className="form-label">PESEL / ID gracza Roblox</span><input className="field" inputMode="numeric" placeholder="Numer identyfikacyjny" value={f.pesel} onChange={(e) => setF({ ...f, pesel: e.target.value.replace(/\D/g, "") })} /></label>
          <label className="block"><span className="form-label">Wymiar kary</span><input className="field" placeholder="Np. 30 dni pozbawienia wolności" value={f.czas} onChange={(e) => setF({ ...f, czas: e.target.value })} /></label>
          <label className="block"><span className="form-label">Podstawa i uzasadnienie</span><textarea className="field h-32 resize-none" placeholder="Opisz czyn i podstawę prawną" value={f.powod} onChange={(e) => setF({ ...f, powod: e.target.value })} /></label>
          {err && <p className="flex items-center gap-2 text-xs font-medium text-destructive"><AlertTriangle size={14} />{err}</p>}
          <button className="go flex items-center justify-center gap-2 py-2.5" onClick={async () => {
            if (!f.pesel || !f.czas || !f.powod) return setErr("Uzupełnij wszystkie wymagane pola");
            const n = await nick(f.pesel); if (!n) return setErr("Brak osoby w bazie");
            up((d) => ({ wyroki: [{ id: uid(), pesel: f.pesel, nick: n, czasKary: f.czas, powod: f.powod, czas: Date.now() }, ...d.wyroki] }));
            done();
          }}><FileText size={17} /> Zapisz wyrok</button>
        </div>
      </Panel>
    </div>
  );
}

function Baza({ title, rows, onDel }: { title: string; rows: { id: string; t: string; d: string; c: number }[]; onDel: (id: string) => void }) {
  const [q, setQ] = useState("");
  const f = rows.filter((r) => (r.t + r.d).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <SectionHeading icon={ClipboardList} title={title} subtitle={`Liczba zapisanych dokumentów: ${rows.length}`} />
      <Panel><label className="block"><span className="form-label">Wyszukaj dokument</span><div className="relative"><Search size={17} className="absolute left-3 top-3 text-muted-foreground" /><input className="field pl-10" placeholder="PESEL, nick lub treść" value={q} onChange={(e) => setQ(e.target.value)} /></div></label></Panel>
      {f.length === 0 ? <EmptyState icon={FileText} title="Brak wpisów" text={q ? "Żaden dokument nie odpowiada podanym kryteriom." : "Wystawione dokumenty pojawią się w tej bazie."} /> : f.map((r) => (
        <article key={r.id} className="rounded-md border border-border bg-card p-3 shadow-sm">
          <div className="flex items-start justify-between gap-2"><div><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Osoba / identyfikator</p><p className="mt-1 text-sm font-bold">{r.t}</p></div><button className="flex h-8 w-8 items-center justify-center rounded-sm text-destructive active:bg-destructive/10" aria-label="Usuń dokument" onClick={() => confirm("Usunąć dokument?") && onDel(r.id)}><Trash2 size={16} /></button></div>
          <p className="mt-3 border-t border-border pt-2 text-xs leading-relaxed">{r.d}</p><p className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Clock3 size={12} />{fmt(r.c)}</p>
        </article>
      ))}
    </div>
  );
}

function Meldunki({ db, up }: { db: Db; up: Up }) {
  const [t, setT] = useState("");
  return (
    <div className="space-y-3">
      <SectionHeading icon={NotebookPen} title="Meldunki" subtitle="Raportowanie przebiegu aktywnej interwencji" />
      <Panel title="Nowy meldunek" icon={Send}>
        <label className="block"><span className="form-label">Treść meldunku służbowego</span><textarea className="field h-28 resize-none" placeholder="Opisz aktualną sytuację i podjęte czynności" value={t} onChange={(e) => setT(e.target.value)} /></label>
        <button className="go mt-3 flex items-center justify-center gap-2" disabled={!t} onClick={() => { up((d) => ({ meldunki: [{ id: uid(), tresc: t, czas: Date.now() }, ...d.meldunki] })); setT(""); }}><Send size={16} /> Wyślij meldunek</button>
      </Panel>
      {db.meldunki.length > 0 && <p className="form-label">Historia meldunków</p>}
      {db.meldunki.map((m) => <article key={m.id} className="rounded-md border border-border bg-card p-3 text-sm shadow-sm"><p className="leading-relaxed">{m.tresc}</p><p className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-[10px] text-muted-foreground"><Clock3 size={12} />{fmt(m.czas)}</p></article>)}
    </div>
  );
}

function Dyspozycje({ db, up }: { db: Db; up: Up }) {
  const [t, setT] = useState("");
  return (
    <div className="space-y-3">
      <SectionHeading icon={ListChecks} title="Dyspozycje" subtitle="Polecenia dyspozytora dla aktywnej interwencji" />
      <Panel title="Nowa dyspozycja" icon={Plus}>
        <label className="block"><span className="form-label">Treść polecenia</span><input className="field" placeholder="Wpisz dyspozycję" value={t} onChange={(e) => setT(e.target.value)} /></label>
        <button className="go mt-3 flex items-center justify-center gap-2" disabled={!t} onClick={() => { up((d) => ({ dyspozycje: [{ id: uid(), tresc: t, czas: Date.now(), wykonana: false }, ...d.dyspozycje] })); setT(""); }}><Plus size={16} /> Dodaj dyspozycję</button>
      </Panel>
      {db.dyspozycje.length === 0 ? <EmptyState icon={ListChecks} title="Brak dyspozycji" text="Dodane polecenia będzie można oznaczać jako wykonane." /> : db.dyspozycje.map((m) => (
        <button key={m.id} className={`flex w-full items-start gap-3 rounded-md border border-border bg-card p-3 text-left shadow-sm ${m.wykonana ? "opacity-60" : ""}`} onClick={() => up((d) => ({ dyspozycje: d.dyspozycje.map((x) => x.id === m.id ? { ...x, wykonana: !x.wykonana } : x) }))}>
          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${m.wykonana ? "border-ok bg-ok text-primary-foreground" : "border-border"}`}>{m.wykonana && <Check size={14} />}</div>
          <div className="min-w-0 flex-1"><p className={`text-sm font-medium leading-relaxed ${m.wykonana ? "line-through" : ""}`}>{m.tresc}</p><p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Clock3 size={12} />{fmt(m.czas)}</p></div>
          <Badge tone={m.wykonana ? "ok" : "primary"}>{m.wykonana ? "Wykonana" : "Do realizacji"}</Badge>
        </button>
      ))}
    </div>
  );
}

function Pojazdy({ db, up, add }: { db: Db; up: Up; add: () => void }) {
  const [q, setQ] = useState(""); const [p, setP] = useState<Pojazd | null>(null); const [err, setErr] = useState("");
  return (
    <div className="space-y-3">
      <SectionHeading icon={CarFront} title="Baza pojazdów" subtitle="Weryfikacja danych rejestracyjnych pojazdu" />
      <Panel title="Numer rejestracyjny" icon={Search}>
        <label className="block"><span className="form-label">Wpisz numer rejestracyjny</span><input className="field text-center text-lg font-bold uppercase tracking-[0.16em]" placeholder="WA 00000" value={q} onChange={(e) => setQ(e.target.value.toUpperCase().replace(/\s/g, ""))} /></label>
        <button className="go mt-3 flex items-center justify-center gap-2" disabled={!q} onClick={() => { const f = db.pojazdy.find((x) => x.rej === q) ?? null; setP(f); setErr(f ? "" : "Brak pojazdu w bazie"); }}><Search size={17} /> Sprawdź pojazd</button>
        {err && <p className="mt-2 flex items-center gap-2 text-xs font-medium text-destructive"><AlertTriangle size={14} />{err}</p>}
      </Panel>
      {!p ? <EmptyState icon={CarFront} title="Brak wybranego pojazdu" text="Wpisz numer rejestracyjny, aby wyświetlić dane pojazdu i jego właściciela." /> : (
        <Panel title="Kartoteka pojazdu" icon={CarFront} action={<Badge tone={p.poszukiwany ? "danger" : "ok"}>{p.poszukiwany ? "Poszukiwany" : "Bez uwag"}</Badge>}>
          <div className="mb-3 flex items-center gap-3 border-b border-border pb-3">
            <div className="flex h-24 w-28 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-secondary">{p.foto ? <img src={p.foto} alt={p.rej} className="h-full w-full object-cover" /> : <CarFront size={38} className="text-muted-foreground" />}</div>
            <div><p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Numer rejestracyjny</p><p className="mt-1 rounded-sm border border-border bg-background px-2 py-1 text-lg font-bold tracking-wider">{p.rej}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{p.marka}</p></div>
          </div>
          <DataRow label="Marka i model" value={p.marka} />
          <DataRow label="Kolor nadwozia" value={p.kolor || "Nie podano"} />
          <DataRow label="Właściciel" value={p.wlasciciel || p.wlascicielPesel || "Nie podano"} />
          <DataRow label="ID właściciela" value={p.wlascicielPesel || "—"} />
          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-sm border border-border bg-background p-2 text-center"><p className="text-[9px] uppercase tracking-wide text-muted-foreground">Ubezpieczenie OC</p><p className={`mt-1 text-xs font-bold ${p.oc ? "text-ok" : "text-destructive"}`}>{p.oc ? "WAŻNE" : "BRAK"}</p></div><div className="rounded-sm border border-border bg-background p-2 text-center"><p className="text-[9px] uppercase tracking-wide text-muted-foreground">Badanie techniczne</p><p className={`mt-1 text-xs font-bold ${p.przeglad ? "text-ok" : "text-destructive"}`}>{p.przeglad ? "WAŻNE" : "BRAK"}</p></div></div>
          {p.poszukiwany && <p className="mt-3 flex items-center justify-center gap-2 rounded-sm bg-destructive p-2 text-center text-xs font-bold uppercase tracking-wider text-destructive-foreground"><AlertTriangle size={16} /> Pojazd poszukiwany</p>}
          <button className="mt-3 flex w-full items-center justify-center gap-1.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-destructive" onClick={() => { if (confirm("Usunąć pojazd?")) { up((d) => ({ pojazdy: d.pojazdy.filter((x) => x.rej !== p.rej) })); setP(null); } }}><Trash2 size={13} /> Usuń pojazd z bazy</button>
        </Panel>
      )}
      <button className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 py-3 text-xs font-bold text-primary active:bg-primary/15" onClick={add}><Plus size={17} /> Dodaj pojazd ręcznie</button>
      <p className="text-center text-[10px] text-muted-foreground">Liczba pojazdów w lokalnej bazie: <span className="font-bold text-foreground">{db.pojazdy.length}</span></p>
    </div>
  );
}

function DodajPojazd({ up, done }: { up: Up; done: () => void }) {
  const nick = useNick();
  const [f, setF] = useState<Pojazd>({ rej: "", marka: "", kolor: "", wlascicielPesel: "", wlasciciel: "", oc: true, przeglad: true, poszukiwany: false, foto: "" });
  const [busy, setBusy] = useState(false);
  const inp = (k: keyof Pojazd, label: string, ph: string) => <label className="block"><span className="form-label">{label}</span><input className="field" placeholder={ph} value={f[k] as string} onChange={(e) => setF({ ...f, [k]: k === "rej" ? e.target.value.toUpperCase().replace(/\s/g, "") : e.target.value })} /></label>;
  const chk = (k: "oc" | "przeglad" | "poszukiwany", l: string) => <label className="flex items-center gap-3 rounded-sm border border-border bg-background px-3 py-2.5 text-xs font-medium"><input type="checkbox" className="h-4 w-4 accent-primary" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} />{l}</label>;
  return (
    <div className="space-y-3">
      <SectionHeading icon={CarFront} title="Rejestracja pojazdu" subtitle="Ręczne dodanie pojazdu do lokalnej bazy" />
      <Panel title="Dane rejestracyjne" icon={ClipboardList}>
        <div className="space-y-3">{inp("rej", "Numer rejestracyjny", "Np. WA12345")}{inp("marka", "Marka i model", "Np. Kia Ceed")}{inp("kolor", "Kolor nadwozia", "Np. Srebrny")}{inp("wlascicielPesel", "ID właściciela Roblox", "PESEL / ID gracza")}{inp("foto", "Zdjęcie pojazdu", "Link do zdjęcia (opcjonalnie)")}</div>
      </Panel>
      <Panel title="Stan pojazdu" icon={BadgeCheck}><div className="space-y-2">{chk("oc", "Ważne ubezpieczenie OC")}{chk("przeglad", "Ważne badanie techniczne")}{chk("poszukiwany", "Pojazd poszukiwany")}</div></Panel>
      <button className="go flex items-center justify-center gap-2 py-3" disabled={busy} onClick={async () => {
        if (!f.rej || !f.marka) return alert("Podaj rejestrację i markę");
        setBusy(true);
        const w = f.wlascicielPesel ? (await nick(f.wlascicielPesel)) ?? "" : "";
        up((d) => ({ pojazdy: [{ ...f, wlasciciel: w }, ...d.pojazdy.filter((x) => x.rej !== f.rej)] }));
        setBusy(false); done();
      }}><Check size={17} />{busy ? "Zapisywanie..." : "Zapisz pojazd w bazie"}</button>
    </div>
  );
}

function StatusScreen({ db, up, go }: { db: Db; up: Up; go: (s: Screen) => void }) {
  const opts: Status[] = ["W trakcie interwencji", "W drodze na interwencję", "Wolny", "Przerwa", "Zajęty"];
  return (
    <div className="space-y-3">
      <SectionHeading icon={Navigation} title="Status patrolu" subtitle="Aktualizacja dyspozycyjności jednostki KSP-217" />
      <div className="rounded-md bg-police p-4 text-police-foreground"><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-police-foreground/60">Aktualny status</p><p className="mt-1 text-lg font-bold">{db.status}</p></div>
      <Panel title="Wybierz nowy status" icon={Radio}>
        <div className="space-y-2">{opts.map((o) => <button key={o} className={`flex w-full items-center gap-3 rounded-sm border px-3 py-3 text-left text-sm font-semibold ${db.status === o ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"}`} onClick={() => { up(() => ({ status: o })); go("home"); }}><span className={`h-2.5 w-2.5 rounded-full ${db.status === o ? "bg-primary" : "bg-muted-foreground/40"}`} /><span className="flex-1">{o}</span>{db.status === o && <Check size={17} />}</button>)}</div>
      </Panel>
      <button className="flex w-full items-center gap-3 rounded-md border border-border bg-card p-3 text-left shadow-sm active:bg-secondary" onClick={() => go("dyspozytor")}><div className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary/10 text-primary"><RadioTower size={21} /></div><div className="flex-1"><p className="text-sm font-bold">Dyspozytor</p><p className="text-[10px] text-muted-foreground">Dane patrolu i łączność służbowa</p></div><ChevronRight size={17} className="text-muted-foreground" /></button>
    </div>
  );
}

function Dyspozytor({ db, up }: { db: Db; up: Up }) {
  return (
    <div className="space-y-3">
      <SectionHeading icon={RadioTower} title="Dyspozytor" subtitle="Identyfikacja jednostki i stan łączności" />
      <div className="rounded-md bg-police p-4 text-police-foreground">
        <div className="flex items-center justify-between"><div><p className="text-[9px] uppercase tracking-[0.15em] text-police-foreground/60">Jednostka</p><p className="mt-1 text-2xl font-bold tracking-wider">KSP-217</p></div><RadioTower size={34} strokeWidth={1.5} /></div>
        <div className="mt-4 border-t border-police-foreground/15 pt-3"><p className="text-[9px] uppercase tracking-wider text-police-foreground/60">Status patrolu</p><p className="mt-1 text-lg font-bold">{db.status}</p></div>
      </div>
      <Panel title="Funkcjonariusz" icon={UserRound}>
        <label className="block"><span className="form-label">Nick służbowy</span><input className="field" value={db.nick} onChange={(e) => up(() => ({ nick: e.target.value }))} /></label>
        <p className="mt-2 text-[10px] text-muted-foreground">Zmiana nicku jest zapisywana automatycznie na terminalu.</p>
      </Panel>
      <Panel title="Łączność" icon={Radio}><DataRow label="Kanał służbowy" value="KSP-1" /><DataRow label="Połączenie" value={<span className="text-ok">Aktywne</span>} /><DataRow label="Tryb pracy" value="Terminal mobilny" /></Panel>
    </div>
  );
}
