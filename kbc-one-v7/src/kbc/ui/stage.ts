// Presenter story per synthetic customer, shown left of the phone (like /classic).
// The "Kate decided" line under it comes live from the composed home.

export type StageStory = {
  avatar: string;
  nameAge: string;
  role: string;
  noticed: string[];
};

export const STAGE: Record<string, StageStory> = {
  tom: {
    avatar: "/characters/tom.svg",
    nameAge: "Tom, 29",
    role: "Moving to Gent · just paid for four at the bar",
    noticed: [
      "€ 128,40 at Bar Bidon, 4 min ago",
      "Splits dinners with Lien, Arne and Sam",
      "Moving date in 2 weeks",
    ],
  },
  lina: {
    avatar: "/characters/lina-lisbon.svg",
    nameAge: "Lina, 31",
    role: "Weekend in London with daughter Noor",
    noticed: [
      "Card used in London",
      "£ 18,20 left in the pound pocket",
      "0.4 GB travel data left",
      "Noor's account at € 3,10",
    ],
  },
  margaret: {
    avatar: "/characters/margaret.svg",
    nameAge: "Margaret, 74",
    role: "Mechelen · likes it big and simple",
    noticed: ["Zooms in on most screens", "Luminus debited € 84,20 twice"],
  },
  karim: {
    avatar: "/characters/karim.svg",
    nameAge: "Karim, 45",
    role: "Freelance designer in Antwerpen",
    noticed: [
      "Atelier Vos paid € 1.200, 9 min ago",
      "VAT reserve below target",
      "Checks his portfolio 12× a week",
    ],
  },
  sofie: {
    avatar: "/characters/sofie-pieter.svg",
    nameAge: "Sofie, 34",
    role: "Saving with Pieter for a first home",
    noticed: [
      "House fund at € 41.300 of € 60.000",
      "Used the mortgage simulator yesterday",
      "Advisor appointment Thursday",
    ],
  },
  nadia: {
    avatar: "/characters/nadia.svg",
    nameAge: "Nadia, 47",
    role: "Lost her father three weeks ago",
    noticed: [
      "She told Kate what happened",
      "Suggestions paused, as she asked",
      "Els, her advisor, is one tap away",
    ],
  },
};
