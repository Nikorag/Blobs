const ADJECTIVES = [
  "Sneaky", "Jolly", "Lucky", "Cheeky", "Sleepy", "Brave", "Clever", "Wobbly", "Dapper", "Grumpy",
  "Zesty", "Mighty", "Fuzzy", "Plucky", "Speedy", "Breezy", "Rowdy", "Witty", "Mellow", "Peppy",
];
const ANIMALS = [
  "Otter", "Badger", "Walrus", "Falcon", "Panda", "Gecko", "Moose", "Lemur", "Koala", "Marmot",
  "Heron", "Ferret", "Newt", "Yak", "Lynx", "Puffin", "Wombat", "Stoat", "Toad", "Bison",
];

export function randomName(rng: () => number = Math.random): string {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rng() * xs.length)];
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
}
