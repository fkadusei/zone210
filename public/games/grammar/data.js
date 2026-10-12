// Grammar & Words: the word banks, sentences and reading passages (all written for Zone 210). topics.js turns these
// into questions. Spellings that differ between countries (colour/color, travelling/traveling…) are avoided on purpose.

// Sentences with the parts of speech marked: word/N noun, /V verb, /A adjective.
export const TAGGED_1 = [
  "The small/A dog/N chased/V a red/A ball/N.", "A tall/A giraffe/N ate/V the green/A leaves/N.", "The happy/A children/N sang/V a loud/A song/N.",
  "Maya/N painted/V a bright/A picture/N.", "The old/A bridge/N crossed/V a wide/A river/N.", "A tiny/A bird/N built/V a soft/A nest/N.",
  "The baker/N baked/V fresh/A bread/N.", "A cold/A wind/N shook/V the thin/A branches/N.", "The clever/A fox/N found/V a secret/A path/N.",
  "Omar/N kicked/V the muddy/A football/N.", "The sleepy/A cat/N watched/V a brown/A mouse/N.", "A kind/A nurse/N helped/V the sick/A man/N.",
  "The farmer/N planted/V yellow/A corn/N.", "A huge/A wave/N hit/V the sandy/A beach/N.", "The young/A artist/N drew/V a strange/A animal/N.",
  "Lena/N carried/V a heavy/A basket/N.", "The noisy/A parrot/N copied/V the funny/A sounds/N.", "A brave/A sailor/N steered/V the wooden/A boat/N.",
  "The hungry/A lion/N chased/V a striped/A zebra/N.", "The teacher/N read/V a short/A story/N.", "A shiny/A coin/N rolled/V across the dusty/A floor/N.",
  "The tired/A runners/N drank/V cool/A water/N.", "Ravi/N opened/V the blue/A door/N.", "A gentle/A rain/N watered/V the dry/A garden/N.",
  "The curious/A puppy/N sniffed/V a purple/A flower/N.", "The chef/N chopped/V the crunchy/A carrots/N.", "A bright/A star/N lit/V the dark/A sky/N.",
  "The girl/N wore/V a warm/A scarf/N.", "The quiet/A boy/N wrote/V a long/A letter/N.", "A playful/A dolphin/N splashed/V the surprised/A swimmers/N.",
];
// …and: /ADV adverb, /PRO pronoun, /PREP preposition, /CONJ conjunction.
export const TAGGED_2 = [
  "She/PRO walked slowly/ADV to/PREP the park.", "We/PRO waited quietly/ADV under/PREP the tree.", "He/PRO ran quickly/ADV, but/CONJ the bus left.",
  "The cat hid behind/PREP the sofa because/CONJ it/PRO was scared.", "They/PRO played happily/ADV in/PREP the garden.", "I/PRO looked everywhere/ADV for/PREP the keys.",
  "The bird sang sweetly/ADV and/CONJ the baby smiled.", "You/PRO can sit beside/PREP me/PRO.", "The ball rolled gently/ADV down/PREP the hill.",
  "We/PRO left early/ADV because/CONJ the road was busy.", "He/PRO carefully/ADV placed the cup on/PREP the shelf.", "The dog barked loudly/ADV at/PREP the gate.",
  "She/PRO wanted juice, but/CONJ the shop was closed.", "The children ran outside/ADV and/CONJ jumped in/PREP puddles.", "It/PRO rained heavily/ADV during/PREP the night.",
  "They/PRO whispered softly/ADV so/CONJ the baby stayed asleep.", "The plane flew smoothly/ADV above/PREP the clouds.", "I/PRO will come with/PREP you/PRO tomorrow/ADV.",
  "The frog jumped suddenly/ADV into/PREP the pond.", "We/PRO can walk or/CONJ we/PRO can cycle.", "He/PRO always/ADV sits near/PREP the window.",
  "The letter arrived yesterday/ADV from/PREP Canada.", "She/PRO spoke politely/ADV to/PREP the visitors.", "The boat drifted slowly/ADV between/PREP the rocks.",
  "They/PRO stayed inside/ADV because/CONJ the storm was strong.", "He/PRO laughed loudly/ADV and/CONJ clapped.", "The mouse crept silently/ADV past/PREP the cat.",
  "We/PRO often/ADV swim after/PREP school.", "The train stopped suddenly/ADV, so/CONJ everyone/PRO waited.", "You/PRO must listen carefully/ADV or/CONJ you/PRO will miss it/PRO.",
];
export const TAG_INFO = {
  N: ["noun", "A noun names a person, an animal, a place or a thing."],
  V: ["verb", "A verb is a doing or being word: it tells you what happens."],
  A: ["adjective", "An adjective describes a noun: it tells you what something is like."],
  ADV: ["adverb", "An adverb tells you how, when or where something happens. Many end in -ly."],
  PRO: ["pronoun", "A pronoun stands in for a noun: I, you, he, she, it, we, they, me, everyone…"],
  PREP: ["preposition", "A preposition shows where or when something is compared with something else: in, on, under, to, after…"],
  CONJ: ["conjunction", "A conjunction joins words or parts of a sentence: and, but, or, so, because."],
};

