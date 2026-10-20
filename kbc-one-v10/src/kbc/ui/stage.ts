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
  lina: { avatar: "/characters/lina-lisbon.svg", nameAge: "Lina, 31", role: "Everyday · October", noticed: ["Today’s money stays on Home", "Look ahead to December and the school year", "Explore every shared road in All roads"] },
  margaret: { avatar: "/characters/margaret.svg", nameAge: "Margaret, 74", role: "The same roads, large and simple", noticed: ["Large text and clear cards", "A payment made twice stays on Home", "Talk to An when she wants a hand"] },
  karim: { avatar: "/characters/karim.svg", nameAge: "Karim, 45", role: "Going freelance · month 20", noticed: ["Sole trader or company at month 24", "Compare what helped earlier freelancers", "Pass on a note from his completed First home road"] },
  sofie: { avatar: "/characters/sofie-pieter.svg", nameAge: "Sofie & Pieter", role: "First home · Exploring", noticed: ["No purchase date, no assumed position", "See energy settlement and first repair stops", "Save questions for Thursday’s appointment"] },
  nadia: { avatar: "/characters/nadia.svg", nameAge: "Nadia, 47", role: "Losing a parent · a person first", noticed: ["She told KBC what happened", "No unsolicited nudges or offers", "What helped others, only when she is ready"] },
};
