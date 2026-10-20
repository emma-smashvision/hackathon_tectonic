// Checks for "Pass it on" notes. Runs in the app (live chips) AND on the server
// (the server never trusts the client's result). A human reviewer still approves.

export interface NoteCheck {
  id: "length" | "names" | "amounts" | "places" | "contact";
  label: string;
  pass: boolean;
}

export const NOTE_MIN = 12;
export const NOTE_MAX = 160;

const FIRST_NAMES = [
  "lotte", "emma", "louise", "olivia", "noah", "liam", "lucas", "jules", "arthur", "louis", "mila", "elena",
  "sofie", "bram", "jens", "ann", "marc", "luc", "nadia", "peter", "tom", "yusuf", "elif", "wim", "kevin",
  "sarah", "julie", "thomas", "jan", "pieter", "koen", "els", "an", "mohamed", "fatima", "anna", "laura",
  "nina", "lisa", "maarten", "stijn", "ruben", "lars", "eva", "lena", "jonas", "victor", "marie", "sophie",
];

const PLACES = [
  "belgium", "belgië", "belgique", "brussels", "brussel", "bruxelles", "antwerp", "antwerpen", "gent", "ghent",
  "leuven", "brugge", "bruges", "mechelen", "hasselt", "kortrijk", "aalst", "charleroi", "liège", "liege",
  "namur", "namen", "mons", "turnhout", "genk", "oostende", "ostend", "lier", "sint-niklaas", "roeselare",
  "lisbon", "lisboa", "paris", "amsterdam", "limburg", "flanders", "vlaanderen", "wallonia",
];

const RELATIVE_NAME = /\b(my|mijn|ma|mon)\s+(wife|husband|son|daughter|partner|mother|father|mom|dad|vrouw|man|zoon|dochter|mama|papa)\s+[A-Z][a-z]+/;

export function checkNote(raw: string): NoteCheck[] {
  const text = raw.trim();
  const words = text.toLowerCase().split(/[^\p{L}-]+/u).filter(Boolean);
  const hasName = words.some((w) => FIRST_NAMES.includes(w)) || RELATIVE_NAME.test(text);
  const hasPlace = words.some((w) => PLACES.includes(w));
  const hasAmount = /€|\beur(o|os)?\b|\d/i.test(text);
  const hasContact = /(https?:\/\/|www\.|@|\+?\d[\d\s/.-]{6,})/i.test(text);
  return [
    { id: "length", label: `${NOTE_MIN}–${NOTE_MAX} characters`, pass: text.length >= NOTE_MIN && text.length <= NOTE_MAX },
    { id: "names", label: "No names", pass: !hasName },
    { id: "amounts", label: "No amounts", pass: !hasAmount },
    { id: "places", label: "No places", pass: !hasPlace },
    { id: "contact", label: "No links or contacts", pass: !hasContact },
  ];
}

export const notePasses = (text: string) => checkNote(text).every((c) => c.pass);