// Choose the form that fits: [sentence with ___, right, [wrong…], why]
export const FORMS = [
  ["The dogs ___ in the garden every morning.", "play", ["plays", "playing", "is play"], "‘Dogs’ is more than one, so the verb has no -s: the dogs play."],
  ["My brother ___ football on Saturdays.", "plays", ["play", "playing", "are playing"], "One person (he) takes a verb ending in -s: he plays."],
  ["Yesterday we ___ to the museum.", "went", ["go", "goed", "gone"], "‘Yesterday’ tells you it is the past. The past of ‘go’ is ‘went’."],
  ["She has ___ three books this month.", "read", ["readed", "reads", "reading"], "After ‘has’ comes the past form. For ‘read’ it is spelled the same but said like ‘red’."],
  ["There ___ two apples on the table.", "are", ["is", "be", "am"], "Two apples is more than one, so use ‘are’."],
  ["He ___ his lunch an hour ago.", "ate", ["eat", "eated", "eaten"], "‘An hour ago’ is the past. The past of ‘eat’ is ‘ate’."],
  ["This puzzle is ___ than the last one.", "harder", ["more hard", "hardest", "more harder"], "To compare two things, short adjectives add -er: harder."],
  ["That was the ___ film I have ever seen.", "funniest", ["funnier", "most funny", "more funniest"], "To pick out one from many, short adjectives add -est: funniest."],
  ["I saw ___ elephant at the zoo.", "an", ["a", "and", "any"], "Use ‘an’ before a vowel sound: an elephant."],
  ["Tom and ___ went to the shop.", "I", ["me", "myself", "mine"], "Take away ‘Tom and’. ‘I went to the shop’ sounds right; ‘me went’ does not."],
  ["The teacher gave the books to Ana and ___.", "me", ["I", "myself", "mine"], "Take away ‘Ana and’. ‘Gave the books to me’ sounds right; ‘to I’ does not."],
  ["Each of the players ___ a medal.", "has", ["have", "are having", "having"], "‘Each’ means one at a time, so the verb is singular: each has."],
  ["We ___ dinner when the phone rang.", "were eating", ["was eating", "are eating", "eats"], "‘We’ goes with ‘were’, and the phone rang in the past."],
  ["She ___ swim when she was four.", "could", ["can", "cans", "coulds"], "‘When she was four’ is the past. The past of ‘can’ is ‘could’."],
  ["The children ___ very quiet today.", "are", ["is", "be", "am"], "‘Children’ is more than one, so use ‘are’."],
  ["I have ___ my homework already.", "done", ["did", "do", "doed"], "After ‘have’ use ‘done’: I have done. (On its own: I did.)"],
  ["He ___ like spicy food.", "doesn't", ["don't", "not", "aren't"], "With he, she or it, use ‘doesn't’."],
  ["They ___ to the beach tomorrow.", "will go", ["went", "goes", "gone"], "‘Tomorrow’ is the future: will go."],
  ["This is the ___ day of my life!", "best", ["goodest", "better", "most good"], "Good, better, best: ‘good’ does not add -er or -est."],
  ["My bag is heavy, but yours is ___.", "heavier", ["more heavy", "heaviest", "heavyer"], "Comparing two: change the y to i and add -er."],
  ["The cake was eaten by ___.", "them", ["they", "their", "theirs"], "After ‘by’ use the object form: them."],
  ["___ are my best shoes.", "These", ["This", "That", "Them"], "‘Shoes’ is more than one and they are near, so: these."],
  ["She sings ___ than her sister.", "better", ["gooder", "more good", "best"], "To compare two, use ‘better’."],
  ["How ___ apples are in the bowl?", "many", ["much", "lot", "more"], "Use ‘many’ for things you can count, like apples."],
  ["How ___ water is in the jug?", "much", ["many", "lots", "few"], "Use ‘much’ for things you can't count one by one, like water."],
  ["The bird ___ away when the cat came.", "flew", ["flied", "fly", "flown"], "The past of ‘fly’ is ‘flew’."],
  ["I ___ never been to the mountains.", "have", ["has", "am", "did"], "With ‘I’ use ‘have’: I have been."],
  ["She ___ her bike to school every day.", "rides", ["ride", "riding", "ridden"], "‘Every day’ is a habit, and ‘she’ takes -s: rides."],
  ["We ___ a great time at the party last night.", "had", ["have", "has", "haved"], "‘Last night’ is the past. The past of ‘have’ is ‘had’."],
  ["If it rains, we ___ stay inside.", "will", ["would have", "did", "was"], "A real possibility in the future: if it rains, we will…"],
  ["The books ___ on the top shelf.", "are", ["is", "was", "be"], "‘Books’ is more than one, so use ‘are’."],
  ["He ran ___ than anyone else in the race.", "faster", ["more fast", "fastest", "more faster"], "Comparing: fast, faster."],
  ["They ___ already left when we arrived.", "had", ["has", "have", "did"], "Something that happened before another past event uses ‘had’."],
  ["My sister and I ___ twins.", "are", ["is", "am", "be"], "Two people together (we) take ‘are’."],
  ["The mouse ___ the cheese last night.", "took", ["taked", "take", "taken"], "The past of ‘take’ is ‘took’."],
  ["Please give ___ the blue pen.", "me", ["I", "my", "mine"], "After ‘give’ use the object form: give me."],
  ["That bag is not mine; it is ___.", "hers", ["her", "she", "her's"], "‘Hers’ means ‘belonging to her’. It never has an apostrophe."],
  ["Look! The baby ___ walking.", "is", ["are", "be", "am"], "One baby: is walking."],
  ["I ___ my keys, so I could not get in.", "lost", ["losed", "lose", "losing"], "The past of ‘lose’ is ‘lost’."],
  ["She ___ a letter to her grandmother yesterday.", "wrote", ["writed", "written", "write"], "The past of ‘write’ is ‘wrote’."],
  ["He is ___ honest man.", "an", ["a", "and", "any"], "The h in ‘honest’ is silent, so it starts with a vowel sound: an honest man."],
  ["The ___ are playing in the park.", "children", ["childs", "childrens", "childes"], "The plural of ‘child’ is ‘children’."],
  ["I saw three ___ in the field.", "sheep", ["sheeps", "sheepes", "ships"], "‘Sheep’ stays the same for one or many."],
  ["She brushes her ___ twice a day.", "teeth", ["tooths", "teeths", "toothes"], "The plural of ‘tooth’ is ‘teeth’."],
];

