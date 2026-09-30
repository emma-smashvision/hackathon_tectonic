# Demo personas

Seven synthetic characters the prototype is built around (see `src/components/prototype/scenarios.ts` and `src/lib/engine/personas.ts`). All names, amounts and transactions are made up; no real customer data.

Principles that apply to every character:

- **Fixed core:** balance, Transfer and Pay always sit in the same place.
- **Behaviour beats demographics:** age never decides the interface on its own. A simple UI comes from behaviour signals (large text, zoom, mis-taps); a detailed UI comes from usage (daily portfolio checks).
- **Above the fold = key info + quick actions:** the balance, a one-line narrative, and floating bubbles with a live figure each. Scrolling down shows the full widgets in calm glass sections.
- **Explainable:** every personalised item has "Why am I seeing this?", pin and hide.
- **Mocked for now:** the rules engine and persona data are the mock source, and Kate answers from scripted responses. The LLM / Jev layer that decides how each account is built comes later.

## How the home reads

After the InvestSuite ambient home: a breathing ambient background whose mood follows the home (calm, warm, focused, bright or celebratory), then the centred balance with a count-up and an italic narrative, then non-overlapping drifting bubbles, then suggestion pills and the Kate dock.

- **Bubble size** follows the square root of the engine score (relative to the top item). Simple mode uses larger minimum sizes, fewer bubbles and a slower drift.
- **Tints:** a subtle green or red tint for figures that go up or down. A pulsing dot marks items that need attention: a double payment, a new prize, a flagged payment or a question.
- **Tap a bubble:** it grows while the others dim, then morphs into its detail sheet. A compact bubble strip on top switches between items.

## Margaret, 74 — keeps it simple

**Signals:** large text, frequent zoom, mis-taps, a monthly pension, six direct debits (domiciliëringen), and Proximus €12 higher than usual.

**Home:** simple view. Big labelled Transfer and Pay buttons, at most 3 solid high-contrast bubbles: advisor, **direct debits** (6 active), pension.

**Live demo signal:** *Duplicate payment detected* (in the engine drawer): Luminus collected twice → a **Paid twice?** bubble with a pulsing dot goes to the top. Its sheet offers *Get it back* / *It's fine*.

## Lina, 31 — off to Lisbon

**Signals:** a flight BRU → LIS, a card payment in Lisbon, a city-trips savings goal.

**Home:** the trip leads (travel bubble shows *Lisboa*). **Currencies & exchange** (GBP and USD pockets, a mocked exchange preview with rate and fee), **Travel eSIM** (*proposed service*) and **ATMs nearby** (a mock map with fee-free ATMs) follow.

## Tom, 29 — moving to a new city

Unchanged: the IKEA purchase asks first ("Planning a move?"). The mover and new rent make Moving the biggest bubble, with the budget close by.

## Sofie & Pieter, 34 — buying a first home

**Signals:** the "Our first home" goal (€41,300 of €60,000), mortgage simulator views, a viewing deposit and booked appointments.

**Home:** once the simulator visit applies the need, the house fund (69%) leads. **Appointments** follow (next: mortgage advisor, Thu 10:00), with the **house-buying timeline** (visits → offer → mortgage → notary → keys, plus a document checklist) and **insurance to arrange** further down.

## Karim, 45 — freelancer and investor

Unchanged: tax reserve and portfolio up front, detailed view. As an active investor he also gets the winners/losers and dividends overviews.

## Marc, 71 — active investor

**Signals:** 12 portfolio checks a week, a monthly investment plan, dividends.

**Home:** detailed view despite his age. Bubbles: portfolio, **top performer** (World ETF +14%, green tint), **dividends** (€412, green), pension and activity. The *Doing well, doing less well* widget lists winners and losers. It is information only, not buy or sell advice.

## Emma & Thomas — just won the hackathon

**Signals:** €10,000 one-off prize (not a salary), a joint account for two.

**Home:** confetti when the prize lands (not with reduced motion) and a celebratory ambient. The prize bubble has a pulsing dot. **Start a business** (a business account and starter kit) and **Split & celebrate** (€5,000 each, trip ideas) follow. Emma's windfall card is the in-focus section: holiday, buffer or investing, explored with the advisor and never as advice.
