/** All the Once Upon a Time stories, in shelf order, with the shelf each one sits on. */
import { STORIES_A } from "./stories-a.js";
import { STORIES_B } from "./stories-b.js";
import { STORIES_C } from "./stories-c.js";

const SHELF = {
  cinderella: "Fairy tales", redhood: "Fairy tales", hansel: "Fairy tales", snowwhite: "Fairy tales", rapunzel: "Fairy tales", elves: "Fairy tales",
  pigs: "Folk tales", goldilocks: "Folk tales", jack: "Folk tales",
  duckling: "Hans Christian Andersen", emperor: "Hans Christian Andersen",
  tortoise: "Aesop's fables", lionmouse: "Aesop's fables", wolfboy: "Aesop's fables",
  momotaro: "Around the world", brush: "Around the world", monkeycroc: "Around the world", alibaba: "Around the world",
};
export const SHELVES = ["Fairy tales", "Folk tales", "Hans Christian Andersen", "Aesop's fables", "Around the world"];
export const STORIES = [...STORIES_A, ...STORIES_B, ...STORIES_C].map((s) => ({ ...s, shelf: SHELF[s.id] }));
