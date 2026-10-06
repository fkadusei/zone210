/**
 * Question bank. The FIRST answer in each `a` array is the correct one; the game shuffles them.
 * c = topic ("Africa" | "World")
 * l = level: "kids" (ages ~5-10), "all" (family), "adults"
 * why = optional short explanation shown after answering
 */
export const QUESTIONS = [

  // --------------------------------------------------------------- Africa
  { c: "Africa", l: "kids", q: "What is the longest river in Africa?", a: ["The Nile", "The Congo", "The Niger", "The Zambezi"] },
  { c: "Africa", l: "kids", q: "Which is the biggest hot desert in the world?", a: ["The Sahara", "The Kalahari", "The Namib", "The Gobi"] },
  { c: "Africa", l: "kids", q: "Which animal is the tallest in the world?", a: ["Giraffe", "Elephant", "Lion", "Zebra"] },
  { c: "Africa", l: "kids", q: "Which animal is the fastest on land?", a: ["Cheetah", "Lion", "Horse", "Rhino"] },
  { c: "Africa", l: "kids", q: "Which big cat is known as the “king of the jungle”?", a: ["Lion", "Leopard", "Cheetah", "Tiger"] },
  { c: "Africa", l: "kids", q: "Which is the biggest land animal?", a: ["African elephant", "Hippo", "Giraffe", "Rhino"] },
  { c: "Africa", l: "all", q: "What is the highest mountain in Africa?", a: ["Mount Kilimanjaro", "Mount Kenya", "Mount Stanley", "Mount Elgon"] },
  { c: "Africa", l: "all", q: "What is the capital of Kenya?", a: ["Nairobi", "Mombasa", "Kampala", "Dodoma"] },
  { c: "Africa", l: "all", q: "What is the capital of Nigeria?", a: ["Abuja", "Lagos", "Kano", "Ibadan"] },
  { c: "Africa", l: "all", q: "What is the capital of Egypt?", a: ["Cairo", "Alexandria", "Giza", "Luxor"] },
  { c: "Africa", l: "all", q: "Which is the most populous country in Africa?", a: ["Nigeria", "Ethiopia", "Egypt", "South Africa"] },
  { c: "Africa", l: "all", q: "The historic city of Timbuktu is in which country?", a: ["Mali", "Niger", "Chad", "Senegal"] },
  { c: "Africa", l: "all", q: "Victoria Falls lies on the border of which two countries?", a: ["Zambia and Zimbabwe", "Kenya and Tanzania", "Angola and Namibia", "Uganda and Rwanda"] },
  { c: "Africa", l: "all", q: "Which large island country lies off Africa's south-east coast?", a: ["Madagascar", "Sri Lanka", "Cuba", "Iceland"] },
  { c: "Africa", l: "all", q: "Nelson Mandela became president of which country?", a: ["South Africa", "Kenya", "Zimbabwe", "Namibia"] },
  { c: "Africa", l: "all", q: "Which sea lies along the north coast of Africa?", a: ["The Mediterranean Sea", "The Red Sea", "The Arabian Sea", "The Caspian Sea"] },
  { c: "Africa", l: "adults", q: "Which is the largest country in Africa by area?", a: ["Algeria", "DR Congo", "Sudan", "Libya"] },
  { c: "Africa", l: "adults", q: "The African Union has its headquarters in which city?", a: ["Addis Ababa", "Nairobi", "Accra", "Cairo"] },
  { c: "Africa", l: "adults", q: "What is the capital of Morocco?", a: ["Rabat", "Casablanca", "Marrakesh", "Tangier"] },
  { c: "Africa", l: "adults", q: "The Serengeti, famous for its wildebeest migration, is mostly in which country?", a: ["Tanzania", "Botswana", "Ghana", "Namibia"] },
  { c: "Africa", l: "adults", q: "What is the currency of South Africa?", a: ["The rand", "The naira", "The cedi", "The shilling"] },
  { c: "Africa", l: "adults", q: "Which African lake is the largest by area?", a: ["Lake Victoria", "Lake Tanganyika", "Lake Malawi", "Lake Chad"] },

  // ---------------------------------------------------------------- World
  { c: "World", l: "kids", q: "How many days are there in a week?", a: ["7", "5", "6", "10"] },
  { c: "World", l: "kids", q: "What colour do you get by mixing blue and yellow?", a: ["Green", "Purple", "Orange", "Brown"] },
  { c: "World", l: "kids", q: "Which planet is called the Red Planet?", a: ["Mars", "Venus", "Jupiter", "Saturn"] },
  { c: "World", l: "kids", q: "How many legs does a spider have?", a: ["8", "6", "10", "4"] },
  { c: "World", l: "kids", q: "What do bees make?", a: ["Honey", "Milk", "Butter", "Jam"] },
  { c: "World", l: "kids", q: "How many sides does a triangle have?", a: ["3", "4", "5", "6"] },
  { c: "World", l: "kids", q: "How many colours are in a rainbow?", a: ["7", "5", "6", "9"] },
  { c: "World", l: "kids", q: "Which animal says “moo”?", a: ["Cow", "Sheep", "Duck", "Dog"] },
  { c: "World", l: "kids", q: "Which is the biggest planet in our solar system?", a: ["Jupiter", "Earth", "Mars", "Neptune"] },
  { c: "World", l: "kids", q: "What do plants need to grow, besides soil?", a: ["Water and sunlight", "Sugar and salt", "Music", "Plastic"] },
  { c: "World", l: "kids", q: "How many months are there in a year?", a: ["12", "10", "11", "13"] },
  { c: "World", l: "kids", q: "Which is the biggest animal in the ocean?", a: ["Blue whale", "Shark", "Octopus", "Dolphin"] },
  { c: "World", l: "all", q: "Which is the largest ocean?", a: ["The Pacific", "The Atlantic", "The Indian", "The Arctic"] },
  { c: "World", l: "all", q: "How many continents are there?", a: ["7", "5", "6", "8"] },
  { c: "World", l: "all", q: "Which gas do plants take in from the air?", a: ["Carbon dioxide", "Oxygen", "Nitrogen", "Helium"] },
  { c: "World", l: "all", q: "What is the largest organ of the human body?", a: ["The skin", "The liver", "The brain", "The heart"] },
  { c: "World", l: "all", q: "Which planet is closest to the Sun?", a: ["Mercury", "Venus", "Earth", "Mars"] },
  { c: "World", l: "all", q: "What is 12 × 12?", a: ["144", "124", "132", "148"] },
  { c: "World", l: "all", q: "Who painted the Mona Lisa?", a: ["Leonardo da Vinci", "Michelangelo", "Vincent van Gogh", "Pablo Picasso"] },
  { c: "World", l: "all", q: "At what temperature does water boil at sea level?", a: ["100 °C", "90 °C", "80 °C", "120 °C"] },
  { c: "World", l: "adults", q: "What is the chemical symbol for gold?", a: ["Au", "Ag", "Gd", "Go"] },
  { c: "World", l: "adults", q: "In which year did the Second World War end?", a: ["1945", "1939", "1950", "1918"] },
  { c: "World", l: "adults", q: "Who wrote “Romeo and Juliet”?", a: ["William Shakespeare", "Charles Dickens", "Jane Austen", "Chinua Achebe"] },
  { c: "World", l: "adults", q: "What is the capital of Australia?", a: ["Canberra", "Sydney", "Melbourne", "Perth"] },
  { c: "World", l: "adults", q: "Roughly how fast does light travel?", a: ["300,000 km per second", "3,000 km per second", "30,000 km per second", "3 million km per second"] },
  { c: "World", l: "adults", q: "Which element has the atomic number 1?", a: ["Hydrogen", "Helium", "Oxygen", "Carbon"] },
  { c: "World", l: "adults", q: "How many bones are in an adult human body?", a: ["206", "186", "226", "256"] },
  { c: "World", l: "adults", q: "Who developed the theory of general relativity?", a: ["Albert Einstein", "Isaac Newton", "Niels Bohr", "Galileo Galilei"] },
  { c: "World", l: "adults", q: "The Great Barrier Reef lies off the coast of which country?", a: ["Australia", "Brazil", "Indonesia", "Mexico"] },
  { c: "World", l: "adults", q: "Which language has the most native speakers worldwide?", a: ["Mandarin Chinese", "English", "Spanish", "Hindi"] },
];
