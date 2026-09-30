/**
 * Extra question bank. One question per line: level|question|correct answer|wrong 1|wrong 2|wrong 3|optional fun fact
 * Levels: k = kids, a = family (everyone), d = adults. Topics are the keys below.
 */
const RAW = {
  Science: `
k|What do we call the star that gives us light in the day?|The Sun|The Moon|A planet|A comet
k|What do plants give us to breathe?|Oxygen|Smoke|Sand|Plastic
k|Which sense do we use our nose for?|Smell|Hearing|Sight|Touch
k|How many senses do humans usually have?|5|3|7|10
k|Which liquid do we need to drink every day?|Water|Paint|Oil|Glue
k|Which season comes after winter?|Spring|Summer|Autumn|Winter again
k|What falls from clouds when it rains?|Water drops|Sand|Leaves|Feathers
k|What do we call a scientist who studies animals?|Zoologist|Chef|Pilot|Artist
k|What do we call frozen water?|Ice|Steam|Fog|Mud
k|Which sense do you use your ears for?|Hearing|Smell|Taste|Sight
k|What force pulls things down to the ground?|Gravity|Magnetism|Wind|Friction
k|Which part of your body pumps blood around?|The heart|The lungs|The stomach|The brain
k|What gas do we breathe in to stay alive?|Oxygen|Smoke|Helium|Steam
k|What do caterpillars turn into?|Butterflies|Beetles|Bees|Birds
k|A baby frog is called a…|Tadpole|Cub|Kitten|Calf
k|What do magnets attract?|Iron|Wood|Paper|Glass
k|Which body part do you use to think?|Brain|Liver|Kidney|Skin
k|What do we call animals that only eat plants?|Herbivores|Carnivores|Predators|Scavengers
k|What colour are most leaves?|Green|Blue|Purple|Orange
k|When water gets very hot it turns into…|Steam|Ice|Snow|Sand
a|What is the chemical formula for water?|H2O|CO2|O2|NaCl
a|What is the hardest natural substance?|Diamond|Gold|Iron|Quartz
a|Which part of a cell is called its powerhouse?|Mitochondria|Nucleus|Ribosome|Membrane
a|Which gas makes up most of Earth's air?|Nitrogen|Oxygen|Carbon dioxide|Argon|About 78 percent of the air is nitrogen.
a|What is the study of living things called?|Biology|Geology|Chemistry|Physics
a|How many hearts does an octopus have?|Three|One|Two|Eight
a|Which blood cells carry oxygen?|Red blood cells|White blood cells|Platelets|Plasma
a|At what temperature does water freeze?|0 °C|10 °C|−10 °C|32 °C|That is also 32 °F.
a|Which vitamin do we make from sunlight?|Vitamin D|Vitamin C|Vitamin A|Vitamin B12
a|Which metal is liquid at room temperature?|Mercury|Iron|Lead|Copper
a|What do we call an animal with a backbone?|A vertebrate|An invertebrate|An insect|A mollusc
a|Which part of a plant makes food using sunlight?|The leaves|The roots|The stem|The petals
a|Roughly how fast does sound travel in air?|343 metres per second|34 metres per second|3,430 metres per second|300,000 km per second
d|What is the pH of pure water?|7|1|14|0|Below 7 is acid and above 7 is alkaline.
d|Which particle carries a negative charge?|Electron|Proton|Neutron|Photon
d|What is the SI unit of force?|Newton|Joule|Watt|Pascal
d|What is the atomic number of carbon?|6|12|8|14
d|What does DNA stand for?|Deoxyribonucleic acid|Dioxyribonucleic acid|Deoxyribose nucleic amino|Dinucleic acid
d|Who proposed the theory of evolution by natural selection?|Charles Darwin|Gregor Mendel|Louis Pasteur|Isaac Newton
d|What is the most abundant element in the universe?|Hydrogen|Oxygen|Helium|Carbon
d|What is absolute zero in Celsius?|−273.15 °C|−100 °C|−459 °C|0 °C
d|Which element has the symbol Fe?|Iron|Fluorine|Lead|Tin
d|Who discovered penicillin?|Alexander Fleming|Louis Pasteur|Marie Curie|Joseph Lister
d|Which organelle contains chlorophyll?|Chloroplast|Mitochondrion|Vacuole|Nucleus
d|The unit of electrical resistance is the…|Ohm|Volt|Ampere|Farad
d|Which layer of the Earth lies between the crust and the core?|The mantle|The stratosphere|The ionosphere|The magnetosphere
d|How do cells divide to make two identical cells?|Mitosis|Meiosis|Osmosis|Diffusion
`,
  Nature: `
k|Which animal has stripes and looks like a horse?|Zebra|Cow|Goat|Deer
k|What do we call a baby cow?|Calf|Lamb|Foal|Kid
k|What do we call a baby sheep?|Lamb|Calf|Puppy|Chick
k|What is a baby horse called?|Foal|Calf|Pup|Cub
k|Which animal lays eggs and says "cluck"?|Hen|Cow|Pig|Goat
k|Which farm animal says "oink"?|Pig|Sheep|Duck|Horse
k|Which bird says "hoot" at night?|Owl|Parrot|Duck|Hen
k|Which animal has a very long tongue and eats ants?|Anteater|Cat|Dog|Rabbit
k|What is the largest animal in the sea?|Blue whale|Shark|Octopus|Crab
k|Which insect glows in the dark?|Firefly|Ant|Fly|Ladybird
k|Which animal carries its house on its back?|Snail|Dog|Rabbit|Frog
k|Which animal is known for its black and white fur and eats bamboo?|Panda|Zebra|Sheep|Skunk
k|Which animal has a hump on its back in the desert?|Camel|Horse|Lion|Cow
k|What do caterpillars love to eat?|Leaves|Meat|Pizza|Rocks
k|What is the biggest cat in the jungle?|Tiger|Lion|Leopard|Cheetah
k|Which bird is famous for its colourful tail feathers?|Peacock|Crow|Sparrow|Pigeon
k|Which animal is the tallest in the world?|Giraffe|Elephant|Camel|Horse
k|How many legs does an insect have?|6|8|4|10
k|What do giant pandas mainly eat?|Bamboo|Fish|Meat|Grass
k|Which bird cannot fly and lives in the cold south?|Penguin|Eagle|Owl|Parrot
k|A group of fish is called a…|School|Herd|Flock|Pack
k|Which animal has a long trunk?|Elephant|Giraffe|Hippo|Rhino
k|Which animal hops and carries its baby in a pouch?|Kangaroo|Rabbit|Frog|Squirrel
k|A baby dog is called a…|Puppy|Kitten|Cub|Foal
k|A baby cat is called a…|Kitten|Puppy|Calf|Lamb
k|Which animal spins a web?|Spider|Ant|Beetle|Worm
k|Which is the fastest land animal?|Cheetah|Lion|Horse|Leopard
k|What colour are flamingos?|Pink|Blue|Green|Yellow
k|What do fish use to breathe under water?|Gills|Lungs|Wings|A nose
k|Which animal sleeps hanging upside down?|Bat|Owl|Monkey|Eagle
k|A home for bees is called a…|Hive|Nest|Den|Burrow
k|Which animal can change colour to hide?|Chameleon|Elephant|Lion|Zebra
a|What is the largest bird in the world?|Ostrich|Emu|Albatross|Condor
a|Which mammal can truly fly?|Bat|Flying squirrel|Sugar glider|Colugo|Flying squirrels only glide.
a|A young kangaroo is called a…|Joey|Cub|Calf|Pup
a|Which mammal lays eggs?|Platypus|Koala|Dolphin|Bat
a|What is it called when a caterpillar becomes a butterfly?|Metamorphosis|Migration|Hibernation|Pollination
a|Which sea creature has eight arms?|Octopus|Jellyfish|Starfish|Crab
a|Which tree produces acorns?|Oak|Pine|Maple|Birch
a|Which is the largest hot desert in the world?|The Sahara|The Gobi|The Kalahari|The Arabian
a|What is the longest river in Africa?|The Nile|The Congo|The Niger|The Zambezi
a|Which bird is the fastest in a dive?|Peregrine falcon|Golden eagle|Ostrich|Swift
a|What is the biggest mammal ever to have lived?|Blue whale|African elephant|Sperm whale|Giraffe
d|What is the deepest known ocean trench?|The Mariana Trench|The Tonga Trench|The Java Trench|The Puerto Rico Trench
d|A group of lions is called a…|Pride|Pack|Herd|Troop
d|A group of crows is called a…|Murder|Parliament|Gaggle|Colony
d|What is the study of birds called?|Ornithology|Entomology|Herpetology|Ichthyology
d|What is the study of insects called?|Entomology|Ornithology|Mycology|Botany
d|What is the smallest bird in the world?|Bee hummingbird|Wren|Sparrow|Finch
d|Which is the largest fish in the world?|Whale shark|Great white shark|Hammerhead|Tiger shark
d|How long is an elephant pregnant for, roughly?|22 months|9 months|12 months|6 months
d|Which continent is the baobab tree most famously linked with?|Africa|South America|Europe|Antarctica
`,
  Space: `
k|What is the Moon?|A big ball of rock|A star|A planet|A cloud
k|Which planet is closest to the Sun?|Mercury|Earth|Mars|Saturn
k|Which planet is called the Red Planet?|Mars|Venus|Jupiter|Neptune
k|Where do astronauts live in space?|A space station|A castle|A cave|A boat
k|What is the name of our galaxy?|The Milky Way|Andromeda|The Sunflower|The Whirlpool
k|Which planet has big beautiful rings?|Saturn|Mars|Venus|Mercury
k|How many planets are in our solar system?|8|9|7|10
k|Which planet do we live on?|Earth|Mars|Venus|Jupiter
k|Who was the first person to walk on the Moon?|Neil Armstrong|Buzz Aldrin|Yuri Gagarin|John Glenn
k|A shooting star is really a…|Meteor|Comet|Planet|Satellite
k|What flies people into space?|A rocket|A bus|A helicopter|A bicycle
k|What is at the centre of our solar system?|The Sun|The Moon|Earth|Jupiter
k|What lights up the sky at night, orbiting Earth?|The Moon|The Sun|Mars|A comet
a|Which planet is known as the Morning Star or Evening Star?|Venus|Mars|Mercury|Jupiter
a|What is the largest moon of Saturn?|Titan|Europa|Ganymede|Io
a|Which planet has the Great Red Spot?|Jupiter|Saturn|Mars|Neptune
a|About how long does sunlight take to reach Earth?|8 minutes|8 seconds|8 hours|1 day
a|What was the first artificial satellite?|Sputnik 1|Explorer 1|Vostok 1|Apollo 1
a|Which planet spins on its side?|Uranus|Neptune|Saturn|Mars
a|What does a light-year measure?|Distance|Time|Speed|Brightness
a|Which space telescope was launched in 1990?|Hubble|James Webb|Kepler|Spitzer
a|Which planet is the farthest from the Sun?|Neptune|Uranus|Saturn|Jupiter
d|Who was the first woman in space?|Valentina Tereshkova|Sally Ride|Mae Jemison|Peggy Whitson
d|In which year did humans first land on the Moon?|1969|1965|1972|1961
d|Which large spiral galaxy is our nearest big neighbour?|Andromeda|Triangulum|Whirlpool|Sombrero
d|Which spacecraft was the first to leave the heliosphere?|Voyager 1|Pioneer 10|Apollo 11|New Horizons
d|What is the boundary around a black hole called?|Event horizon|Singularity|Photosphere|Corona
d|What kind of star is our Sun?|A yellow dwarf|A red giant|A white dwarf|A neutron star
d|Which planet is the hottest?|Venus|Mercury|Mars|Jupiter|Venus has a thick atmosphere that traps heat.
d|The asteroid belt lies between which two planets?|Mars and Jupiter|Earth and Mars|Jupiter and Saturn|Venus and Earth
`,
  History: `
k|Who built the pyramids in Egypt?|Ancient Egyptians|Romans|Vikings|Aztecs
k|Who wore armour in the Middle Ages?|Knights|Astronauts|Farmers|Doctors
k|Which country is home to the Great Wall?|China|Japan|Egypt|India
k|What did the Vikings sail in?|Longships|Steam trains|Submarines|Balloons
k|Who was the first President of the USA?|George Washington|Abraham Lincoln|Thomas Jefferson|John Adams
k|Which famous clock tower is in London?|Big Ben|Eiffel Tower|Leaning Tower|Statue of Liberty
a|Which empire built the Colosseum?|The Roman Empire|The Greeks|The Ottomans|The Persians
a|In which year did the Titanic sink?|1912|1905|1920|1898
a|Who was the first emperor of Rome?|Augustus|Julius Caesar|Nero|Caligula
a|Which civilisation built Machu Picchu?|The Inca|The Aztec|The Maya|The Olmec
a|The Berlin Wall fell in which year?|1989|1991|1985|1979
a|Which queen of Egypt allied with Julius Caesar?|Cleopatra|Nefertiti|Hatshepsut|Boudicca
a|Which country gave the Statue of Liberty to the USA?|France|England|Spain|Germany
a|Who was the first person in space?|Yuri Gagarin|Neil Armstrong|Alan Shepard|John Glenn
a|Which war was fought from 1914 to 1918?|World War I|World War II|The Korean War|The Crimean War
a|Which South African leader was in prison for 27 years?|Nelson Mandela|Desmond Tutu|Steve Biko|Jacob Zuma
a|Who invented the telephone?|Alexander Graham Bell|Thomas Edison|Nikola Tesla|Guglielmo Marconi
a|Who sailed across the Atlantic to the Americas in 1492?|Christopher Columbus|Ferdinand Magellan|Vasco da Gama|James Cook
d|Which battle in 1066 changed English history?|Battle of Hastings|Waterloo|Agincourt|Bosworth
d|Who was the first Prime Minister of India?|Jawaharlal Nehru|Mahatma Gandhi|Indira Gandhi|Sardar Patel
d|Which empire was ruled by Mansa Musa?|The Mali Empire|The Songhai Empire|The Ghana Empire|The Ashanti Empire
d|In which year was the Magna Carta sealed?|1215|1066|1415|1688
d|Who became the first emperor of a unified China?|Qin Shi Huang|Kublai Khan|Sun Yat-sen|Liu Bang
d|The French Revolution began in which year?|1789|1776|1804|1815
d|Which treaty formally ended WWI with Germany?|Treaty of Versailles|Treaty of Paris|Treaty of Vienna|Treaty of Rome
d|Who led the Haitian Revolution?|Toussaint Louverture|Simón Bolívar|José Martí|Fidel Castro
d|In which year did the Ottomans capture Constantinople?|1453|1204|1526|1683
d|Who was nicknamed the Iron Lady?|Margaret Thatcher|Angela Merkel|Indira Gandhi|Golda Meir
d|The Industrial Revolution began in which country?|Britain|Germany|France|The USA
`,
  Geography: `
k|On which continent do we find lions in the wild?|Africa|Antarctica|Europe|Australia
k|What do we call a very large area of water with salt?|An ocean|A puddle|A pond|A stream
k|Which is the coldest continent?|Antarctica|Africa|Asia|Australia
k|What do we call land with water all around it?|An island|A mountain|A desert|A valley
k|What is a very tall hill called?|A mountain|A pond|A river|A beach
k|Which country is famous for the Eiffel Tower?|France|Italy|Egypt|Japan
k|Which continent is Egypt in?|Africa|Asia|Europe|South America
k|What is the capital of France?|Paris|Lyon|Marseille|Nice
k|What is the tallest mountain in the world?|Mount Everest|K2|Kilimanjaro|Mont Blanc
k|Which country is shaped like a boot?|Italy|Spain|Greece|Norway
k|Which is the biggest country in the world by area?|Russia|Canada|China|The USA
k|Which ocean lies between Africa and Australia?|The Indian Ocean|The Atlantic|The Arctic|The Pacific
a|What is the capital of Japan?|Tokyo|Kyoto|Osaka|Seoul
a|What is the capital of Canada?|Ottawa|Toronto|Vancouver|Montreal
a|What is the capital of Brazil?|Brasília|Rio de Janeiro|São Paulo|Salvador
a|Which river flows through London?|The Thames|The Seine|The Danube|The Rhine
a|What is the smallest country in the world?|Vatican City|Monaco|San Marino|Liechtenstein
a|Mount Kilimanjaro is in which country?|Tanzania|Kenya|Uganda|Ethiopia
a|Which country has the largest population today?|India|China|The USA|Indonesia
a|Which sea lies between Europe and Africa?|The Mediterranean|The Red Sea|The Black Sea|The Baltic
a|The Amazon River is on which continent?|South America|Africa|Asia|North America
a|Which country is in both Europe and Asia?|Turkey|Poland|Norway|Portugal
a|What is the capital of Spain?|Madrid|Barcelona|Seville|Valencia
d|What is the capital of New Zealand?|Wellington|Auckland|Christchurch|Hamilton
d|Which country has the most time zones, counting overseas territories?|France|Russia|The USA|China
d|What is the capital of Turkey?|Ankara|Istanbul|Izmir|Bursa
d|Which is the longest mountain range on land?|The Andes|The Himalayas|The Rockies|The Alps
d|Which is the driest continent?|Antarctica|Africa|Australia|Asia
d|Lake Baikal is in which country?|Russia|Mongolia|Kazakhstan|China
d|What is the capital of Pakistan?|Islamabad|Karachi|Lahore|Rawalpindi
d|What is the largest island in the world?|Greenland|Borneo|Madagascar|New Guinea
d|What is the capital of Argentina?|Buenos Aires|Santiago|Lima|Montevideo
`,
  Sports: `
k|In which sport do you kick a ball into a goal?|Football|Swimming|Tennis|Boxing
k|Which sport is played in a pool?|Swimming|Rugby|Golf|Cricket
k|How many players are in a basketball team on court?|5|11|7|3
k|Which sport uses a net and a shuttlecock?|Badminton|Football|Rugby|Golf
k|How many players from one team are on a football pitch at once?|11|9|10|12
k|Which sport is played at Wimbledon?|Tennis|Golf|Cricket|Rugby
k|How many rings are on the Olympic flag?|5|4|6|7
k|What do you use to hit the ball in baseball?|A bat|A racket|A stick|A club
k|Which sport uses a hoop and a ball you bounce?|Basketball|Golf|Swimming|Boxing
k|In which sport do you swim, cycle and run in one race?|Triathlon|Rugby|Bowling|Archery
a|Which country hosted the 2010 FIFA World Cup?|South Africa|Brazil|Germany|Qatar
a|Which country has won the most men's football World Cups?|Brazil|Germany|Italy|Argentina
a|In basketball, how many points is a shot from behind the arc?|3|2|4|1
a|Which athlete is nicknamed "Lightning Bolt"?|Usain Bolt|Michael Johnson|Carl Lewis|Tyson Gay
a|Who won the 2022 FIFA World Cup?|Argentina|France|Croatia|Brazil
a|How long is a marathon?|42.195 km|21 km|50 km|30 km
a|Which sport uses a shuttlecock?|Badminton|Tennis|Squash|Table tennis
a|Ghana's Black Stars reached the World Cup quarter-finals in which year?|2010|2006|2014|2022|They were a penalty away from the semi-finals.
a|Which boxer called himself "The Greatest"?|Muhammad Ali|Mike Tyson|Joe Frazier|George Foreman
d|Which country invented cricket?|England|Australia|India|The West Indies
d|How many Grand Slam tennis tournaments are played each year?|4|3|5|6
d|Who has won the most Ballon d'Or awards?|Lionel Messi|Cristiano Ronaldo|Michel Platini|Johan Cruyff
d|Which city hosted the 2016 Summer Olympics?|Rio de Janeiro|London|Tokyo|Beijing
d|How many players are on a rugby union team?|15|11|13|9
d|Who scored the famous "Hand of God" goal?|Diego Maradona|Pelé|Zinedine Zidane|Ronaldo
d|Which country won the first FIFA World Cup in 1930?|Uruguay|Brazil|Argentina|Italy
d|Which sport is the Tour de France?|Cycling|Running|Motor racing|Sailing
`,
  Music: `
k|Which instrument do you blow to make music?|Flute|Drum|Piano|Guitar
k|What do we call people who sing together?|A choir|A team|A crowd|A class
k|Which instrument is played with a bow?|Violin|Drum|Trumpet|Piano
k|What is another word for a drum beat pattern?|Rhythm|Colour|Taste|Shape
k|How many strings does a standard guitar have?|6|4|8|5
k|Which instrument has black and white keys?|Piano|Drum|Flute|Violin
k|Which instrument do you hit with sticks?|Drum|Guitar|Piano|Flute
k|How many notes are in do, re, mi, fa, sol, la, ti?|7|5|6|9
a|Which music style began in Ghana in the early 1900s?|Highlife|Afrobeat|Jùjú|Kwaito
a|Who is known as the King of Pop?|Michael Jackson|Elvis Presley|Prince|Justin Bieber
a|Which Nigerian musician pioneered Afrobeat?|Fela Kuti|King Sunny Adé|Burna Boy|Femi Kuti
a|How many members were in The Beatles?|4|3|5|6
a|How many keys does a full piano have?|88|76|66|100
a|Who sang the 2010 World Cup song "Waka Waka"?|Shakira|Rihanna|Beyoncé|Adele
a|Sarkodie is best known for which music style?|Hip hop|Reggae|Gospel|Classical
d|Who composed "The Four Seasons"?|Vivaldi|Bach|Mozart|Beethoven
d|Which composer continued to write music after going deaf?|Beethoven|Mozart|Bach|Chopin
d|Which band recorded "Bohemian Rhapsody"?|Queen|The Rolling Stones|Led Zeppelin|Pink Floyd
d|How many strings does a violin have?|4|5|6|3
d|Who is known as the Queen of Soul?|Aretha Franklin|Diana Ross|Whitney Houston|Tina Turner
d|Who recorded "Redemption Song"?|Bob Marley|Peter Tosh|Jimmy Cliff|Burning Spear
d|Which highlife legend was called the "King of Highlife"?|E.T. Mensah|Fela Kuti|Osibisa|King Bruce|E.T. Mensah led the Tempos band.
`,
  "Movies & TV": `
k|Which movie is about a girl who falls down a rabbit hole?|Alice in Wonderland|Frozen|Moana|Cinderella
k|Which cartoon mouse is Disney's most famous?|Mickey Mouse|Jerry|Stuart Little|Speedy
k|In which movie is there a lion cub called Simba?|The Lion King|Madagascar|The Jungle Book|Tarzan
k|What is the snowman called in Frozen?|Olaf|Sven|Kristoff|Hans
k|Who lives in a pineapple under the sea?|SpongeBob SquarePants|Patrick Star|Squidward|Nemo
k|Which little clownfish gets lost in a Pixar movie?|Nemo|Bruce|Gill|Crush
k|What colour is Shrek?|Green|Blue|Orange|Purple
k|Who is the toy cowboy in Toy Story?|Woody|Buzz|Rex|Slinky
a|Who directed Jurassic Park?|Steven Spielberg|James Cameron|George Lucas|Ridley Scott
a|Which film has the line "May the Force be with you"?|Star Wars|Star Trek|Avatar|Dune
a|Which Marvel hero carries a hammer?|Thor|Iron Man|The Hulk|Black Widow
a|What is Black Panther's home country called?|Wakanda|Zamunda|Genovia|Latveria
a|Who played Jack in the movie Titanic?|Leonardo DiCaprio|Brad Pitt|Tom Cruise|Matt Damon
d|Which film won Best Picture at the 2020 Oscars?|Parasite|1917|Joker|Ford v Ferrari|It was the first non-English-language film to win.
d|Nollywood is the film industry of which country?|Nigeria|Ghana|Kenya|South Africa
d|Who directed Pulp Fiction?|Quentin Tarantino|Martin Scorsese|Christopher Nolan|David Fincher
d|Who played the Joker in The Dark Knight?|Heath Ledger|Joaquin Phoenix|Jared Leto|Jack Nicholson
d|Which studio made Spirited Away?|Studio Ghibli|Pixar|DreamWorks|Disney
d|Which country makes the most films each year?|India|Nigeria|The USA|China
`,
  Food: `
k|Which fruit is red and often has a green leaf on top?|Strawberry|Banana|Lemon|Coconut
k|Which food is made from milk and comes in blocks?|Cheese|Bread|Rice|Sugar
k|What do we call a cold sweet treat that melts in the sun?|Ice cream|Bread|Soup|Rice
k|Which vegetable is orange and rabbits love?|Carrot|Onion|Lettuce|Peas
k|What do we get from a cow?|Milk|Honey|Eggs|Wool
k|Which fruit is green outside and red inside with black seeds?|Watermelon|Lime|Kiwi|Avocado
k|What do hens give us?|Eggs|Milk|Honey|Bread
k|Which fruit is yellow and curved?|Banana|Lemon|Corn|Mango
k|Which insect helps make honey?|Bee|Ant|Fly|Beetle
k|Which vegetable can make you cry when you cut it?|Onion|Carrot|Potato|Pea
k|A dried grape is called a…|Raisin|Prune|Date|Fig
k|Which fruit has its seeds on the outside?|Strawberry|Apple|Banana|Grape
k|What is bread mainly made from?|Flour|Sugar|Rice|Salt
a|Which country did sushi come from?|Japan|China|Thailand|Korea
a|What is the main ingredient in guacamole?|Avocado|Tomato|Pepper|Onion
a|Which expensive spice comes from the crocus flower?|Saffron|Turmeric|Paprika|Cinnamon
a|What is tofu made from?|Soybeans|Rice|Wheat|Corn
a|Which nut is used to make marzipan?|Almond|Cashew|Peanut|Walnut
a|Which gas makes bread dough rise?|Carbon dioxide|Oxygen|Nitrogen|Helium|Yeast makes it as it feeds.
a|Which West African dish is rice cooked in a tomato sauce?|Jollof rice|Egusi soup|Fufu|Banku
d|Which country does feta cheese come from?|Greece|Italy|France|Turkey
d|Prunes are dried…|Plums|Grapes|Figs|Apricots
d|Which pepper family is measured on the Scoville scale?|Chilli peppers|Bell peppers|Black pepper|Sichuan pepper
d|Cocoa beans grow on which tree?|Cacao|Coffee|Kola|Palm
d|Which West African country grows the most cocoa?|Côte d'Ivoire|Ghana|Nigeria|Cameroon|Ghana is usually second.
d|Which spice is the dried bark of a tree?|Cinnamon|Nutmeg|Clove|Ginger
`,
  Technology: `
k|What do you use to type on a computer?|A keyboard|A mouse|A screen|A speaker
k|What does a computer mouse do?|Moves the pointer|Plays music|Prints paper|Charges a phone
k|Which of these is a web browser?|Chrome|Excel|Photoshop|Word
k|What do you call a program on your phone?|An app|A bug|A cable|A charger
a|What does CPU stand for?|Central Processing Unit|Computer Personal Unit|Central Program Utility|Core Power Unit
a|Who co-founded Microsoft with Bill Gates?|Paul Allen|Steve Jobs|Larry Page|Tim Berners-Lee
a|What does "www" stand for?|World Wide Web|Wide Web World|Web Wide World|World Web Wire
a|Which company makes the iPhone?|Apple|Samsung|Google|Nokia
a|What does USB stand for?|Universal Serial Bus|Ultra Speed Bus|United System Bus|Universal Signal Box
a|How many bits are in a byte?|8|4|16|10
d|Who invented the World Wide Web?|Tim Berners-Lee|Bill Gates|Vint Cerf|Steve Jobs
d|What does HTTP stand for?|HyperText Transfer Protocol|High Tech Transfer Program|HyperText Transmission Process|Home Tool Transfer Protocol
d|What was the first widely used graphical web browser (1993)?|Mosaic|Netscape|Internet Explorer|Firefox
d|What is 5 in binary?|101|110|011|111
d|What does AI stand for?|Artificial Intelligence|Automatic Internet|Advanced Interface|Applied Ideas
d|Which language is used to style web pages?|CSS|Python|SQL|Java
d|In which year was the first iPhone released?|2007|2004|2010|2001
d|Who founded SpaceX?|Elon Musk|Jeff Bezos|Richard Branson|Bill Gates
`,
  Maths: `
k|What is 5 + 7?|12|11|13|10
k|What is 9 × 3?|27|24|36|21
k|How many minutes are in one hour?|60|100|30|90
k|What is half of 20?|10|5|15|4
k|How many sides does a hexagon have?|6|5|8|7
k|Which of these is an even number?|14|9|11|7
k|What is 100 − 1?|99|101|90|89
k|How many days are in a week?|7|5|6|8
a|What is 15% of 200?|30|15|20|25
a|What is the square root of 81?|9|8|7|11
a|What is 7 × 8?|56|54|48|64
a|How many degrees are in a full circle?|360|180|90|270
a|What is the next prime number after 7?|11|9|10|13
a|What is 2 to the power of 5?|32|16|64|25
a|What is the perimeter of a square with sides of 5?|20|25|10|15
a|How many sides does an octagon have?|8|6|10|7
d|What is pi to two decimal places?|3.14|3.41|3.12|2.71
d|What do the angles in a triangle add up to?|180 degrees|90 degrees|360 degrees|270 degrees
d|What is 13 × 13?|169|156|163|196
d|What is 0.25 as a fraction?|1/4|1/2|1/5|2/5
d|In the Fibonacci sequence 1, 1, 2, 3, 5, what comes next?|8|7|9|6
d|How many prime numbers are there between 1 and 20?|8|7|9|10|They are 2, 3, 5, 7, 11, 13, 17 and 19.
d|What is the Roman numeral for 50?|L|C|D|X
d|What is 1000 divided by 8?|125|120|150|100
`,
  "Art & Books": `
k|Who wrote the Harry Potter books?|J.K. Rowling|Roald Dahl|Dr. Seuss|Enid Blyton
k|What are the three primary colours?|Red, yellow and blue|Red, green and orange|Pink, purple and brown|Black, white and grey
k|Which fairy tale girl wore a red hood?|Little Red Riding Hood|Cinderella|Snow White|Goldilocks
k|Which puppet's nose grows when he lies?|Pinocchio|Peter Pan|Aladdin|Hansel
a|Who painted The Starry Night?|Vincent van Gogh|Claude Monet|Pablo Picasso|Salvador Dalí
a|Who wrote the novel 1984?|George Orwell|Aldous Huxley|Ray Bradbury|H.G. Wells
a|Who wrote Things Fall Apart?|Chinua Achebe|Wole Soyinka|Ngũgĩ wa Thiong'o|Ama Ata Aidoo
a|Who painted the ceiling of the Sistine Chapel?|Michelangelo|Raphael|Leonardo da Vinci|Botticelli
a|Which book series features the lion Aslan?|The Chronicles of Narnia|Harry Potter|The Lord of the Rings|Percy Jackson
d|Who wrote Pride and Prejudice?|Jane Austen|Charlotte Brontë|George Eliot|Emily Brontë
d|Who painted Guernica?|Pablo Picasso|Salvador Dalí|Joan Miró|Diego Rivera
d|Who wrote One Hundred Years of Solitude?|Gabriel García Márquez|Jorge Luis Borges|Isabel Allende|Mario Vargas Llosa
d|Which Nigerian author won the 1986 Nobel Prize in Literature?|Wole Soyinka|Chinua Achebe|Ben Okri|Chimamanda Adichie
d|Who wrote Half of a Yellow Sun?|Chimamanda Ngozi Adichie|Buchi Emecheta|Ama Ata Aidoo|Nadine Gordimer
d|Who wrote Don Quixote?|Miguel de Cervantes|Lope de Vega|Federico García Lorca|Dante
d|Which art movement is Claude Monet linked with?|Impressionism|Cubism|Surrealism|Baroque
`,
  Words: `
k|What is the opposite of "up"?|Down|Over|Under|Near
k|What is the opposite of "day"?|Night|Noon|Morning|Week
k|Which word rhymes with "cat"?|Hat|Dog|Cup|Sun
k|Which word rhymes with "sun"?|Fun|Moon|Star|Cloud
k|What is the first letter of the alphabet?|A|B|Z|M
k|What is the plural of "mouse"?|Mice|Mouses|Meece|Mousies
k|What is the opposite of "happy"?|Sad|Glad|Funny|Kind
k|Which of these is a verb?|Jump|Table|Green|Slowly
k|What is the opposite of "hot"?|Cold|Warm|Wet|Big
k|How many letters are in the English alphabet?|26|24|28|20
k|Which word means the same as "big"?|Large|Tiny|Thin|Short
k|Which of these is a noun?|Table|Run|Quickly|Beautiful
a|A word with the same meaning as another is called a…|Synonym|Antonym|Homonym|Acronym
a|What is the plural of "child"?|Children|Childs|Childes|Childrens
a|Which language do people speak in Brazil?|Portuguese|Spanish|French|English
a|"Bonjour" means hello in which language?|French|Italian|Spanish|German
a|"Habari" is a greeting in which language?|Swahili|Zulu|Twi|Hausa
d|How many official languages does South Africa have?|11|3|9|5
d|A word that reads the same backwards is called a…|Palindrome|Anagram|Acronym|Homophone
d|Which language has the most speakers as a second language?|English|French|Spanish|Arabic
d|What does the Latin phrase "carpe diem" mean?|Seize the day|Time flies|Live and learn|Peace at last
d|Twi belongs to which language family?|Niger–Congo|Afroasiatic|Nilo-Saharan|Khoisan
`,
};