// ---------- punctuation ----------
// [sentence without its end mark, the end mark, a word that must keep its capital (optional)]
export const ENDS = [
  ["The sun rises in the east", "."], ["My cousin lives in Brazil", ".", "Brazil"], ["We play football every Friday", ".", "Friday"], ["The library opens at nine o'clock", "."],
  ["Yuki and I baked a cake", ".", "I"], ["Penguins cannot fly", "."], ["Our school trip is in March", ".", "March"], ["The river flows into the sea", "."],
  ["Carlos teaches music on Mondays", ".", "Carlos"], ["Elephants have very good memories", "."], ["My friend Zuri speaks three languages", ".", "Zuri"], ["The moon looks bright tonight", "."],
  ["Where did you put the keys", "?"], ["What time does the bus leave", "?"], ["Can you help me carry this box", "?"], ["Why is the sky blue", "?"],
  ["Have you ever been to Kenya", "?", "Kenya"], ["Who left the door open", "?"], ["How many legs does a spider have", "?"], ["Is Tuesday your birthday", "?", "Tuesday"],
  ["Do you like mangoes", "?"], ["When does the film start", "?"], ["Did Noor find her book", "?", "Noor"], ["Are we nearly there", "?"],
  ["What a wonderful surprise", "!"], ["Watch out for that puddle", "!"], ["I can't believe we won", "!", "I"], ["How tall that tree is", "!"],
  ["Hurry up or we'll miss the train", "!"], ["That was amazing", "!"],
];
export const LISTS = [
  ["We bought", ["apples", "pears", "plums"]], ["The bag held", ["pencils", "paints", "paper"]], ["She packed", ["socks", "shoes", "a hat"]], ["The zoo has", ["lions", "zebras", "giraffes"]],
  ["He plays", ["football", "tennis", "chess"]], ["For lunch we had", ["rice", "beans", "salad"]], ["I can see", ["hills", "trees", "a river"]], ["The garden grows", ["carrots", "peas", "onions"]],
  ["My bag is", ["old", "torn", "muddy"]], ["They speak", ["Spanish", "Arabic", "French"]], ["The band has", ["drums", "guitars", "a flute"]], ["We visited", ["the museum", "the market", "the beach"]],
];
export const SHORT = [["do not", "don't"], ["cannot", "can't"], ["I am", "I'm"], ["it is", "it's"], ["we are", "we're"], ["they are", "they're"], ["did not", "didn't"], ["is not", "isn't"], ["she is", "she's"],
  ["you are", "you're"], ["I will", "I'll"], ["we have", "we've"], ["does not", "doesn't"], ["would not", "wouldn't"], ["he is", "he's"], ["that is", "that's"], ["let us", "let's"], ["could not", "couldn't"], ["was not", "wasn't"], ["they will", "they'll"]];
export const OWNERS = [["dog", "tail"], ["girl", "hat"], ["teacher", "desk"], ["bird", "nest"], ["baker", "shop"], ["cat", "whiskers"], ["king", "crown"], ["doctor", "bag"], ["farmer", "tractor"], ["baby", "toy"], ["pilot", "cap"], ["sister", "room"]];
export const OWNERS_MANY = [["boys", "coats"], ["girls", "bags"], ["dogs", "bowls"], ["teachers", "room"], ["players", "boots"], ["birds", "nests"], ["horses", "stable"], ["twins", "bedroom"], ["farmers", "market"], ["sisters", "bikes"]];
// [what is said (without its end mark), its end mark, the speaking verb, the speaker]
export const SPEECH = [
  ["Where are you going", "?", "asked", "Mia"], ["I am tired", ".", "said", "Ben"], ["Look at that rainbow", "!", "shouted", "Ravi"], ["Can I have some water", "?", "asked", "Lena"],
  ["It is time for bed", ".", "said", "Dad"], ["We won the match", "!", "cheered", "Omar"], ["Who took my pencil", "?", "asked", "Zuri"], ["The soup is ready", ".", "called", "Grandma"],
  ["I have lost my shoe", ".", "said", "Tomas"], ["Wait for me", "!", "called", "Yuki"], ["Is it raining", "?", "asked", "Sam"], ["Dinner smells good", ".", "said", "Noor"],
];
export const ITS = [
  ["The dog wagged ___ tail.", "its"], ["___ raining again.", "It's"], ["The tree lost ___ leaves.", "its"], ["I think ___ time to go.", "it's"], ["The bird fed ___ chicks.", "its"], ["___ a lovely day for a walk.", "It's"],
  ["The cat licked ___ paws.", "its"], ["Do you know if ___ open today?", "it's"], ["The robot waved ___ arm.", "its"], ["___ been a long week.", "It's"], ["The school has ___ own garden.", "its"], ["Hurry up, ___ nearly eight o'clock.", "it's"],
];

