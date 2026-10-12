// Grammar & Words: five topics of question rounds (topics.js, from the word banks in data.js) on the shared learning kit.
import { createLearn } from "../../assets/learn-kit.js";
import { TOPICS } from "./topics.js";

createLearn({ root: document.getElementById("app"), bar: document.getElementById("bar"), key: "zone210_grammar", prefix: "zone210-gram-", topics: TOPICS });