const EXTRA_GHANA_AFRICA = {
  Ghana: `
k|What is the name of Ghana's national football team?|The Black Stars|The Super Eagles|The Lions|The Pharaohs
k|Which colour is at the top of Ghana's flag?|Red|Green|Gold|Blue
k|Which colour is at the bottom of Ghana's flag?|Green|Red|Blue|White
k|What is the name of the famous Ghanaian cloth woven in bright colours?|Kente|Denim|Wool|Silk
k|Which meal is made by pounding cassava and plantain?|Fufu|Pizza|Pasta|Noodles
k|Which city is Ghana's capital?|Accra|Kumasi|Tamale|Ho
k|What does "Medaase" mean in Twi?|Thank you|Good morning|Goodbye|Please
k|What is the popular street food of fried plantain and pepper?|Kelewele|Burger|Hot dog|Pizza
k|Which ocean lies south of Ghana?|The Atlantic Ocean|The Indian Ocean|The Arctic Ocean|The Pacific Ocean
k|Which dish is rice cooked in a spicy tomato stew?|Jollof rice|Banku|Kenkey|Fufu
k|Banku is mainly made from…|Fermented corn and cassava dough|Wheat|Potatoes|Rice
k|Which language do many people in Ashanti speak?|Twi|Ga|Ewe|Hausa
a|Which port city near Accra is Ghana's main harbour?|Tema|Takoradi|Cape Coast|Sekondi
a|Which footballer won African Footballer of the Year three times in the 1990s?|Abedi Pele|Michael Essien|Asamoah Gyan|Samuel Eto'o
a|Which people celebrate the Hogbetsotso festival?|The Anlo-Ewe|The Ga|The Ashanti|The Dagomba
a|The king of the Ashanti is called the…|Asantehene|Ooni|Kabaka|Oba
d|Who wrote the novel Our Sister Killjoy?|Ama Ata Aidoo|Ayi Kwei Armah|Efua Sutherland|Kofi Awoonor
d|What is the sacred golden symbol of the Ashanti nation?|The Golden Stool|The Golden Sword|The Golden Drum|The Golden Crown
d|In which year did Ghana become a republic?|1960|1957|1966|1979
d|Who wrote The Beautyful Ones Are Not Yet Born?|Ayi Kwei Armah|Chinua Achebe|Ngũgĩ wa Thiong'o|Wole Soyinka
`,
  Africa: `
k|Which animal is the largest on land and lives in Africa?|African elephant|Rhino|Hippo|Giraffe
k|Which African animal has a very long neck?|Giraffe|Zebra|Lion|Hyena
k|Which continent is Ghana in?|Africa|Asia|Europe|Australia
k|Which big cat lives in the African savanna in groups?|Lion|Tiger|Jaguar|Snow leopard
k|What do we call the huge sandy desert in North Africa?|The Sahara|The Gobi|The Outback|The Arctic
k|Which African river is the longest in the world?|The Nile|The Volta|The Amazon|The Thames
k|About how many countries are in Africa?|54|30|72|15
k|Which African animal has black and white stripes?|Zebra|Lion|Elephant|Giraffe
k|What is the biggest desert in Africa?|The Sahara|The Kalahari|The Namib|The Gobi
k|Which river flows through Egypt?|The Nile|The Volta|The Congo|The Niger
k|What is the highest mountain in Africa?|Mount Kilimanjaro|Mount Kenya|Mount Everest|Mount Elgon
a|What is the capital of Kenya?|Nairobi|Mombasa|Kampala|Dodoma
a|What is the capital of Nigeria?|Abuja|Lagos|Kano|Ibadan
a|Which African country has the most people?|Nigeria|Ethiopia|Egypt|South Africa
a|What is the capital of Egypt?|Cairo|Alexandria|Giza|Luxor
a|Which city is the executive capital of South Africa?|Pretoria|Cape Town|Johannesburg|Durban
a|Victoria Falls lies between Zambia and which other country?|Zimbabwe|Namibia|Botswana|Tanzania
a|Which is Africa's largest lake?|Lake Victoria|Lake Tanganyika|Lake Malawi|Lake Chad
a|What is the capital of Senegal?|Dakar|Abidjan|Bamako|Conakry
a|What is the capital of Ethiopia?|Addis Ababa|Asmara|Nairobi|Khartoum
d|Which of these countries has no coastline?|Uganda|Kenya|Tanzania|Ghana
d|Who was the first President of Kenya?|Jomo Kenyatta|Julius Nyerere|Kenneth Kaunda|Daniel arap Moi
d|Who was the first President of Nigeria?|Nnamdi Azikiwe|Obafemi Awolowo|Tafawa Balewa|Olusegun Obasanjo
d|Which country was once called Southern Rhodesia?|Zimbabwe|Zambia|Malawi|Botswana
d|The ancient kingdom of Aksum was in which modern country?|Ethiopia|Mali|Ghana|Angola
d|Which country has more pyramids than Egypt?|Sudan|Libya|Ethiopia|Chad|Sudan has over 200 Nubian pyramids.
d|Timbuktu is in which country?|Mali|Niger|Mauritania|Chad
`,
};

const LEVEL = { k: "kids", a: "all", d: "adults" };
function parse(raw, topic) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [l, q, ...rest] = line.split("|");
      const answers = rest.slice(0, 4);
      const why = rest[4];
      return { c: topic, l: LEVEL[l], q, a: answers, ...(why ? { why } : {}) };
    });
}

export const MORE_QUESTIONS = [
  ...Object.entries(RAW).flatMap(([topic, raw]) => parse(raw, topic)),
  ...Object.entries(EXTRA_GHANA_AFRICA).flatMap(([topic, raw]) => parse(raw, topic)),
];
export const TOPICS = ["Ghana", "Africa", "World", ...Object.keys(RAW)];