// ---------- vocabulary ----------
// [word, means the same, opposite, group]: wrong answers are taken from other groups so they can't also be right
export const PAIRS = [
  ["big", "large", "small", "size"], ["tall", "high", "short", "size"], ["wide", "broad", "narrow", "size"], ["thin", "slim", "thick", "size"],
  ["happy", "glad", "sad", "feel"], ["angry", "cross", "calm", "feel"], ["love", "adore", "hate", "feel"], ["laugh", "giggle", "cry", "feel"],
  ["fast", "quick", "slow", "move"], ["arrive", "reach", "leave", "move"], ["push", "shove", "pull", "move"], ["above", "over", "below", "move"], ["near", "nearby", "far", "move"],
  ["begin", "start", "end", "time"], ["old", "ancient", "new", "time"], ["always", "forever", "never", "time"],
  ["brave", "bold", "afraid", "person"], ["smart", "clever", "foolish", "person"], ["kind", "caring", "cruel", "person"], ["polite", "courteous", "rude", "person"], ["rich", "wealthy", "poor", "person"], ["strong", "powerful", "weak", "person"],
  ["clean", "spotless", "dirty", "look"], ["bright", "shiny", "dull", "look"], ["neat", "tidy", "messy", "look"], ["odd", "strange", "normal", "look"], ["simple", "plain", "fancy", "look"],
  ["hard", "difficult", "easy", "task"], ["true", "correct", "false", "task"], ["safe", "secure", "dangerous", "task"], ["win", "succeed", "lose", "task"],
  ["noisy", "loud", "quiet", "sound"], ["shout", "yell", "whisper", "sound"], ["answer", "reply", "ask", "sound"],
  ["hot", "boiling", "cold", "touch"], ["wet", "soaked", "dry", "touch"], ["rough", "bumpy", "smooth", "touch"],
  ["shut", "close", "open", "do"], ["buy", "purchase", "sell", "do"], ["give", "offer", "take", "do"], ["remember", "recall", "forget", "do"], ["build", "construct", "destroy", "do"], ["sick", "ill", "healthy", "body"], ["tired", "sleepy", "lively", "body"],
];
// words that are easy to mix up: [sentence with ___, right, the set of choices]
const T3 = ["there", "their", "they're"], YR = ["your", "you're", "yours"], TO = ["to", "too", "two"], TH = ["then", "than", "them"], WH = ["whose", "who's", "whom"], LO = ["lose", "loose", "loss"],
  AC = ["accept", "except", "accent"], AF = ["affect", "effect", "afford"], HR = ["hear", "here", "hair"], WR = ["where", "were", "wear"], BY = ["buy", "by", "bye"], KN = ["know", "no", "knot"],
  PA = ["passed", "past", "pass"], QU = ["quiet", "quite", "quit"], WE = ["weather", "whether", "wetter"], BR = ["break", "brake", "brick"], PE = ["piece", "peace", "pierce"];
export const MIXUPS = [
  ["___ going to the beach tomorrow.", "They're", T3], ["The children left ___ bags in the hall.", "their", T3], ["Put the box over ___.", "there", T3], ["___ is a spider on the wall.", "There", T3],
  ["___ dog is very friendly.", "Your", YR], ["I think ___ right.", "you're", YR], ["___ late for the bus!", "You're", YR], ["Is this ___ coat?", "your", YR],
  ["I have ___ sisters.", "two", TO], ["This soup is ___ hot.", "too", TO], ["We walked ___ the shop.", "to", TO], ["Can I come ___?", "too", TO],
  ["She is taller ___ her brother.", "than", TH], ["We ate lunch and ___ went outside.", "then", TH], ["___ shoes are these?", "Whose", WH], ["___ coming to the party?", "Who's", WH],
  ["Be careful not to ___ your ticket.", "lose", LO], ["My tooth is ___.", "loose", LO], ["I ___ your kind offer.", "accept", AC], ["Everyone came ___ Sam.", "except", AC],
  ["The rain will ___ the match.", "affect", AF], ["The medicine had a good ___.", "effect", AF], ["I can ___ the birds singing.", "hear", HR], ["Come over ___, please.", "here", HR],
  ["___ did you put my book?", "Where", WR], ["We ___ at the park yesterday.", "were", WR], ["I will ___ my blue hat.", "wear", WR], ["I want to ___ a new pencil.", "buy", BY],
  ["The book was written ___ a famous author.", "by", BY], ["I ___ the answer to that question.", "know", KN], ["There is ___ milk left.", "no", KN], ["We walked ___ the bakery on our way home.", "past", PA],
  ["She ___ the ball to her friend.", "passed", PA], ["Please be ___ in the library.", "quiet", QU], ["That film was ___ long.", "quite", QU], ["The ___ is sunny today.", "weather", WE],
  ["I don't know ___ to laugh or cry.", "whether", WE], ["Be careful not to ___ the glass.", "break", BR], ["Press the ___ to stop the bike.", "brake", BR], ["Would you like a ___ of cake?", "piece", PE],
  ["After the storm there was ___ and quiet.", "peace", PE],
];
export const MIX_WHY = new Map([
  [T3, "‘There’ is a place (or ‘there is’). ‘Their’ means belonging to them. ‘They're’ is short for ‘they are’."],
  [YR, "‘Your’ means belonging to you. ‘You're’ is short for ‘you are’."], [TO, "‘To’ shows direction, ‘too’ means also or more than enough, and ‘two’ is the number 2."],
  [TH, "‘Than’ compares two things. ‘Then’ is about time: what happens next."], [WH, "‘Whose’ asks who something belongs to. ‘Who's’ is short for ‘who is’."],
  [LO, "‘Lose’ means to no longer have something. ‘Loose’ means not tight."], [AC, "‘Accept’ means to take or agree to something. ‘Except’ means leaving out."],
  [AF, "‘Affect’ is usually the action (to change something). ‘Effect’ is usually the result."], [HR, "You ‘hear’ with your ear. ‘Here’ is this place."],
  [WR, "‘Where’ asks about a place, ‘were’ is the past of ‘are’, and you ‘wear’ clothes."], [BY, "You ‘buy’ something with money. ‘By’ shows who did something or where."],
  [KN, "To ‘know’ is to have something in your mind. ‘No’ means not any."], [PA, "‘Passed’ is the action (the past of ‘pass’). ‘Past’ means beyond, or time gone by."],
  [QU, "‘Quiet’ means making little noise. ‘Quite’ means rather or fairly."], [WE, "‘Weather’ is rain, sun and wind. ‘Whether’ introduces a choice."],
  [BR, "To ‘break’ is to damage something. A ‘brake’ slows a bike or car."], [PE, "A ‘piece’ is a part of something. ‘Peace’ is calm, with no fighting."],
]);
export const PREFIX = [["happy", "un"], ["agree", "dis"], ["possible", "im"], ["correct", "in"], ["fair", "un"], ["honest", "dis"], ["patient", "im"], ["visible", "in"], ["lock", "un"], ["appear", "dis"],
  ["perfect", "im"], ["active", "in"], ["kind", "un"], ["safe", "un"], ["complete", "in"], ["polite", "im"], ["tidy", "un"], ["obey", "dis"], ["behave", "mis"], ["understand", "mis"], ["spell", "mis"]];
