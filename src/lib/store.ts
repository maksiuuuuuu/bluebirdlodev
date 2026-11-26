import { useEffect, useState } from "react";

export type Status = "Wolny" | "Zajęty" | "W trakcie interwencji" | "W drodze na interwencję" | "Przerwa";
export type Komunikat = { id: string; powod: string; wzywajacy: string; czas: number; stan: "nowy" | "przyjety" | "odrzucony" };
export type Mandat = { id: string; pesel: string; nick: string; kwota: number; pkt: number; powod: string; czas: number };
export type Wyrok = { id: string; pesel: string; nick: string; czasKary: string; powod: string; czas: number };
export type Pojazd = { rej: string; marka: string; kolor: string; wlascicielPesel: string; wlasciciel: string; oc: boolean; przeglad: boolean; poszukiwany: boolean; foto: string };
export type Meldunek = { id: string; tresc: string; czas: number };
export type Dyspozycja = { id: string; tresc: string; czas: number; wykonana: boolean };
export type Uprawnienia = Record<string, { bron: boolean; prawko: boolean }>;

export type Db = {
  zalogowany: boolean;
  nick: string;
  status: Status;
  interwencja: number | null;
  komunikaty: Komunikat[];
  mandaty: Mandat[];
  wyroki: Wyrok[];
  pojazdy: Pojazd[];
  meldunki: Meldunek[];
  dyspozycje: Dyspozycja[];
  uprawnienia: Uprawnienia;
};

const KEY = "ksp-terminal-v1";
export const empty: Db = {
  zalogowany: false, nick: "lodev_irl", status: "Wolny", interwencja: null,
  komunikaty: [], mandaty: [], wyroki: [], pojazdy: [], meldunki: [], dyspozycje: [], uprawnienia: {},
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const fmt = (t: number) => new Date(t).toLocaleString("pl-PL");

export function useDb() {
  const [db, setDb] = useState<Db>(empty);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDb({ ...empty, ...JSON.parse(raw) });
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(db));
  }, [db, ready]);
  const up = (f: (d: Db) => Partial<Db>) => setDb((d) => ({ ...d, ...f(d) }));
  return { db, up, ready };
}
