// Hand-picked, kid-safe words: "word|emoji|clue". The clue never contains the word itself.
const RAW = {
  easy: `cat|🐱|A pet that says meow.
dog|🐶|A pet that says woof.
sun|☀️|It shines in the sky in the daytime.
hat|🧢|You wear it on your head.
fish|🐟|It swims in the water.
milk|🥛|A white drink from a cow.
frog|🐸|A green jumper that lives near ponds.
book|📚|You read it to enjoy stories.
tree|🌳|A tall plant with leaves and a trunk.
ball|⚽|You can kick it or throw it.
star|⭐|It twinkles in the night sky.
cake|🎂|A sweet treat for birthdays.
bird|🐦|It has wings and can sing.
duck|🦆|It says quack and loves puddles.
pig|🐷|A pink farm animal that oinks.
cow|🐮|A farm animal that says moo.
bee|🐝|A buzzing insect that makes honey.
egg|🥚|A chicken lays it.
bus|🚌|A big vehicle that carries many people.
car|🚗|You ride in it on the road.
boat|⛵|It floats and sails on water.
moon|🌙|It glows in the sky at night.
rain|🌧️|Drops of water falling from clouds.
snow|❄️|Cold, white and fluffy flakes.
apple|🍎|A crunchy red or green fruit.
bear|🐻|A big furry animal that loves honey.
lion|🦁|The king of the jungle.
hand|✋|You have five fingers on it.
shoe|👟|You wear it on your foot.
sock|🧦|It keeps your foot warm inside a shoe.
key|🔑|You use it to open a lock.
bed|🛏️|You sleep in it at night.
door|🚪|You open it to walk into a room.
kite|🪁|It flies high on a string in the wind.
drum|🥁|You hit it to make a beat.
leaf|🍃|A green part of a plant.
rose|🌹|A red flower with thorns.
corn|🌽|Yellow kernels on a cob.
pizza|🍕|A round meal with cheese on top.
bread|🍞|You make toast from it.
grape|🍇|A small round fruit that grows in bunches.
lemon|🍋|A sour yellow fruit.
horse|🐴|You can ride it and it says neigh.
mouse|🐭|A tiny animal that loves cheese.
whale|🐳|The biggest animal in the sea.
clock|🕐|It tells you the time.`,
  medium: `planet|🪐|Earth is one of these.
rocket|🚀|It blasts off into space.
garden|🌼|A place where flowers and vegetables grow.
butter|🧈|You can spread it on toast.
jungle|🌴|A wild, hot forest full of animals.
pencil|✏️|You write with it and can erase it.
winter|⛄|The coldest season of the year.
dragon|🐉|A magical creature that breathes fire.
bridge|🌉|It lets you cross over a river.
cookie|🍪|A round, sweet baked snack.
soccer|🥅|A game where you kick a ball into a goal.
school|🏫|Where children go to learn.
monkey|🐒|It climbs trees and loves bananas.
turtle|🐢|A slow animal that carries a shell.
rabbit|🐰|A fluffy animal with long ears that hops.
orange|🍊|A round, juicy citrus fruit.
banana|🍌|A long yellow fruit with a peel.
cherry|🍒|A small red fruit with a stone inside.
flower|🌸|A colourful bloom that smells sweet.
castle|🏰|A big stone home for kings and queens.
pirate|🏴‍☠️|A sailor who hunts for treasure.
guitar|🎸|A musical instrument with strings.
camera|📷|You take photos with it.
window|🪟|You look through it. It is made of glass.
basket|🧺|You carry picnic food in it.
bucket|🪣|You carry water or sand in it.
candle|🕯️|It has a flame and melts as it burns.
spider|🕷️|It has eight legs and spins a web.
tiger|🐯|A big cat with orange and black stripes.
zebra|🦓|A horse-like animal with stripes.
parrot|🦜|A colourful bird that can copy words.
island|🏝️|Land with water all around it.
volcano|🌋|A mountain that can erupt with lava.
carrot|🥕|An orange vegetable that rabbits love.
potato|🥔|A vegetable you can turn into chips.
cupcake|🧁|A small cake with icing on top.
magnet|🧲|It sticks to metal.
anchor|⚓|A heavy hook that keeps a ship still.
wizard|🧙|A magic person with a pointy hat.
fairy|🧚|A tiny magical creature with wings.
robot|🤖|A machine that can move and do jobs.
ghost|👻|A spooky, floaty pretend spirit.
pepper|🌶️|A spicy red vegetable.
dinner|🍽️|The meal you eat in the evening.`,
  hard: `elephant|🐘|A huge animal with a long trunk.
dinosaur|🦖|A giant reptile from long, long ago.
rainbow|🌈|Colourful arc in the sky after rain.
treasure|💎|Hidden gold and gems.
sandwich|🥪|A snack between two slices of bread.
library|📖|A place where you can borrow books.
playground|🛝|A place with swings and slides.
adventure|🧭|An exciting journey or quest.
mountain|⛰️|A very, very high hill.
hospital|🏥|Doctors and nurses help sick people here.
question|❓|Something you ask when you want an answer.
calendar|📅|It shows the days, weeks and months.
umbrella|☂️|It keeps you dry in the rain.
butterfly|🦋|An insect with colourful wings that starts as a caterpillar.
telescope|🔭|You look through it to see far-away stars.
crocodile|🐊|A big green reptile with lots of teeth.
chocolate|🍫|A sweet brown treat made from cocoa.
pineapple|🍍|A spiky tropical fruit with a leafy top.
strawberry|🍓|A red fruit with tiny seeds on the outside.
watermelon|🍉|A big green fruit that is red and juicy inside.
hamburger|🍔|A meat patty served in a bun.
dolphin|🐬|A clever, friendly animal that leaps from the sea.
giraffe|🦒|The tallest animal, with a very long neck.
kangaroo|🦘|It hops and carries its baby in a pouch.
penguin|🐧|A bird that cannot fly but loves to swim.
octopus|🐙|A sea creature with eight arms.
microscope|🔬|It makes tiny things look big.
helicopter|🚁|It flies using spinning blades on top.
skateboard|🛹|A board with wheels that you ride.
backpack|🎒|You carry your school things in it.
fireworks|🎆|Colourful lights that explode in the night sky.
snowman|⛄|A figure you build from snow.
sunflower|🌻|A tall yellow flower that follows the sun.
airplane|✈️|It flies passengers through the sky.
ambulance|🚑|A vehicle that rushes sick people to hospital.
bicycle|🚲|A two-wheeled ride that you pedal.
scissors|✂️|You use them to cut paper.
trumpet|🎺|A brass instrument you blow into.
volleyball|🏐|A game where you hit a ball over a net.
basketball|🏀|A game where you throw a ball through a hoop.
champion|🏆|The winner of a contest.
spaceship|🛸|A craft that travels through space.
astronaut|👩‍🚀|A person who travels in space.
lightning|⚡|A bright flash in a storm.
tornado|🌪️|A spinning funnel of wind.`,
};

export const WORDS = Object.fromEntries(
  Object.entries(RAW).map(([level, text]) => [
    level,
    text.split("\n").map((line) => {
      const [word, emoji, clue] = line.split("|");
      return { word: word.trim(), emoji: emoji.trim(), clue: clue.trim() };
    }),
  ])
);