export const MEANINGS = [
  ["ancient", "very old"], ["enormous", "very big"], ["reluctant", "not willing"], ["fragile", "easily broken"], ["generous", "happy to give and share"], ["cautious", "careful to avoid danger"],
  ["curious", "eager to know or learn"], ["exhausted", "very tired"], ["furious", "very angry"], ["delighted", "very pleased"], ["vanish", "to disappear suddenly"], ["assist", "to help"],
  ["glance", "to look quickly"], ["stroll", "to walk in a slow, relaxed way"], ["rapid", "very fast"], ["scarce", "hard to find because there is so little"], ["ordinary", "normal, not special"],
  ["transparent", "clear enough to see through"], ["triumph", "a great win or success"], ["predict", "to say what you think will happen"], ["investigate", "to look into something carefully to find the facts"],
  ["combine", "to join or mix together"], ["essential", "completely necessary"], ["temporary", "lasting only a short time"], ["permanent", "lasting for ever"], ["identical", "exactly the same"],
  ["frequent", "happening often"], ["observe", "to watch carefully"], ["reveal", "to show something that was hidden"], ["conceal", "to hide"], ["expand", "to get bigger"], ["shrink", "to get smaller"],
  ["ascend", "to go up"], ["descend", "to go down"], ["hesitate", "to pause before doing something"], ["remedy", "a cure or a way of fixing a problem"], ["feast", "a large, special meal"],
  ["summit", "the top of a mountain"], ["courage", "bravery"], ["absurd", "silly and not sensible"], ["abundant", "more than enough"], ["peculiar", "strange or unusual"], ["vivid", "bright and strong"],
  ["fortunate", "lucky"], ["blunder", "a careless mistake"],
];

// ---------- building sentences ----------
export const ORDER = [
  "The cat sat on the mat.", "My brother plays the drums.", "We went to the beach yesterday.", "She is reading a book.", "The baby laughed at the puppy.", "I like to eat mangoes.",
  "The birds are singing outside.", "He rode his bike to school.", "Can you open the window?", "Where is my blue hat?", "The sun is shining today.", "They built a big sandcastle.",
  "My friend lives next door.", "Please close the door quietly.", "The bus stops near the park.", "Do you like chocolate cake?", "Our teacher told a funny story.", "The stars shine at night.",
  "I brushed my teeth this morning.", "The frog jumped into the pond.", "What time does school start?", "A rainbow appeared after the rain.", "She gave me a present.", "The children are playing outside.",
  "We planted seeds in the garden.", "The old clock stopped working.", "He drinks milk every morning.", "Is the shop open today?", "The wind blew the leaves away.", "My grandmother bakes delicious bread.",
  "The little boat floated down the river.", "Why are you laughing so much?", "Her kite flew above the trees.", "We always wash our hands first.",
];
// [sentence with ___, right, [wrong…]]
export const JOIN = [
  ["I wore a coat ___ it was cold.", "because", ["but", "or", "so"]], ["I wanted to play outside, ___ it started to rain.", "but", ["because", "or", "so"]], ["We can walk to school, ___ we can take the bus.", "or", ["because", "so", "until"]],
  ["She was hungry, ___ she made a sandwich.", "so", ["but", "or", "because"]], ["He brushed his teeth ___ he went to bed.", "before", ["but", "or", "unless"]], ["We will go to the park ___ it stops raining.", "when", ["but", "or", "so"]],
  ["I like apples, ___ I do not like pears.", "but", ["because", "or", "so"]], ["Tie your laces, ___ you will trip.", "or", ["because", "but", "until"]], ["The dog barked ___ the postman arrived.", "when", ["or", "so", "unless"]],
  ["You can have cake ___ you finish your dinner.", "after", ["but", "or", "so"]], ["Mia sang ___ Leo played the piano.", "while", ["or", "so", "unless"]], ["I was tired, ___ I kept running.", "but", ["so", "or", "because"]],
  ["We stayed inside ___ the storm was over.", "until", ["or", "so", "but"]], ["Take an umbrella ___ it rains.", "if", ["but", "so", "or"]], ["He could not sleep ___ the music was too loud.", "because", ["but", "or", "so"]],
  ["She studied hard, ___ she passed the test.", "so", ["but", "or", "because"]], ["I have a cat ___ a dog.", "and", ["because", "so", "until"]], ["The path was steep ___ slippery.", "and", ["because", "so", "unless"]],
  ["You must hurry, ___ you will be late.", "or", ["because", "until", "although"]], ["___ it was raining, we went for a walk.", "Although", ["Or", "But", "So"]], ["I will call you ___ I get home.", "when", ["but", "or", "so"]],
  ["The baby cried ___ she was hungry.", "because", ["or", "but", "so"]], ["We ate breakfast, ___ then we walked to school.", "and", ["because", "or", "unless"]], ["He is small ___ very strong.", "but", ["because", "or", "so"]],
  ["Do you want tea ___ juice?", "or", ["but", "because", "so"]], ["Wait here ___ I come back.", "until", ["or", "so", "but"]], ["It was late, ___ we went home.", "so", ["or", "because", "but"]],
  ["She smiled ___ she opened the present.", "when", ["or", "but", "unless"]], ["I can't come out ___ I have finished my homework.", "until", ["so", "or", "but"]], ["Plants grow well ___ they get enough sunlight.", "if", ["but", "or", "so"]],
];
export const JOIN_WHY = { because: "‘Because’ gives the reason.", but: "‘But’ joins two ideas that pull against each other.", or: "‘Or’ gives a choice, or says what happens otherwise.", so: "‘So’ shows the result.",
  before: "‘Before’ tells you which thing happens first.", after: "‘After’ tells you which thing happens second.", when: "‘When’ tells you the time something happens.", while: "‘While’ means at the same time.",
  until: "‘Until’ means up to the time that something happens.", if: "‘If’ says what must be true first.", and: "‘And’ adds one thing to another.", although: "‘Although’ introduces something surprising: it happened anyway." };
