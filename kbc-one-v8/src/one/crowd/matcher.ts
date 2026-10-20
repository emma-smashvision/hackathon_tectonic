import { catalogueRoad, EVERYDAY_ONLY_ID } from "./catalogue";

export type SuggestedStage = "before" | "during" | "after" | "exploring";
export interface RoadMatch { roadId: string; name: string; suggestedStage: SuggestedStage }
export type RoadMatchResult =
  | { kind: "match"; match: RoadMatch; choices: [RoadMatch] }
  | { kind: "choices"; choices: RoadMatch[] }
  | { kind: "none"; choices: []; message: string };

// Local, auditable vocabulary only. No model, network, figures, or automatic placement.
const synonyms: [string, RegExp][] = [
  ["first-home", /\b(first home|first house|first flat|buy(?:ing)? (?:a |our |my )?(?:home|house|flat)|mortgage|eerste woning|huis kopen)\b/],
  ["moving-house", /\b(mov(?:e|ing) (?:house|home|flat)|new address|relocat(?:e|ing)|rental deposit|verhuizen|new keys)\b/],
  ["first-job", /\b(first job|first salary|first payslip|start(?:ing)? work|eerste baan|eerste job)\b/],
  ["first-child", /\b(first child|baby|pregnan\w*|expecting|maternity|paternity|zwanger)\b/],
  ["freelance", /\b(freelanc\w*|self employed|sole trader|start(?:ing)? (?:a |my )?business|company|zelfstandig)\b/],
  ["separation", /\b(separat\w*|divorc\w*|break(?:ing)? up|split up|scheid\w*)\b/],
  ["caring-parent", /\b(car(?:e|ing) for (?:a |my |our )?(?:parent|mother|father|mum|mom|dad)|parent needs|care home|mantelzorg)\b/],
  ["moving-abroad", /\b(abroad|emigrat\w*|another country|overseas|buitenland)\b/],
  ["retirement", /\b(retir\w*|pension|pensioen)\b/],
  ["losing-parent", /\b(bereav\w*|los(?:ing|t) (?:a |my |our )?(?:parent|mother|father|mum|mom|dad)|(?:parent|mother|father|mum|mom|dad) (?:died|passed away)|funeral|overlijden)\b/],
  ["student-kid", /\b(university|college|student child|student kid|kot|studeren)\b/],
  ["job-loss", /\b(job loss|los(?:t|ing) (?:my |a )?job|unemploy\w*|redundan\w*|laid off|ontslag)\b/],
  ["heat-pump", /\b(heat pump|warmtepomp)\b/],
  [EVERYDAY_ONLY_ID, /\b(everyday|daily budget|monthly bills|december spending|school year|dagelijks)\b/],
];
export function findRoad(text: string): RoadMatchResult {
  const query = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[-’']/g, " ").replace(/\s+/g, " ").trim();
  let ids = synonyms.filter(([, expression]) => expression.test(query)).map(([id]) => id);
  if (!ids.length && /\b(house|home|housing|move|moving)\b/.test(query)) ids = ["first-home", "moving-house", "moving-abroad"];
  if (!ids.length && /\b(parent|mother|father)\b/.test(query)) ids = ["caring-parent", "losing-parent"];
  const suggestedStage: SuggestedStage = /\b(planning|plan to|going to|before|soon|expecting|thinking)\b/.test(query) ? "before" :
    /\b(already|after|just|recently|started|bought|moved|died|passed away)\b/.test(query) ? "after" :
      /\b(currently|now|caring|freelancing)\b/.test(query) ? "during" : "exploring";
  const choices = [...new Set(ids)].map((roadId) => ({ roadId, name: catalogueRoad(roadId)!.name, suggestedStage }));
  if (choices.length === 1) return { kind: "match", match: choices[0], choices: [choices[0]] };
  if (choices.length) return { kind: "choices", choices };
  return { kind: "none", choices: [], message: "No published road yet" };
}
