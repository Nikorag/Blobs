/** Quick reactions players can send during a game. */
export const EMOTES = {
  thumbs: "👍",
  laugh: "😂",
  wow: "😮",
  angry: "😡",
  party: "🎉",
  cry: "😭",
  think: "🤔",
  eyes: "👀",
} as const;

export type EmoteId = keyof typeof EMOTES;
export const EMOTE_IDS = Object.keys(EMOTES) as EmoteId[];

/** Minimum gap between one player's emotes. */
export const EMOTE_COOLDOWN_MS = 1500;
/** How long an emote bubble stays up. */
export const EMOTE_SHOW_MS = 3500;
