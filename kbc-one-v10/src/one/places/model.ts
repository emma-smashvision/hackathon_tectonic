import type { PersonRoad } from '../people';
import { mortgageAt, monthsBetween, type MonthPoint } from '../../hindsight/engine/world';

/** Stable demo date, independent of the computer clock. Months are zero-based. */
export const PLACES_AS_OF: MonthPoint = { year: 2026, month: 9 };
export type PlaceId = 'home' | 'car' | 'savings' | 'pension' | 'business' | 'kids';
export type PlaceAccount = { id: string; label: string; balance: number; monthly: number; locked?: boolean };
export type PlaceGoal = { id: string; label: string; saved: number; target: number; monthly: number; percent: number };
export type PlaceLesson = { id: string; title: string; line: string; steps: string[]; missionId?: string };
export type Place = {
  id: PlaceId; title: string; subtitle: string; label: string; color: string;
  facts: { label: string; value: string }[];
  attachments: { label: string; detail: string; state: 'ok' | 'check' | 'gap' }[];
  accounts: PlaceAccount[]; goals: PlaceGoal[]; lessons: PlaceLesson[];
  progress?: { label: string; percent: number; detail: string; payments?: number; totalPayments?: number };
};
export type PlacesDemoState = { personaId: string; accounts: PlaceAccount[]; goals: PlaceGoal[] };
export const money = (value: number) => `€ ${value.toLocaleString('nl-BE', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;
export const percent = (value: number, total: number) => total > 0 ? Math.max(0, Math.min(100, value / total * 100)) : 0;
const pct = (n: number) => `${Math.round(n)}%`;
export function createDemoState(person: PersonRoad): PlacesDemoState {
  return { personaId: person.key, accounts: [
    { id: 'current', label: 'Current account', balance: person.household.balance, monthly: 0 },
    ...person.household.pots.map(p => ({ ...p })),
  ], goals: person.household.goals.map(g => ({ ...g, percent: percent(g.saved, g.target) })) };
}
/** Immutable, cent-exact allocation. Returns an error without changing state on any invalid input. */
export function moveToGoal(state: PlacesDemoState, accountId: string, goalId: string, amount: number): { state: PlacesDemoState; error?: string } {
  const account = state.accounts.find(a => a.id === accountId), goal = state.goals.find(g => g.id === goalId);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || cents < 1 || Math.abs(cents / 100 - amount) > .000001) return { state, error: 'Enter an amount in euros and cents.' };
  if (!account || account.locked || !goal) return { state, error: 'Choose an available account and goal.' };
  if (cents > Math.round(account.balance * 100)) return { state, error: 'This demo account does not have enough available money.' };
  if (cents > Math.round((goal.target - goal.saved) * 100)) return { state, error: 'Choose an amount no larger than the goal still needs.' };
  return { state: { ...state,
    accounts: state.accounts.map(a => a.id === accountId ? { ...a, balance: (Math.round(a.balance * 100) - cents) / 100 } : a),
    goals: state.goals.map(g => g.id === goalId ? { ...g, saved: (Math.round(g.saved * 100) + cents) / 100, percent: percent((Math.round(g.saved * 100) + cents) / 100, g.target) } : g),
  } };
}
const lesson = (id: string, title: string, line: string, steps: string[], missionId?: string): PlaceLesson => ({ id, title, line, steps, missionId });
/** Pure adapter: no city, React, storage, network, or mutations of PEOPLE. */
export function buildPlaces(person: PersonRoad, demo = createDemoState(person), at = PLACES_AS_OF): Place[] {
  if (demo.personaId !== person.key) demo = createDemoState(person);
  const { world: w, household: h } = person, goals = demo.goals;
  const base = (id: PlaceId, title: string, subtitle: string, color: string): Place => ({ id, title, subtitle, color, label: subtitle, facts: [], attachments: [], accounts: [], goals: [], lessons: [] });
  const home = base('home', 'Home', person.key === 'tom' ? 'Your Leuven flat. Your next chapter in Gent.' : h.household, '#ffcc92');
  const homeGoal = goals.find(g => g.id === w?.futureHome?.goalId) ?? (person.key === 'tom' ? goals[0] : undefined);
  if (w?.home?.mortgage) {
    const m = w.home.mortgage, loan = mortgageAt(m, at), repaid = Math.round(m.original - loan.left), payments = Math.max(0, Math.min(m.years * 12, monthsBetween(m.start, at)));
    home.progress = { label: 'Your home, brick by brick', percent: loan.paidShare * 100, detail: `${money(repaid)} of ${money(m.original)} repaid`, payments, totalPayments: m.years * 12 };
    home.facts.push({ label: 'Payments made', value: `${payments} of ${m.years * 12}` }, { label: 'Mortgage remaining', value: money(Math.round(loan.left)) }, { label: 'Monthly mortgage', value: `${money(h.bills.find(b => b.id === 'mortgage')?.amount ?? Math.round(loan.payment))} · ${m.fixed ? 'fixed' : 'variable'} ${(m.rate * 100).toLocaleString('en-GB')}%` });
    home.attachments.push({ label: 'Balance insurance', detail: m.balanceInsurance ? 'Your mortgage foundation is covered' : 'No balance insurance recorded', state: m.balanceInsurance ? 'ok' : 'gap' });
    home.label = `${pct(home.progress.percent)} repaid · ${payments} payments`;
  } else {
    const rent = h.bills.find(b => b.id === 'rent');
    if (person.key === 'tom') home.facts.push({ label: 'Current home · Leuven', value: 'Rent payment history is not recorded in this demo.' });
    else if (rent) home.facts.push({ label: 'Monthly rent', value: money(rent.amount) });
    if (w?.home?.rent) home.facts.push({ label: person.key === 'tom' ? 'Next rent · Gent, from 1 Nov 2026' : 'Rental deposit', value: money(person.key === 'tom' ? w.home.rent.monthly : w.home.rent.deposit) });
    if (homeGoal) { home.goals = [homeGoal]; home.progress = { label: homeGoal.label, percent: homeGoal.percent, detail: `${money(homeGoal.saved)} of ${money(homeGoal.target)} saved` }; }
    const mortgageBill = h.bills.find(b => b.id === 'mortgage');
    if (mortgageBill) home.facts.push({ label: 'Monthly mortgage', value: money(mortgageBill.amount) }, { label: 'Mortgage repaid', value: 'Original loan and payment history are not recorded in this demo.' });
    home.label = homeGoal ? `${homeGoal.label} · ${pct(homeGoal.percent)}` : rent ? `${money(rent.amount)}/month · rented home` : mortgageBill ? `${money(mortgageBill.amount)}/month mortgage` : 'Your home and cover';
  }
  if (w?.home?.insurance) home.attachments.push({ label: w.home.tenure === 'rent' ? 'Tenant insurance' : 'Home insurance', detail: w.home.insurance.label, state: 'ok' });
  else {
    const cover = h.cover.find(c => c.id === 'home');
    if (cover) { home.attachments.push({ label: 'Home insurance', detail: cover.note, state: cover.state }); if (home.label === 'Your home and cover') home.label = cover.state === 'ok' ? 'Home insurance recorded' : 'Check your home cover'; }
  }
  const energy = h.bills.find(b => b.group === 'energy');
  if (energy) home.facts.push({ label: 'Energy advance', value: `${money(energy.amount)}/month${w?.home?.epc ? ` · EPC ${w.home.epc}` : ''}` });
  home.lessons = [lesson('home-cover', 'Check your home foundation', 'Your home and its cover belong together.', ['Check the insured address and who lives there.', 'Keep your cover and mortgage details together.'])];
  if (person.key === 'tom') home.lessons = [lesson('home-energy', 'First energy bill', 'Start in your flat, then meet the movers ahead.', ['Take dated meter photos at handover.', 'Keep your first bill and advance together.'], 'tom:energy-new-address'), lesson('home-deposit', 'Your old rental deposit', 'The old deposit is not money available today.', ['Check the release steps and timing.'], 'tom:old-deposit')];
  if (person.key === 'sofie') home.lessons.unshift(lesson('home-energy', 'Your first energy settlement', 'See what earlier households learned.', ['Compare meter readings with your advance.'], 'sofie:energy-settlement'));
  const car = base('car', 'Car', w?.car?.label ?? 'Your garage', '#79dfff');
  if (w?.car) {
    const ins = w.car.insurance, date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(at.year, ins.renews.month, ins.renews.day)));
    const increase = ins.before > 0 ? Math.round((ins.yearly / ins.before - 1) * 100) : 0;
    car.label = `${money(ins.yearly)}/year · ${increase >= 0 ? '+' : ''}${increase}% on ${date.replace(` ${at.year}`, '')}`;
    car.facts = [{ label: 'Annual premium', value: money(ins.yearly) }, { label: 'Renewal', value: date }, { label: 'Change at renewal', value: `${increase >= 0 ? '+' : ''}${increase}% · previously ${money(ins.before)}/year` }];
    car.attachments = [{ label: 'Car insurance', detail: ins.label, state: 'ok' }];
  } else { car.label = 'No car or policy recorded'; car.facts.push({ label: 'Car details', value: 'No car or policy recorded in this demo.' }); }
  car.facts.push({ label: 'Car loan', value: 'No car loan recorded' }, { label: 'Maintenance', value: 'No maintenance date recorded' });
  car.lessons = [lesson('car-cover', 'Check your cover', 'A renewal is a moment to check what changed.', ['Compare the premium, excess and included cover.', 'Check who can drive and what assistance includes.', 'Keep the renewal date with your policy.'])];
  const savings = base('savings', 'Savings', 'Your glass vault. Every goal has its own tank.', '#82f5d0');
  savings.accounts = demo.accounts; savings.goals = goals;
  const saved = goals.reduce((sum, g) => sum + g.saved, 0), target = goals.reduce((sum, g) => sum + g.target, 0);
  savings.label = `${money(demo.accounts.filter(a => a.id !== 'current').reduce((s, a) => s + a.balance, 0) + saved)} · ${goals.length} ${goals.length === 1 ? 'goal' : 'goals'}${target ? ` · ${pct(percent(saved, target))}` : ''}`;
  savings.facts = (w?.holdings ?? []).map(i => ({ label: `${i.name} · ${i.via}`, value: money(i.value) }));
  savings.lessons = [lesson('savings-goal', 'Give your goal a monthly rhythm', 'Try a small move here and watch your tank fill.', ['Choose a target that is yours.', 'Keep money for upcoming bills available.', 'Check the monthly standing order against your plan.'])];
  if (person.key === 'tom') savings.lessons.push(lesson('savings-setup', 'What helped movers save for setup', 'Explore the room-by-room budget lesson.', ['List essentials before individual purchases.'], 'tom:setting-up'));
  if (person.key === 'lina') savings.lessons.push(lesson('savings-december', 'December, at your own pace', 'A shared list can keep the total in view.', ['Choose your total before buying.'], 'lina:december'));
  const pension = base('pension', 'Pension', 'A little more of your future, each year.', '#a6e5ad');
  if (w?.pension) {
    const p = w.pension;
    pension.progress = { label: `${at.year} contributions`, percent: percent(p.paid, p.limit), detail: `${money(p.paid)} of ${money(p.limit)} demo yearly maximum` };
    pension.label = `${money(p.paid)} / ${money(p.limit)} this year · ${pct(pension.progress.percent)}`;
    pension.facts = [{ label: 'Pension fund', value: money(p.fund) }, { label: 'Remaining to tax-advantaged maximum (demo)', value: money(Math.max(0, p.limit - p.paid)) }, ...(p.usual ? [{ label: 'Usual yearly contribution', value: money(p.usual) }] : []), { label: 'Contribution years', value: 'History not recorded in this demo' }];
  } else { pension.label = 'No pension saving recorded'; pension.facts = [{ label: 'Pension saving', value: 'No contributions or maximum recorded in this demo.' }]; }
  const pensionIncome = h.incomes.find(i => i.id === 'pension');
  if (!w?.pension && pensionIncome) { pension.label = `${money(pensionIncome.amount)}/month pension`; pension.subtitle = 'Your regular pension income'; pension.facts = [{ label: 'Monthly pension income', value: money(pensionIncome.amount) }, { label: 'Payment day', value: `Day ${pensionIncome.day} of each month` }]; }
  pension.lessons = [lesson('pension-year', 'Know your yearly contribution', 'The tower shows your own progress, not a comparison.', ['Separate this year’s contributions from the full fund value.', 'The maximum here is a synthetic demo figure, not tax advice.', 'Check your own circumstances before making a real contribution.'])];
  if (pensionIncome) pension.lessons = [lesson('pension-income', 'Your month at a glance', 'Keep your income and regular payments together.', ['Check when your pension arrives.', 'Keep money for regular bills available.'])];
  const places = [home, car, savings, pension];
  if (person.roadId === 'freelance') {
    const business = base('business', 'Business', 'Your freelance workshop', '#f4aaca');
    business.goals = goals.filter(g => g.id === 'tax'); business.label = business.goals[0] ? `Tax reserve · ${pct(business.goals[0].percent)}` : 'Your freelance workshop';
    business.facts = [...h.incomes.map(i => ({ label: i.label, value: `${money(i.amount)}/month · variable` })), ...h.bills.filter(b => ['work', 'tax'].includes(b.group)).map(b => ({ label: b.label, value: `${money(b.amount)}${b.months ? '/quarter' : '/month'}` }))];
    business.attachments = h.cover.filter(c => c.id === 'income').map(c => ({ label: 'Income cover', detail: c.note, state: c.state }));
    business.lessons = [lesson('business-structure', 'Sole trader or a company?', 'Compare the near term and the longer term.', ['Bring your administration and timing questions to your adviser.'], 'karim:company')]; places.push(business);
  }
  if (w?.child || person.key === 'sofie') {
    const kids = base('kids', w?.child ? 'Kids' : 'Family', w?.child ? `${w.child.name}’s own little island` : 'Sofie & Pieter’s shared plans', '#f4aaca');
    if (w?.child) {
      kids.label = `${w.child.name} · ${money(w.child.balance)} · ${money(w.child.weekly)}/week`;
      kids.accounts = [{ id: 'child', label: `${w.child.name}’s account`, balance: w.child.balance, monthly: 0, locked: true }];
      kids.facts = [{ label: 'Pocket money', value: `${money(w.child.weekly)} every ${w.child.day}` }, { label: 'Savings goal', value: 'No goal recorded for Noor yet.' }];
    } else { kids.goals = goals; kids.label = home.label; }
    kids.lessons = [lesson('kids-plan', 'Make a plan together', 'Small choices make the whole list easier to see.', ['Talk about what to save for and what can wait.', 'Choose a total together before buying.'], person.key === 'lina' ? 'lina:december' : undefined)]; places.push(kids);
  }
  return places;
}
export const placeIdForPlot = (kind: string): PlaceId => kind === 'family' ? 'kids' : kind as PlaceId;
