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

## Catalog (for the AI layer)

Not yet wired into the phone home. A future AI selector would pick blocks from this list by `id`, with a `size` (`sm`, `md`, `lg`) and a `tier` (`essential`, `standard`, `expert`), plus `largeText` for accessibility. That integration must validate IDs, sizes and tiers and fall back to the rules engine for invalid selections; it is not implemented yet. All blocks currently render their own synthetic demo data.

The list is generated from `src/blocks/registry.ts` (`BLOCK_GROUPS`), which is the source of truth.

| id | group | title | sizes | description |
| --- | --- | --- | --- | --- |
| `core-balance` | core | Balance | sm, md, lg | Your everyday balance, with room for other currencies. |
| `core-quick-actions` | core | Quick actions | sm, md, lg | Pay, transfer and the little things you do most. |
| `core-recent-activity` | core | Recent activity | sm, md, lg | A clear view of what came in and went out. |
| `everyday-direct-debits` | everyday | Direct debits / domiciliëringen | sm, md, lg | What’s due next, and what looks different. |
| `everyday-duplicate-payment` | everyday | Duplicate payment alert | sm, md, lg | A gentle nudge when the same bill may have been paid twice. |
| `everyday-payment-safety` | everyday | Is this payment safe? | sm, md, lg | Pause, check the payee, then decide. |
| `everyday-budget` | everyday | Budget & fixed costs | sm, md, lg | Bills accounted for. Know what’s yours to spend. |
| `everyday-advisor` | everyday | Call my advisor | sm, md, lg | A real person, one tap away. |
| `life-house-fund` | life | House fund & mortgage | sm, md, lg | Sofie & Pieter · a first home, one step closer. |
| `life-buying-timeline` | life | The route to your keys | sm, md, lg | Every milestone and document for your first home. |
| `life-appointments` | life | People to see | sm, md, lg | Your advisor, estate agent and notary, all in view. |
| `life-insurance` | life | A home, covered | sm, md, lg | The cover to arrange before you collect the keys. |
| `life-moving` | life | Make your move | sm, md, lg | Tom · five small steps to a fresh start in Leuven. |
| `travel-trip` | travel | Trip ready | sm, md, lg | Lina’s Lisbon essentials, all in one place. |
| `travel-currency` | travel | Currency accounts & exchange | sm, md, lg | Three currency pockets and a transparent demo exchange. |
| `travel-esim` | travel | eSIM | sm, md, lg | A proposed data plan for Lina’s week in Portugal. |
| `travel-atms` | travel | Nearby ATMs | sm, md, lg | An illustrative Lisbon map with clear ATM fees. |
| `wealth-portfolio` | wealth | Portfolio | sm, md, lg | Your investments at a glance. A closer view when you want it. |
| `wealth-performers` | wealth | Winners & losers | sm, md, lg | What moved your portfolio, with a little perspective. |
| `wealth-dividends` | wealth | Dividends | sm, md, lg | Income received, and the next dates in your diary. |
| `wealth-market-context` | wealth | Calm market context | sm, md, lg | A quiet explanation for a week when markets fall. |
| `wealth-tax-reserve` | wealth | Tax reserve | sm, md, lg | For Karim: a clear view of what is set aside for tax. |
| `wealth-retirement` | wealth | Pension & retirement | sm, md, lg | Your next chapter, with the important dates in order. |
| `prize-celebration` | prize | Prize celebration | sm, md, lg | Emma & Thomas’s €10,000 hackathon win from Spott. |
| `prize-team` | prize | Split with the team | sm, md, lg | Four teammates. Four equal shares. One shared win. |
| `prize-business` | prize | Start a business | sm, md, lg | A mocked first checklist for the founders’ next chapter. |
| `prize-work` | prize | Put it to work | sm, md, lg | An illustrative allocation, with room for today and tomorrow. |
| `prize-kate` | prize | Kate suggestions & Ask Kate | sm, md, lg | Three relevant prompts and a local, scripted conversation. |