// [subject, base, with -s, past, a common wrong past, the rest of the sentence]
export const VERBS = [
  ["She", "go", "goes", "went", "goed", "to the market"], ["He", "eat", "eats", "ate", "eated", "an apple"], ["The dog", "run", "runs", "ran", "runned", "to the gate"], ["Ana", "write", "writes", "wrote", "writed", "a letter"],
  ["Leo", "see", "sees", "saw", "seen", "a rainbow"], ["The duck", "swim", "swims", "swam", "swimmed", "across the lake"], ["Mei", "sing", "sings", "sang", "singed", "a song"], ["Dad", "buy", "buys", "bought", "buyed", "some bread"],
  ["Noor", "take", "takes", "took", "taked", "the bus"], ["Grandpa", "make", "makes", "made", "maked", "soup"], ["The baby", "drink", "drinks", "drank", "drinked", "milk"], ["The bird", "fly", "flies", "flew", "flied", "over the house"],
  ["Sam", "catch", "catches", "caught", "catched", "the ball"], ["Lena", "give", "gives", "gave", "gived", "me a pencil"], ["Omar", "ride", "rides", "rode", "rided", "a horse"], ["The cat", "sleep", "sleeps", "slept", "sleeped", "on the bed"],
  ["Zuri", "draw", "draws", "drew", "drawed", "a tiger"], ["Ravi", "find", "finds", "found", "finded", "a coin"], ["Our teacher", "teach", "teaches", "taught", "teached", "music"], ["Yuki", "bring", "brings", "brought", "bringed", "her lunch"],
  ["Tomas", "build", "builds", "built", "builded", "a model boat"], ["Grandma", "tell", "tells", "told", "telled", "a story"], ["Ines", "wear", "wears", "wore", "weared", "a red scarf"], ["The boy", "throw", "throws", "threw", "throwed", "the ball"],
  ["The plant", "grow", "grows", "grew", "growed", "very tall"],
];

