"use client";

import dynamic from "next/dynamic";
import { Phone } from "../phone/Phone";
import { StoreProvider, useStore } from "../store";
import { Icon } from "../ui";
import { Adviser } from "./Adviser";
import { Atlas } from "./Atlas";
import { Director } from "./Director";
import { Inspector } from "./Inspector";

const City = dynamic(() => import("../../game/City").then((m) => m.City), {
  ssr: false,
  loading: () => <div className="city-loading mono">Building the city…</div>,
});

function TopBar() {
  const { view, setView, liveRoads, road, pickRoad } = useStore();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="road" size={18} />
        </span>
        <span className="brand-name">Hindsight</span>
        <span className="brand-by">KBC · Tectonic 2026</span>
      </div>
      <nav className="views" aria-label="Views">
        <button type="button" aria-label="App" aria-pressed={view === "phone"} onClick={() => setView("phone")}>
          <Icon name="phone" size={16} /> <span>App</span>
        </button>
        <button type="button" aria-label="City" aria-pressed={view === "city"} onClick={() => setView("city")}>
          <Icon name="road" size={16} /> <span>City</span>
        </button>
        <button type="button" aria-label="Atlas" aria-pressed={view === "atlas"} onClick={() => setView("atlas")}>
          <Icon name="atlas" size={16} /> <span>Atlas</span>
        </button>
        <button type="button" aria-label="Adviser" aria-pressed={view === "adviser"} onClick={() => setView("adviser")}>
          <Icon name="desk" size={16} /> <span>Adviser</span>
        </button>
      </nav>
      <label className="mobile-road">
        <span className="sr-only">Road</span>
        <select value={road.id} onChange={(e) => pickRoad(e.target.value)}>
          {liveRoads.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.persona.name}
            </option>
          ))}
        </select>
      </label>
    </header>
  );
}

function Body() {
  const { view } = useStore();
  if (view === "city") return <City />;
  if (view === "atlas") return <Atlas />;
  if (view === "adviser") return <Adviser />;
  return (
    <div className="stage">
      <Director />
      <div className="stage-centre">
        <Phone />
      </div>
      <Inspector />
    </div>
  );
}

export function Stage() {
  return (
    <StoreProvider>
      <div className="app">
        <TopBar />
        <main>
          <Body />
        </main>
      </div>
    </StoreProvider>
  );
}
