import type { Action, RoomView } from "@/lib/game/types";
import type { RoomStatus } from "./useRoom";

/** What the game screens need from a room, whether it lives on the server or in the browser. */
export interface RoomHandle {
  view: RoomView | null;
  status: RoomStatus;
  error: string | null;
  clearError: () => void;
  busy: boolean;
  act: (action: Action) => Promise<boolean>;
  refresh: () => void;
  serverNow: () => number;
  /** Present for a game against the computer. */
  solo?: { quit: () => void };
}
