/// <reference lib="webworker" />
import { chooseMove } from "./index";
import type { BotInput, BotMove } from "./types";

self.onmessage = (event: MessageEvent<{ id: number; input: BotInput }>) => {
  const { id, input } = event.data;
  const move: BotMove = chooseMove(input);
  self.postMessage({ id, move });
};
