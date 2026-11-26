import { createServerFn } from "@tanstack/react-start";

export type RobloxUser = { id: number; name: string; displayName: string; created: string; avatar: string | null };

export const lookupRoblox = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => {
    if (!/^\d{1,15}$/.test(d.id)) throw new Error("Nieprawidłowy PESEL");
    return d;
  })
  .handler(async ({ data }): Promise<{ ok: true; user: RobloxUser } | { ok: false; error: string }> => {
    try {
      const r = await fetch(`https://users.roblox.com/v1/users/${data.id}`);
      if (!r.ok) return { ok: false, error: "Brak osoby w bazie" };
      const u = (await r.json()) as { id: number; name: string; displayName: string; created: string };
      let avatar: string | null = null;
      try {
        const t = await fetch(
          `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${data.id}&size=150x150&format=Png&isCircular=false`,
        );
        const tj = (await t.json()) as { data?: { imageUrl?: string }[] };
        avatar = tj.data?.[0]?.imageUrl ?? null;
      } catch {}
      return { ok: true, user: { id: u.id, name: u.name, displayName: u.displayName, created: u.created, avatar } };
    } catch {
      return { ok: false, error: "Brak połączenia z bazą" };
    }
  });
