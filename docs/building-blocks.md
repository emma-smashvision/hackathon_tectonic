# Building blocks

Apple-style widgets for the KBC home. Every block comes in iOS sizes (`sm` 1×1, `md` 2×1, `lg` 2×2) and three content tiers (`essential`, `standard`, `expert`), plus a large-text mode that works at every tier. Tiers describe content depth, never the customer's age or ability.

Gallery: `bun dev` → http://localhost:3000/blocks

## Contract

- `src/blocks/types.ts`: `BlockDefinition` (`id`, `group`, `title`, `description`, `sizes`, `render({ size, tier, largeText })`).
- `src/blocks/shell.tsx`: `BlockShell`, the shared frame (size footprint, radius, glass surface, header).
- `src/blocks/blocks.css`: tokens scoped to `.blocks-root`.
- `src/blocks/<group>/index.ts`: each group exports its block list; `src/blocks/registry.ts` collects them.
- Each block ships its own mocked data. No engine, no network, no LLM.

## Groups

| Group | Blocks |
| --- | --- |
| core + primitives | Balance (incl. multi-currency), Quick actions, Recent activity; shared primitives |
| everyday | Direct debits, Duplicate payment alert, Is this payment safe?, Budget & fixed costs, Call my advisor |
| life | House fund & mortgage simulator, House-buying timeline & documents, Appointments, Insurance to arrange, Moving checklist |
| travel | Trip ready, Currency accounts & exchange, eSIM (proposed), Nearby ATMs (mock map) |
| wealth | Portfolio, Winners & losers, Dividends, Calm market context, Tax reserve, Pension & retirement countdown |
| prize (+ Kate) | Prize celebration, Split with the team, Start a business, Put it to work, Kate suggestions + Ask Kate bar |
