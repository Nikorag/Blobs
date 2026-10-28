"use client";

import type { ZontoClient, ZontoPlayer } from "@zonto/sdk";
import { ZontoToasts } from "@zonto/sdk/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { saveIdentity, useIdentity } from "@/lib/client/identity";
import { getZonto, storedToken } from "@/lib/zonto/client";

type Status = "loading" | "signedOut" | "signedIn";

interface ZontoState {
  client: ZontoClient;
  status: Status;
  player: ZontoPlayer | null;
  /** Lobby code from an accepted Zonto invite (`?zonto_lobby=…`), until consumed. */
  pendingLobby: string | null;
  clearPendingLobby: () => void;
  signIn: () => void;
  signOut: () => void;
}

const ZontoContext = createContext<ZontoState | null>(null);

export function useZonto(): ZontoState {
  const ctx = useContext(ZontoContext);
  if (!ctx) throw new Error("useZonto must be used inside <ZontoProvider>");
  return ctx;
}

interface Boot {
  player: ZontoPlayer | null;
  lobby: string | null;
}

// The launch ticket and OAuth code are single-use, so boot must run once even
// when React strict mode double-invokes the effect.
let boot: Promise<Boot> | null = null;

function runBoot(client: ZontoClient): Promise<Boot> {
  boot ??= (async () => {
    const session = await client
      .loginFromLaunch()
      .then((s) => s ?? client.completeOAuthLogin())
      .catch(() => null);
    let player: ZontoPlayer | null = session?.player ?? null;
    if (!player) {
      const token = storedToken();
      if (token) {
        client.setToken(token);
        player = await client.me().catch(() => {
          client.setToken(null);
          return null;
        });
      }
    }
    return { player, lobby: client.getLobbyCodeFromLaunch() };
  })();
  return boot;
}

export function ZontoProvider({ children }: { children: React.ReactNode }) {
  const client = getZonto();
  const identity = useIdentity();
  const [status, setStatus] = useState<Status>("loading");
  const [player, setPlayer] = useState<ZontoPlayer | null>(null);
  const [pendingLobby, setPendingLobby] = useState<string | null>(null);
  const syncedName = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    runBoot(client).then((res) => {
      if (cancelled) return;
      setPlayer(res.player);
      setStatus(res.player ? "signedIn" : "signedOut");
      setPendingLobby(res.lobby);
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  // Signing in makes the gamertag the table name (once per sign-in, so renaming still works).
  useEffect(() => {
    if (!player || !identity || syncedName.current === player.id) return;
    syncedName.current = player.id;
    const name = player.gamertag.slice(0, 16);
    if (identity.name !== name) saveIdentity({ ...identity, name });
  }, [player, identity]);

  const signIn = useCallback(() => {
    client.startOAuthLogin().catch(() => {});
  }, [client]);

  const signOut = useCallback(() => {
    client.setToken(null);
    setPlayer(null);
    setStatus("signedOut");
  }, [client]);

  const clearPendingLobby = useCallback(() => setPendingLobby(null), []);

  const value = useMemo(
    () => ({ client, status, player, pendingLobby, clearPendingLobby, signIn, signOut }),
    [client, status, player, pendingLobby, clearPendingLobby, signIn, signOut],
  );

  return (
    <ZontoContext.Provider value={value}>
      {children}
      <ZontoToasts client={client} />
    </ZontoContext.Provider>
  );
}
