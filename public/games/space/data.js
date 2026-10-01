/**
 * Space Explorer facts. Sizes in km, distances in million km (mean distance from the Sun), periods in Earth days.
 * Figures are rounded values from NASA's planetary fact sheets.
 */
export const SUN = {
  id: "sun", name: "The Sun", nick: "Our star", color: "#ffb52e", diameter: 1392700, type: "Star",
  facts: [
    "The Sun holds 99.8% of all the mass in the solar system.",
    "About 1.3 million Earths could fit inside the Sun.",
    "Its surface is about 5,500 °C and its core is around 15 million °C.",
    "Sunlight takes 8 minutes and 20 seconds to reach Earth.",
    "The Sun is about 4.6 billion years old and is roughly halfway through its life.",
  ],
};

export const PLANETS = [
  {
    id: "mercury", name: "Mercury", nick: "The Swift Planet", color: "#a79d94", type: "Rocky planet",
    diameter: 4879, dist: 57.9, au: 0.39, year: 88, dayText: "59 Earth days to spin once", gravity: 3.7, temp: "−180 °C to 430 °C", moonsText: "0 moons",
    tilt: 0.03,
    facts: [
      "Mercury is the smallest planet and the closest to the Sun.",
      "It zooms around the Sun in just 88 days, faster than any other planet.",
      "It has almost no air, so it swings from freezing nights to scorching days.",
      "Its surface is covered with craters, a bit like our Moon.",
    ],
    moons: [],
  },
  {
    id: "venus", name: "Venus", nick: "The Morning Star", color: "#e6c27a", type: "Rocky planet",
    diameter: 12104, dist: 108.2, au: 0.72, year: 224.7, dayText: "243 Earth days to spin once (backwards!)", gravity: 8.87, temp: "About 465 °C", moonsText: "0 moons",
    tilt: 3.1,
    facts: [
      "Venus is the hottest planet, hotter even than Mercury, because thick clouds trap heat.",
      "It spins the opposite way to most planets, so the Sun rises in the west.",
      "A day on Venus is longer than its year.",
      "It is the brightest planet in our night sky.",
    ],
    moons: [],
  },
  {
    id: "earth", name: "Earth", nick: "The Blue Planet", color: "#3d7be0", type: "Rocky planet",
    diameter: 12756, dist: 149.6, au: 1, year: 365.25, dayText: "24 hours", gravity: 9.8, temp: "About 15 °C on average", moonsText: "1 moon",
    tilt: 0.41,
    facts: [
      "Earth is the only place we know of with life.",
      "About 71% of its surface is covered by water.",
      "It is the densest planet in the solar system.",
      "Earth travels around the Sun at about 107,000 km per hour.",
    ],
    moons: [
      { id: "moon", name: "The Moon", diameter: 3474, dist: 0.3844, period: 27.3, color: "#c9c9c9", fact: "The Moon is moving away from Earth by about 3.8 cm every year. Its pull makes the ocean tides." },
    ],
  },
  {
    id: "mars", name: "Mars", nick: "The Red Planet", color: "#c1572d", type: "Rocky planet",
    diameter: 6792, dist: 227.9, au: 1.52, year: 687, dayText: "24 hours 37 minutes", gravity: 3.71, temp: "About −65 °C", moonsText: "2 moons",
    tilt: 0.44,
    facts: [
      "Mars looks red because its dust is rusty iron.",
      "Olympus Mons on Mars is the tallest volcano we know, about three times the height of Mount Everest.",
      "Robots called rovers are exploring the surface right now.",
      "A year on Mars lasts almost two Earth years.",
    ],
    moons: [
      { id: "phobos", name: "Phobos", diameter: 22, dist: 0.009376, period: 0.32, color: "#8c7f73", fact: "Phobos circles Mars three times a day, and it is slowly drifting closer to the planet." },
      { id: "deimos", name: "Deimos", diameter: 12, dist: 0.02346, period: 1.26, color: "#a39485", fact: "Deimos is one of the smallest moons known, only about 12 km across." },
    ],
  },
  {
    id: "jupiter", name: "Jupiter", nick: "The Giant", color: "#d8b48a", type: "Gas giant",
    diameter: 142984, dist: 778.5, au: 5.2, year: 4333, dayText: "9 hours 56 minutes", gravity: 24.79, temp: "About −110 °C (cloud tops)", moonsText: "95 or more moons",
    tilt: 0.05,
    facts: [
      "Jupiter is bigger than all the other planets put together.",
      "The Great Red Spot is a storm that is wider than Earth and has raged for hundreds of years.",
      "It spins faster than any other planet: a day lasts under 10 hours.",
      "Jupiter is a ball of gas, so there is no surface to stand on.",
    ],
    moons: [
      { id: "io", name: "Io", diameter: 3643, dist: 0.4217, period: 1.77, color: "#e5d27a", fact: "Io has hundreds of volcanoes and is the most volcanic place in the solar system." },
      { id: "europa", name: "Europa", diameter: 3122, dist: 0.671, period: 3.55, color: "#d9cdb8", fact: "Europa has an ocean of salty water hidden under its ice, and scientists wonder if life could live there." },
      { id: "ganymede", name: "Ganymede", diameter: 5268, dist: 1.07, period: 7.15, color: "#9a8f84", fact: "Ganymede is the biggest moon in the solar system, even bigger than the planet Mercury." },
      { id: "callisto", name: "Callisto", diameter: 4821, dist: 1.883, period: 16.7, color: "#6f665e", fact: "Callisto is covered with so many craters that it is one of the oldest-looking surfaces we know." },
    ],
  },
  {
    id: "saturn", name: "Saturn", nick: "The Ringed Planet", color: "#e3cd97", type: "Gas giant",
    diameter: 120536, dist: 1434, au: 9.58, year: 10759, dayText: "10 hours 34 minutes", gravity: 10.44, temp: "About −140 °C (cloud tops)", moonsText: "More than 270 moons",
    tilt: 0.47, rings: true,
    facts: [
      "Saturn's rings are made of billions of pieces of ice and rock, from tiny grains to house-sized chunks.",
      "Saturn is so light for its size that it would float in a giant bathtub.",
      "The rings are huge but very thin, often only about 10 metres thick.",
      "A year on Saturn lasts almost 30 Earth years.",
    ],
    moons: [
      { id: "enceladus", name: "Enceladus", diameter: 504, dist: 0.238, period: 1.37, color: "#f0f4f8", fact: "Enceladus shoots fountains of icy water into space from cracks near its south pole." },
      { id: "titan", name: "Titan", diameter: 5150, dist: 1.222, period: 15.9, color: "#d7a64f", fact: "Titan has a thick orange atmosphere and lakes of liquid methane. A robot called Huygens landed there in 2005." },
    ],
  },
  {
    id: "uranus", name: "Uranus", nick: "The Sideways Planet", color: "#8fd8e0", type: "Ice giant",
    diameter: 51118, dist: 2871, au: 19.2, year: 30687, dayText: "17 hours 14 minutes (backwards)", gravity: 8.69, temp: "About −195 °C", moonsText: "28 or more moons",
    tilt: 1.71, rings: "faint",
    facts: [
      "Uranus is tipped on its side, so it rolls around the Sun like a ball.",
      "Each pole gets about 42 years of sunlight, then 42 years of darkness.",
      "It has faint rings and is a pale blue-green colour because of methane gas.",
      "Uranus was the first planet found with a telescope, in 1781.",
    ],
    moons: [
      { id: "miranda", name: "Miranda", diameter: 472, dist: 0.1299, period: 1.41, color: "#b8b8b8", fact: "Miranda has giant cliffs up to 20 km high, some of the tallest in the solar system." },
      { id: "titania", name: "Titania", diameter: 1578, dist: 0.4363, period: 8.7, color: "#a39a92", fact: "Titania is the biggest moon of Uranus and is named after the fairy queen in a Shakespeare play." },
    ],
  },
  {
    id: "neptune", name: "Neptune", nick: "The Windy Planet", color: "#3f5fd0", type: "Ice giant",
    diameter: 49528, dist: 4495, au: 30.05, year: 60190, dayText: "16 hours 6 minutes", gravity: 11.15, temp: "About −200 °C", moonsText: "16 moons",
    tilt: 0.49,
    facts: [
      "Neptune has the fastest winds in the solar system, over 2,000 km per hour.",
      "It is so far away that one Neptune year lasts about 165 Earth years.",
      "It was found using maths before anyone saw it with a telescope.",
      "Neptune's deep blue colour comes from methane in its air.",
    ],
    moons: [
      { id: "triton", name: "Triton", diameter: 2707, dist: 0.3548, period: 5.88, color: "#d5c9c0", fact: "Triton orbits backwards compared with Neptune's spin, so it was probably captured. It has ice geysers." },
    ],
  },
  {
    id: "pluto", name: "Pluto", nick: "The Dwarf Planet", color: "#c9ad95", type: "Dwarf planet",
    diameter: 2377, dist: 5906, au: 39.5, year: 90560, dayText: "6.4 Earth days", gravity: 0.62, temp: "About −225 °C", moonsText: "5 moons",
    tilt: 2.1,
    facts: [
      "Pluto was called the ninth planet until 2006, when it was reclassified as a dwarf planet.",
      "A heart-shaped plain of frozen nitrogen covers part of its surface.",
      "It would take one Pluto year, 248 Earth years, to go once around the Sun.",
      "The New Horizons probe flew past it in 2015 and sent back the first close-up photos.",
    ],
    moons: [
      { id: "charon", name: "Charon", diameter: 1212, dist: 0.0196, period: 6.39, color: "#8f8a86", fact: "Charon is so big compared with Pluto that the two circle a point in space between them." },
    ],
  },
];

/** Earth = 1. */
export const ratio = (p) => p.diameter / 12756;