// ---------- reading: [title, passage, [[question, right, wrong, wrong, wrong], …]] ----------
export const READING = [
  [ // level 1
    ["The Lost Kite", "Sam and his sister Lila flew a red kite on the hill. A strong wind pulled the string out of Sam's hand. The kite sailed over the trees and landed in a tall mango tree. Lila ran to get their uncle. He brought a long ladder and climbed up. Soon the kite was back in Sam's hands.", [
      ["What did Sam and Lila fly on the hill?", "A red kite", "A blue kite", "A paper plane", "A balloon"], ["Why did Sam lose the kite?", "A strong wind pulled the string from his hand", "He let go of it on purpose", "Lila took it from him", "It got too dark to see"],
      ["Where did the kite land?", "In a tall mango tree", "On the roof of a house", "In the river", "At the bottom of the hill"], ["Who got the kite down?", "Their uncle", "Lila", "Sam", "A farmer"]]],
    ["Busy Bees", "Bees are busy insects. They fly from flower to flower to collect a sweet juice called nectar. Back at the hive, they turn the nectar into honey. Bees also carry a yellow dust called pollen from one flower to another. This helps plants make seeds and fruit. Without bees, we would have far fewer apples, berries and nuts.", [
      ["What sweet juice do bees collect from flowers?", "Nectar", "Honey", "Water", "Milk"], ["Where do bees turn nectar into honey?", "At the hive", "Inside a flower", "In the soil", "On a leaf"],
      ["What is pollen?", "A yellow dust", "A sweet juice", "A kind of bee", "A small seed"], ["Why are bees important to plants?", "They help plants make seeds and fruit", "They eat insects that harm plants", "They make flowers smell nice", "They water the plants"]]],
    ["Market Day", "Every Saturday, Amara helps her grandmother at the market. They set up the stall before the sun comes up. Amara stacks the tomatoes and onions in neat piles. Her grandmother weighs the rice. By noon the stall is nearly empty. Then they count the money, buy some fish for dinner and walk home together.", [
      ["When does Amara help at the market?", "Every Saturday", "Every Sunday", "Every day", "Every Friday"], ["What does Amara stack in neat piles?", "Tomatoes and onions", "Rice and fish", "Apples and pears", "Loaves of bread"],
      ["What do they buy for dinner?", "Fish", "Rice", "Chicken", "Tomatoes"], ["Why is the stall nearly empty by noon?", "Most of the food has been sold", "They have eaten the food", "The food fell off the stall", "Nobody came to the market"]]],
    ["The Snowy Owl", "The snowy owl lives in the far north, where it is very cold. Its thick white feathers keep it warm and help it hide in the snow. Unlike most owls, the snowy owl often hunts during the day. It has sharp eyes and can hear small animals moving under the snow. It mostly eats a small animal called a lemming.", [
      ["Where does the snowy owl live?", "In the far north", "In hot deserts", "In rainforests", "On sandy beaches"], ["How do its white feathers help it?", "They keep it warm and help it hide", "They make it fly faster", "They scare other animals away", "They help it swim"],
      ["What is unusual about the snowy owl?", "It often hunts during the day", "It cannot fly", "It sleeps under the snow", "It eats only plants"], ["What does the snowy owl mostly eat?", "Lemmings", "Fish", "Berries", "Insects"]]],
    ["A Rainy Morning", "Tomas woke to the sound of rain on the roof. He wanted to stay in bed, but it was his turn to feed the chickens. He pulled on his boots and ran across the yard. The chickens were waiting by the door. After he scattered the corn, he found three warm eggs in the straw. He carried them inside very carefully.", [
      ["What woke Tomas?", "The sound of rain on the roof", "The chickens", "His mother calling", "An alarm clock"], ["Why did Tomas get out of bed?", "It was his turn to feed the chickens", "He was hungry", "He had to go to school", "He wanted to play in the rain"],
      ["What did Tomas find in the straw?", "Three warm eggs", "Some corn", "A lost chick", "His boots"], ["Why did he carry the eggs carefully?", "So they would not break", "Because they were very heavy", "Because it was dark", "Because the chickens were asleep"]]],
  ],
  [ // level 2
    ["Water on the Move", "The water on Earth is always moving. When the sun warms the sea, some of the water turns into a gas you cannot see. This is called evaporation. The gas rises, cools and turns back into tiny drops of water, which gather to form clouds. When the drops become too heavy, they fall as rain or snow. The water runs into streams and rivers, which carry it back to the sea. Then the journey starts all over again. The same water has been going round like this for millions of years.", [
      ["What makes sea water turn into a gas?", "The warmth of the sun", "The wind", "The waves", "The moon"], ["What is evaporation?", "Water turning into a gas", "Rain falling from clouds", "Clouds moving across the sky", "Rivers flowing to the sea"],
      ["Why do the drops of water fall from clouds?", "They become too heavy", "The wind pushes them down", "The sun melts them", "The clouds get too hot"], ["What does “the journey starts all over again” tell you?", "The water keeps going round and never stops", "Rain only ever falls once", "The rivers will soon run dry", "The sea is getting bigger"]]],
    ["The New Girl", "On Monday a new girl joined our class. Her name was Hana, and she had just moved from a town far away. At break she stood alone by the fence, turning a small wooden bird over in her hands. I remembered my own first day, when my stomach felt full of butterflies. So I walked over and asked about the bird. Hana's face lit up. Her grandfather had carved it for her, she said, so she would always have a friend in her pocket. By the end of break, she had two.", [
      ["Why was Hana standing alone?", "She was new and did not know anyone yet", "She was in trouble with the teacher", "She did not like games", "She was waiting for her grandfather"], ["What does “my stomach felt full of butterflies” mean?", "The writer felt nervous", "The writer felt hungry", "The writer had eaten something bad", "The writer was excited about lunch"],
      ["Who made the wooden bird?", "Hana's grandfather", "Hana", "The writer", "The teacher"], ["What does the last sentence, “she had two”, mean?", "Hana now had two friends: the bird and the writer", "Hana now had two wooden birds", "Hana had two breaks that day", "Hana had two grandfathers"]]],
    ["The Story of the Bicycle", "The first bicycles, made about two hundred years ago, had no pedals. Riders sat on a wooden frame and pushed themselves along with their feet. Later, inventors added pedals to the front wheel. To go faster, they made the front wheel enormous and the back wheel tiny. These bicycles were quick but dangerous, because the rider sat high above the ground. Finally, around 1885, the “safety bicycle” appeared. It had two wheels of the same size and a chain to turn the back wheel. Most bicycles today still follow that design.", [
      ["How did riders move the very first bicycles?", "They pushed along the ground with their feet", "They turned pedals", "Horses pulled them", "They only rode downhill"], ["Why was the front wheel made enormous?", "To go faster", "To look grand", "To carry more people", "To make it safer"],
      ["Why were those bicycles dangerous?", "The rider sat high above the ground", "They were made of wood", "They were too heavy to lift", "They could not turn corners"], ["What was new about the safety bicycle?", "Two wheels of the same size and a chain", "It had no pedals", "It had a wooden frame", "It had an enormous front wheel"]]],
    ["The Clever Crow", "A thirsty crow found a jug with a little water at the bottom. She pushed her beak inside, but the water was too low to reach. She tried to tip the jug over, but it was too heavy. Then the crow had an idea. She picked up a pebble and dropped it into the jug. Then another, and another. With every pebble the water rose a little higher. At last it reached the top, and the crow drank as much as she wanted. Sometimes a little thinking does more than a lot of strength.", [
      ["Why couldn't the crow drink at first?", "The water was too low to reach", "The jug was empty", "The jug had a lid", "The water was too hot"], ["What did the crow try second?", "Tipping the jug over", "Breaking the jug", "Asking another bird for help", "Flying away to find a river"],
      ["Why did the water rise?", "The pebbles took up space and pushed the water up", "It began to rain", "The jug got smaller", "The sun warmed the water"], ["What is the lesson of the story?", "Thinking can solve what strength cannot", "Never drink from a jug", "Crows are always thirsty", "Heavy things are useless"]]],
    ["Why We Sleep", "Everyone needs sleep, but not everyone needs the same amount. A new baby may sleep for sixteen hours a day. Children of school age need about ten hours, and most adults need seven or eight. While you sleep, your body is busy. It repairs muscles, fights off germs and releases the chemicals that help you grow. Your brain is busy too: it sorts through the day's events and stores what you have learned. That is why a good night's sleep before a test can help more than staying up late to study.", [
      ["Who needs the most sleep?", "New babies", "Children of school age", "Adults", "Grandparents"], ["About how many hours of sleep do school-age children need?", "Ten", "Sixteen", "Seven", "Five"],
      ["Which of these is NOT in the passage as something the body does during sleep?", "Digesting your dinner", "Repairing muscles", "Fighting off germs", "Releasing chemicals that help you grow"], ["Why can sleep help before a test?", "The brain stores what you have learned while you sleep", "You dream the answers", "You wake up earlier", "Tests are easier in the morning"]]],
  ],
  [ // level 3
    ["The Lighthouse Keeper", "For thirty years, Tobias had climbed the one hundred and twelve steps of the lighthouse every evening. He trimmed the wick, polished the great glass lens and lit the lamp before the sun touched the sea. Ships he would never see up close slid safely past the rocks because of him. Then a letter came. The lighthouse was to be fitted with an automatic electric lamp; a keeper would no longer be needed. On his last evening, Tobias climbed the steps more slowly than usual. He polished the lens until it shone, though the new machine would not care. Then he lit the lamp one final time, sat down beside it, and watched the beam sweep out across the dark water until morning.", [
      ["What was Tobias's job?", "Keeping the lamp lit so ships could pass the rocks safely", "Building ships", "Delivering letters", "Catching fish"], ["Why would a keeper no longer be needed?", "An automatic electric lamp was being fitted", "The lighthouse was being knocked down", "Ships had stopped sailing past", "The rocks had been removed"],
      ["Why did he most likely climb the steps slowly on his last evening?", "He was sad to be leaving a job he cared about", "The steps had been damaged", "He was carrying the new lamp", "He could not see in the dark"], ["What does “though the new machine would not care” suggest about him?", "He took pride in his work even when no one would notice", "He thought the machine was broken", "He disliked polishing the lens", "He had forgotten how to light the lamp"]]],
    ["Why Leaves Turn Red and Gold", "Leaves are green because they are full of a substance called chlorophyll, which plants use to turn sunlight into food. All summer, a tree makes fresh chlorophyll to replace what wears out. As autumn brings shorter days and cooler nights, the tree prepares to rest. It stops making chlorophyll, and the green slowly fades. Now other substances that were hidden in the leaf all along can be seen: yellows and oranges, the same ones found in carrots and bananas. Some trees also make a red substance in autumn, especially when sunny days are followed by cool nights. Finally the tree seals off each leaf stem, and the leaf falls. The tree has not died; it is saving its energy for spring.", [
      ["What does chlorophyll do?", "It helps the plant turn sunlight into food", "It makes the leaves fall", "It keeps the tree warm", "It carries water to the roots"], ["Why does the green fade in autumn?", "The tree stops making chlorophyll", "The leaves dry out in the sun", "Frost stains the leaves", "The wind blows the green away"],
      ["Where do the yellows and oranges come from?", "They were in the leaf all along, hidden by the green", "The tree makes them from rain", "They rise from the soil in autumn", "They come from carrots growing nearby"], ["When are the reds strongest?", "When sunny days are followed by cool nights", "When it rains every day", "In the middle of spring", "When there is no wind"]]],
    ["The Last Lap", "Daniel had trained for the cross-country race for months, and with one lap to go he was in second place. The leader, a boy from another school, was only a few strides ahead. Then, on the muddy bend by the stream, the leader slipped and went down hard. Daniel could have run straight past. The finish line was in sight, and so was the medal he had dreamed about. Instead he stopped, held out his hand and pulled the boy to his feet. They ran the last stretch side by side, and the other boy crossed the line a step ahead. Daniel's coach shook her head, smiling. “You'll never win that way,” she said. “But I wouldn't change you for all the medals in the world.”", [
      ["What place was Daniel in with one lap to go?", "Second", "First", "Third", "Last"], ["What happened on the muddy bend?", "The leader slipped and fell", "Daniel slipped and fell", "The stream flooded the path", "Daniel dropped his medal"],
      ["Who crossed the finish line first?", "The boy from the other school", "Daniel", "They crossed at exactly the same time", "Neither of them finished"], ["What did the coach mean by her last words?", "She valued his kindness more than a win", "She was angry that he had lost", "She wanted him to stop racing", "She thought he was too slow"]]],
    ["When Salt Was Treasure", "Today salt is so cheap that restaurants give it away, but for most of history it was precious. Before refrigerators, salt was the best way to stop meat and fish from spoiling, so a town with salt could store food for winter and feed an army on the march. Roman soldiers were sometimes paid partly in salt, which is one explanation for the word “salary”. Traders carried blocks of salt across the Sahara by camel and exchanged them for gold. Rulers noticed how badly people needed salt and taxed it heavily. Only in the last two hundred years, with new ways of mining and transport, did salt become something we hardly notice.", [
      ["Why was salt so valuable before refrigerators?", "It stopped meat and fish from spoiling", "It was hard to find in the sea", "It made food taste sweet", "It could be turned into gold"], ["According to the passage, where may the word “salary” come from?", "Roman soldiers being paid partly in salt", "The camels that carried salt", "A kind of salted fish", "The name of a salt mine"],
      ["Why did rulers tax salt heavily?", "People needed it so badly that they had to pay", "Salt was bad for people's health", "They wanted to stop the traders", "Salt was about to run out"], ["What made salt cheap?", "New ways of mining and transport", "People stopped eating it", "Refrigerators replaced it completely", "The Sahara ran out of gold"]]],
    ["The Octopus", "An octopus has three hearts, blue blood and no bones at all. Because its body is soft, it can squeeze through any gap larger than its hard beak, the only stiff part of its body. Most of an octopus's nerve cells are not in its head but in its eight arms, and each arm can taste what it touches and even solve simple problems by itself. Octopuses are also masters of disguise. Special cells in their skin let them change their shade and pattern in less than a second to match rocks, sand or seaweed. In aquariums they have been seen opening jars, escaping from tanks at night and squirting water at lights they dislike. Scientists study them to learn how a mind so different from ours can be so clever.", [
      ["How many hearts does an octopus have?", "Three", "One", "Eight", "Two"], ["Why can an octopus squeeze through small gaps?", "Its body is soft, with no bones", "It can shrink its beak", "Its skin is very slippery", "It has eight arms"],
      ["What is surprising about an octopus's arms?", "They hold most of its nerve cells and can taste", "They have small bones inside", "They cannot move on their own", "They glow in the dark"], ["How does an octopus disguise itself?", "By changing the shade and pattern of its skin", "By hiding inside jars", "By burying itself in mud", "By holding seaweed over its head"],
      ["Why do scientists study octopuses?", "To learn how a very different kind of mind can be clever", "To teach them to talk", "To breed bigger ones", "To find out why their blood is blue"]]],
  ],
];
