// Presenter story per synthetic customer, shown left of the phone (like /classic).
// The "Kate decided" line under it comes live from the composed home.

export type StageStory = {
  avatar: string;
  nameAge: string;
  role: string;
  noticed: string[];
};

// v8-channels: pitch copy follows the shared crowd roads, not asset-city entry points.
export const STAGE: Record<string, StageStory> = {
  tom: { avatar: "/characters/tom.svg", nameAge: "Tom, 29", role: "Moving house · before 1 Nov", noticed: ["He told KBC his moving date", "Earlier movers left practical notes", "Photograph the meters at key handover"] },
  lina: { avatar: "/characters/lina-lisbon.svg", nameAge: "Lina, 31", role: "Weekend in London · travelling", noticed: ["Card payments in pounds since Thursday", "Pound pocket and trip spending up front", "Eurostar home on Saturday"] },
  margaret: { avatar: "/characters/margaret.svg", nameAge: "Margaret, 74", role: "The same roads, large and simple", noticed: ["Large text and clear cards", "A payment made twice stays on Home", "Talk to An when she wants a hand"] },
  karim: { avatar: "/characters/karim.svg", nameAge: "Karim, 45", role: "Going freelance · month 20", noticed: ["Sole trader or company at month 24", "Compare what helped earlier freelancers", "Pass on a note from his completed First home road"] },
  sofie: { avatar: "/characters/sofie-pieter.svg", nameAge: "Sofie, 34", role: "Physiotherapist · sole proprietorship → BV", noticed: ["Her practice profit passed €70,000", "Most physios switched to a BV here", "Partners ready for every BV step"] },
  marc: { avatar: "/characters/marc.svg", nameAge: "Marc, 26", role: "Tech founder · just bought a domain", noticed: ["A domain name and a developer account", "What 18,700 founders did next", "Company number, VAT and an account before the paperwork piles up"] },
  nadia: { avatar: "/characters/nadia.svg", nameAge: "Nadia, 47", role: "Losing a parent · a person first", noticed: ["She told KBC what happened", "No unsolicited nudges or offers", "What helped others, only when she is ready"] },
};
