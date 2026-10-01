import { F, L, R, rep, until, iff, countBlocks } from "./engine.js";

/**
 * Each level: name, concept (what it teaches), map rows (# rock, c coin, S start, G star), face (0 up 1 right 2 down 3 left),
 * allowed blocks, a hint, and a solution (which also sets the par block count).
 */
const SEQ = ["fwd", "left", "right"];
const LOOP = [...SEQ, "repeat"];
const ALL = [...LOOP, "if", "until"];
const mirror = (rows) => rows.map((r) => [...r].reverse().join(""));

export const WORLDS = [
  { id: "seq", name: "Sequences", emoji: "🧩", blurb: "A program is a list of instructions. The robot follows them in order." },
  { id: "loop", name: "Loops", emoji: "🔁", blurb: "Don't repeat yourself! A loop does the same thing again and again." },
  { id: "if", name: "Decisions", emoji: "🔀", blurb: "Programs can choose: if something is true, do this, otherwise do that." },
];

const SPIRAL5 = ["S....", "####.", "..G#.", ".###.", "....."];

const RAW = [
  { world: "seq", name: "First steps", concept: "Zippy the robot wants the star. Drag blocks into the program (or tap a block to add it), then press Run. Zippy does each block in order, from the top.", rows: [".......", "S....G.", "......."], face: 1, allow: ["fwd"], hint: "The star is 5 squares ahead. Use 5 “Move forward” blocks.", solution: [F(), F(), F(), F(), F()] },
  { world: "seq", name: "Turning", concept: "Zippy can turn left or right on the spot. “Move forward” always goes the way Zippy is facing.", rows: ["...G", "....", "....", "S..."], face: 0, allow: SEQ, hint: "Go up three squares, turn right, then go forward three more.", solution: [F(), F(), F(), R(), F(), F(), F()] },
  { world: "seq", name: "Around the rock", concept: "Rocks block the way. If Zippy walks into one, the program stops. Plan a route around it.", rows: [".....", ".....", "S.#.G", ".....", "....."], face: 1, allow: SEQ, hint: "Step forward, turn left, go up one, turn right, go past the rock, then come back down.", solution: [F(), L(), F(), R(), F(), F(), R(), F(), L(), F()] },
  { world: "seq", name: "Coin trail", concept: "Zippy picks up coins by walking over them. Collect every coin and reach the star to earn more stars.", rows: [".......", "S.c.c.G", ".......", "......."], face: 1, allow: ["fwd"], hint: "Everything is in a straight line. Keep moving forward.", solution: [F(), F(), F(), F(), F(), F()] },
  { world: "seq", name: "U-turn", concept: "Long programs need careful planning. Trace the path with your finger first, then build it. (Notice how many blocks this takes. There is a smarter way coming up!)", rows: ["S###G", ".###.", ".###.", ".###.", "....."], face: 2, allow: SEQ, hint: "Down four, turn left, along four, turn left, up four.", solution: [F(), F(), F(), F(), L(), F(), F(), F(), F(), L(), F(), F(), F(), F()] },

  { world: "loop", name: "A long corridor", concept: "This corridor is long! Instead of 10 “Move forward” blocks, use a Repeat block. It does the blocks inside it again and again. Tap the number to change how many times.", rows: ["...........", "S.........G", "..........."], face: 1, allow: LOOP, hint: "Put one “Move forward” inside “Repeat 10 times”.", solution: [rep(10, F())] },
  { world: "loop", name: "Staircase", concept: "A loop can repeat a whole pattern. Look for the steps: forward, turn right, forward, turn left. That pattern repeats.", rows: ["###.G", "##..#", "#..##", "..###", "S####"], face: 0, allow: LOOP, hint: "Inside the loop put: forward, turn right, forward, turn left. Repeat it 4 times.", solution: [rep(4, F(), R(), F(), L())] },
  { world: "loop", name: "Round the block", concept: "Walk round the edge of a square: forward four, turn, forward four, turn… A loop makes it short. Grab the coins on the way!", rows: ["S...c", "####.", "####.", "####.", "G...c"], face: 1, allow: LOOP, hint: "Each side is: forward 4, then turn right. You need three sides.", solution: [rep(3, F(), F(), F(), F(), R())] },
  { world: "loop", name: "Bigger steps", concept: "The pattern can be longer: two forward, turn right, two forward, turn left. Find it and repeat it.", rows: ["####..G", "####.##", "##...##", "##.####", "...####", ".######", "S######"], face: 0, allow: LOOP, hint: "Loop pattern: forward 2, turn right, forward 2, turn left. Three times round.", solution: [rep(3, F(), F(), R(), F(), F(), L())] },
  { world: "loop", name: "Loops inside loops", concept: "You can put a Repeat inside another Repeat. The inner loop runs completely every time the outer loop goes round.", rows: ["###...G", "###.###", "###.###", "....###", ".######", ".######", "S######"], face: 0, allow: LOOP, hint: "Outer loop twice: [forward 3, turn right, forward 3, turn left]. Use an inner loop for each “forward 3”.", solution: [rep(2, rep(3, F()), R(), rep(3, F()), L())] },

  { world: "if", name: "Look before you step", concept: "An If block checks something. “If the way ahead is clear, move forward, otherwise turn right.” Zippy checks every time round the loop.", rows: ["S....", "####.", "....G"], face: 1, allow: ALL, hint: "Repeat 8 times: if the path ahead is clear then move forward, otherwise turn right.", solution: [rep(8, iff("clear", [F()], [R()]))] },
  { world: "if", name: "Until the star", concept: "“Repeat until star” keeps going until Zippy reaches the star, so you don't need to count the steps.", rows: ["S......", "######.", "G......"], face: 1, allow: ALL, hint: "Inside “Repeat until star”: if the way ahead is clear, move forward, otherwise turn right.", solution: [until(iff("clear", [F()], [R()]))] },
  { world: "if", name: "Spiral", concept: "A spiral winds inward. If you keep walking and turn right whenever you are blocked, you will end up at the middle.", rows: SPIRAL5, face: 1, allow: ALL, hint: "Same rule: until the star, if clear then forward, otherwise turn right.", solution: [until(iff("clear", [F()], [R()]))] },
  { world: "if", name: "Left turns", concept: "Now the corners turn the other way. Change your program: when blocked, turn left instead.", rows: mirror(SPIRAL5), face: 3, allow: ALL, hint: "Until the star: if clear then forward, otherwise turn LEFT.", solution: [until(iff("clear", [F()], [L()]))] },
  { world: "if", name: "Choose a side", concept: "Some corners go left and some go right. Zippy can check again after turning: “if the way is now blocked, turn around the other way.”", rows: ["S....", "####.", ".....", ".####", "....G"], face: 1, allow: ALL, hint: "Until the star: if clear then forward, otherwise turn right, and then if blocked, turn left twice.", solution: [until(iff("clear", [F()], [R(), iff("blocked", [L(), L()])]))] },
  { world: "if", name: "Treasure run", concept: "Put it all together: one short program that follows the whole spiral, picking up every coin on the way.", rows: ["S..c...", "######.", ".....#.", "c###.#c", ".#G..#.", ".#####.", "...c..."], face: 1, allow: ALL, hint: "The same until-the-star rule from the spiral works here too.", solution: [until(iff("clear", [F()], [R()]))] },
];

let id = 0;
const tag = (list) => list.forEach((b) => { b.id = id += 1; if (b.body) tag(b.body); if (b.then) tag(b.then); if (b.else) tag(b.else); });
export const LEVELS = RAW.map((l) => ({ ...l, par: countBlocks(l.solution) }));
export function cloneProgram(list) { return list.map((b) => ({ ...b, body: b.body && cloneProgram(b.body), then: b.then && cloneProgram(b.then), else: b.else && cloneProgram(b.else) })); }
void tag;
