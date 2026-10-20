"use client";

import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useStore } from "../../hindsight/components/store";
import { MONTH_SHORT } from "../../hindsight/engine/everyday";
import { whenLong } from "../../hindsight/engine/plan";
import { maskMoney } from "../../hindsight/engine/world";
import { Sheet } from "../yourroad/Sheet";
import { type Asset, plainPlanText } from "../yourroad/model";
import type { MapCrossing, MapStop, MapTrack, RoadMap } from "./types";
import { curve, layoutMap, type MapNode } from "./MapLayout";
import { MapGlyph, kindFor } from "./MapPresentation";
import { trackReady } from "./model";
import { STAGE } from "../../kbc/ui/stage";
import { euro } from "../../hindsight/engine/format";

const originLabels = {
  everyday: "Everyday life",
  "told-us": "You told us",
  detected: "From your situation",
  calendar: "On your calendar",
  "test-drive": "An option to explore",
};
const stateLabels = {
  done: "Done",
  ready: "Ready",
  next: "Next up",
  later: "Coming up",
  locked: "Explore this option",
};

export function MapRoad({
  map,
  assets,
  onAsset,
  onCity,
}: {
  map: RoadMap;
  assets: Asset[];
  onAsset: (asset: Asset) => void;
  onCity?: (focus?: string) => void;
}) {
  const s = useStore();
  const [selected, setSelected] = useState<{
    trackId: string;
    stopId?: string;
    crossingId?: string;
    billsKey?: string;
  } | null>(null);
  const [added, setAdded] = useState("");
  const [popped, setPopped] = useState("");
  const scroll = useRef<HTMLDivElement>(null);
  const initialTop = useRef<number | null>(null);
  const [compact, setCompact] = useState(false);
  const [expandedTracks, setExpandedTracks] = useState<string[]>([]);
  const [pendingTrack, setPendingTrack] = useState<string | null>(null);
  const layout = useMemo(
    () => layoutMap(map, { expandedTracks }),
    [map, expandedTracks],
  );
  const nextNode = layout.nodes.find(
    (n) =>
      n.track.id === map.nextUp?.trackId && n.stop?.id === map.nextUp?.stopId,
  );
  const next = nextNode?.stop;
  const billGroup = layout.nodes.find((n) => n.key === selected?.billsKey);
  const billTitle = billGroup?.bills
    ? `${new Date(Date.UTC(billGroup.bills[0].when.year, billGroup.bills[0].when.month, 1)).toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" })} bills · ${billGroup.bills.length}`
    : "";
  const crossingNode = layout.nodes.find((n) => n.crossing);
  const text = (value: string) =>
    s.hideAmounts ? maskMoney(plainPlanText(value)) : plainPlanText(value);
  const track = map.tracks.find((t) => t.id === selected?.trackId);
  const stop = track?.stops.find((x) => x.id === selected?.stopId);
  const crossing = track?.crossings.find((x) => x.id === selected?.crossingId);
  const parentCrossing = map.tracks
    .flatMap((t) => t.crossings)
    .find((c) => c.branches.some((b) => b.trackId === track?.id));
  const branch = parentCrossing?.branches.find((b) => b.trackId === track?.id);
  const products = stop
    ? [
        ...new Set(
          [
            stop.product,
            ...stop.actions.map((a) => a.pick.spec.product),
          ].filter(Boolean),
        ),
      ].join(" · ")
    : "";
  const prepared = (action: MapStop["actions"][number]) =>
    s.plan.some((p) => p.id === action.pick.id) ||
    !!(
      action.pick.source.actionId &&
      s
        .journeyFor(action.pick.source.roadId)
        .done[action.pick.source.key]?.includes(action.pick.source.actionId)
    );
  const open = (n: MapNode) => {
    setAdded("");
    setSelected({
      trackId: n.track.id,
      stopId: n.stop?.id,
      crossingId: n.crossing?.id,
      billsKey: n.bills ? n.key : undefined,
    });
  };
  const jump = (node?: MapNode, smooth = true) => {
    if (!scroll.current) return;
    const y = node?.y ?? layout.height;
    if (smooth) setCompact(true);
    scroll.current.scrollTo({
      top: Math.max(0, y - scroll.current.clientHeight * 0.52),
      behavior:
        smooth && !matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "smooth"
          : "instant",
    });
    if (!smooth) initialTop.current = scroll.current.scrollTop;
  };
  useEffect(() => {
    const frame = requestAnimationFrame(() => jump(nextNode, false));
    return () => cancelAnimationFrame(frame);
  }, [map.personKey]); // Deliberately retain position when readiness changes.
  useEffect(() => {
    if (!pendingTrack) return;
    const node = layout.nodes.find(
      (n) => n.track.id === pendingTrack && n.stop,
    );
    jump(node ?? layout.nodes.find((n) => n.track.id === pendingTrack));
    setPendingTrack(null);
  }, [layout, pendingTrack]);
  useEffect(() => {
    if (!popped || selected) return;
    const timer = setTimeout(() => setPopped(""), 1000);
    return () => clearTimeout(timer);
  }, [popped, selected]);
  const add = (item: MapStop, action: MapStop["actions"][number]) => {
    if (prepared(action)) return;
    s.addPlanItem(action.pick);
    setAdded(`${text(action.label)}. Added to your plan.`);
    setPopped(item.id);
  };
  const city = (focus?: string) => {
    setSelected(null);
    if (onCity) onCity(focus);
    else s.testDrive(s.road.id, s.journey.month);
  };
  return (
    <>
      <header
        className={`yr-heading rm-heading ${compact ? "rm-compact-heading" : ""}`}
      >
        <div>
          <h1>Your road</h1>
          <p>Small steps. A clearer future.</p>
        </div>
        <button className="yr-link" onClick={() => s.go({ name: "route" })}>
          Your plan{s.plan.length ? ` (${s.plan.length})` : ""}
        </button>
      </header>
      <div
        className={`rm-assets ${compact ? "rm-compact-assets" : ""}`}
        role="group"
        aria-label="What you have"
      >
        {assets.map((a) => (
          <button
            key={a.id}
            onClick={() => onAsset(a)}
            aria-label={`${a.title}: ${text(a.value)}. View details`}
          >
            <span>{a.id === "savings" ? "Savings" : a.title}</span>
            <b>{text(a.value)}</b>
            <small>{a.id === "savings" ? "saved & invested" : a.label}</small>
          </button>
        ))}
      </div>
      <div className="rm-tools">
        <button
          className="rm-today-link"
          onClick={() => jump(layout.nodes.find((n) => n.kind === "today"))}
        >
          {STAGE[map.personKey]?.avatar && (
            <img src={STAGE[map.personKey].avatar} alt="" />
          )}{" "}
          Today
        </button>
        {crossingNode && (
          <button onClick={() => jump(crossingNode)}>⑂ Crossing</button>
        )}
        <button onClick={() => jump(nextNode)}>
          {next ? "Find next up" : "Back to today"} ↓
        </button>
      </div>
      <div
        className="rm-scroll"
        ref={scroll}
        onScroll={(event) => {
          if (
            initialTop.current != null &&
            Math.abs(event.currentTarget.scrollTop - initialTop.current) > 14
          )
            setCompact(true);
        }}
        tabIndex={0}
        aria-label="Your road map. Scroll up to explore future stops"
      >
        <div className="rm-canvas" style={{ height: layout.height }}>
          <svg
            viewBox={`0 0 336 ${layout.height}`}
            preserveAspectRatio="none"
            className="rm-lines"
            aria-hidden="true"
          >
            {layout.edges.map((edge) => (
              <g
                key={edge.key}
                className={
                  edge.track.parentId ? "rm-side-path" : "rm-main-path"
                }
              >
                <path
                  className={`rm-path ${edge.possible ? "rm-possible" : ""}`}
                  d={curve(edge.from, edge.to)}
                />
                {!edge.possible && edge.ready > 0 && (
                  <path
                    className="rm-progress"
                    pathLength={100}
                    strokeDasharray={`${Math.max(0, Math.min(100, edge.ready))} 100`}
                    d={curve(edge.from, edge.to)}
                  />
                )}
              </g>
            ))}
          </svg>
          {layout.months.map((m) => (
            <div key={m.label} className="rm-month" style={{ top: m.y }}>
              {m.label}
            </div>
          ))}
          {layout.nodes.map((n) => (
            <MapNodeButton
              key={n.key}
              node={n}
              avatar={STAGE[map.personKey]?.avatar}
              amount={n.stop?.amount}
              text={text}
              popped={!selected && n.stop?.id === popped}
              onOpen={() => open(n)}
            />
          ))}
          <div className="rm-future">
            Your next chapter <span>One step at a time</span>
          </div>
        </div>
      </div>
      <div className="rm-dock">
        {next && (
          <button
            className="rm-next"
            onClick={() => nextNode && open(nextNode)}
          >
            <span>
              <small>
                Next up ·{" "}
                {next.inDays === 0 ? "today" : `in ${next.inDays} days`}
              </small>
              <b>{text(next.title)}</b>
              <span>{Math.round(next.ready)}% ready · tap to prepare</span>
            </span>
            <span aria-hidden="true">↗</span>
          </button>
        )}
        {map.allowCity && (
          <button className="rm-city" onClick={() => city()}>
            Play it in 3D <span>Explore your city ↗</span>
          </button>
        )}
      </div>
      {track &&
        selected &&
        scroll.current &&
        createPortal(
          <Sheet
            key={`${selected.trackId}/${selected.billsKey ?? selected.stopId ?? selected.crossingId ?? "origin"}`}
            title={text(
              billTitle || stop?.title || crossing?.title || track.title,
            )}
            onClose={() => setSelected(null)}
          >
            {billGroup?.bills ? (
              <>
                <p>
                  Your smaller scheduled bills, together. Tap one to see its
                  date or set a reminder.
                </p>
                <div className="rm-bill-list">
                  {billGroup.bills.map((bill) => (
                    <button
                      key={bill.id}
                      onClick={() =>
                        setSelected({ trackId: bill.trackId, stopId: bill.id })
                      }
                    >
                      <span>
                        <b>{text(bill.title)}</b>
                        <small>
                          {bill.when.day} {MONTH_SHORT[bill.when.month]}
                        </small>
                      </span>
                      <span>
                        {bill.amount == null
                          ? "View"
                          : text(euro(Math.abs(bill.amount)))}{" "}
                        ›
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : stop || crossing ? (
              <>
                <p className="rm-sheet-date">
                  {whenLong((stop ?? crossing)!.when)} ·{" "}
                  {stop ? stateLabels[stop.state] : "A choice ahead"}
                </p>
                <p>{text(stop?.detail ?? crossing!.question)}</p>
                {products && (
                  <div className="rm-product">
                    <small>Products for this step</small>
                    <b>{text(products)}</b>
                  </div>
                )}
                <p className="rm-evidence">
                  People like you · shared experience in this demo is synthetic.
                </p>
                {crossing && (
                  <CrossingOptions
                    crossing={crossing}
                    tracks={map.tracks}
                    onExplore={(id) => {
                      setAdded("");
                      setSelected({ trackId: id });
                    }}
                  />
                )}
                {stop && (
                  <>
                    {((stop.weight === "major" && stop.actions.length > 0) ||
                      stop.ready > 0) && (
                      <div className="rm-preparation">
                        <b>
                          {crossing?.branches.some((b) => b.chosen)
                            ? "Choice recorded"
                            : stop.actions.length
                              ? `${stop.actions.filter(prepared).length} of ${stop.actions.length} ready`
                              : `${Math.round(stop.ready)}% ready`}
                        </b>
                        <span>{Math.round(stop.ready)}%</span>
                        <progress
                          max={100}
                          value={stop.ready}
                          aria-label="Preparation progress"
                        />
                      </div>
                    )}
                    {stop.state === "locked" && (
                      <p>
                        These steps belong to an option you haven’t chosen.
                        Explore the crossing first.
                      </p>
                    )}
                    <div className="rm-actions">
                      {stop.actions.map((action) => {
                        const saved = prepared(action);
                        return (
                          <button
                            key={action.pick.id}
                            className="yr-button yr-secondary"
                            disabled={saved || stop.state === "locked"}
                            onClick={() => add(stop, action)}
                          >
                            {saved ? "✓ In your plan" : text(action.label)}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
                {added && (
                  <p className="rm-added" role="status">
                    ✓ {added}
                  </p>
                )}
                <details className="rm-origin-details">
                  <summary>Why it’s on your map</summary>
                  <p>{text(track.origin.text)}</p>
                </details>
                {map.allowCity && stop && (
                  <button
                    className="yr-button"
                    onClick={() => city(stop.cityFocus ?? stop.id)}
                  >
                    Play it in 3D ↗
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="rm-sheet-date">
                  {branch?.chosen
                    ? "Your chosen option"
                    : track.status === "possible"
                      ? "Try it"
                      : originLabels[track.origin.kind]}
                </p>
                <h3>Why it’s on your map</h3>
                <p>{text(track.origin.text)}</p>
                {trackReady(track) != null && trackReady(track)! > 0 && (
                  <p>{trackReady(track)}% prepared on this road.</p>
                )}
                {!branch && (
                  <div className="rm-track-stops">
                    {track.stops
                      .filter((item) => item.inDays >= 0)
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() =>
                            setSelected({
                              trackId: track.id,
                              stopId: item.id,
                              crossingId: track.crossings.some(
                                (c) => c.id === item.id,
                              )
                                ? item.id
                                : undefined,
                            })
                          }
                        >
                          <span>
                            {item.when.day} {MONTH_SHORT[item.when.month]}
                          </span>
                          <b>{text(item.title)}</b>
                          <span>›</span>
                        </button>
                      ))}
                  </div>
                )}
                {branch && parentCrossing && (
                  <>
                    <p>
                      This records the option you want to prepare. Products and
                      payments stay the same.
                    </p>
                    <button
                      className="yr-button"
                      disabled={branch.chosen}
                      onClick={() => {
                        s.chooseFork(parentCrossing.id, branch.id);
                        setAdded(
                          "Your chosen option is now a solid path on your map.",
                        );
                      }}
                    >
                      {branch.chosen
                        ? "✓ Your chosen option"
                        : "Choose this option"}
                    </button>
                    {added && (
                      <p className="rm-added" role="status">
                        {added}
                      </p>
                    )}
                  </>
                )}
                <button
                  className="yr-button yr-secondary"
                  onClick={() => {
                    setSelected(null);
                    setExpandedTracks((ids) => {
                      const chain: string[] = [];
                      let current: MapTrack | undefined = track;
                      while (current) {
                        chain.push(current.id);
                        current = map.tracks.find(
                          (t) => t.id === current?.parentId,
                        );
                      }
                      return [...new Set([...ids, ...chain])];
                    });
                    setPendingTrack(track.id);
                  }}
                >
                  Explore these steps
                </button>
                {map.allowCity && track.roadId && (
                  <button
                    className="yr-button yr-secondary"
                    onClick={() => city(track.roadId)}
                  >
                    Play it in 3D ↗
                  </button>
                )}
              </>
            )}
          </Sheet>,
          scroll.current.closest(".road-phone")!,
        )}
    </>
  );
}

function MapNodeButton({
  node: n,
  text,
  popped,
  onOpen,
  avatar,
  amount,
}: {
  node: MapNode;
  text: (s: string) => string;
  popped: boolean;
  onOpen: () => void;
  avatar?: string;
  amount?: number;
}) {
  const style = {
    "--node-x": `${(n.x / 336) * 100}%`,
    top: n.y,
  } as CSSProperties;
  if (n.kind === "today")
    return (
      <div className="rm-today" style={style}>
        <b>{avatar ? <img src={avatar} alt="Your portrait" /> : "You"}</b>
        <span>
          You are here<small>Today · your next chapter</small>
        </span>
      </div>
    );
  if (n.bills)
    return (
      <button
        className={`rm-pebble ${n.x > 168 ? "rm-right" : ""}`}
        style={style}
        onClick={onOpen}
      >
        <span className="rm-pebble-dot">
          <MapGlyph kind="calendar" />
        </span>
        <span className="rm-node-label">
          <b>
            {new Date(
              Date.UTC(n.bills[0].when.year, n.bills[0].when.month, 1),
            ).toLocaleDateString("en-GB", {
              month: "long",
              timeZone: "UTC",
            })}{" "}
            bills · {n.bills.length}
          </b>
          <span>Tap to open</span>
        </span>
      </button>
    );
  if (n.kind === "origin")
    return (
      <button
        className={`rm-origin ${n.x > 168 ? "rm-right" : ""} ${n.branch ? "rm-branch-origin" : ""} ${n.stub ? "rm-stub" : ""}`}
        style={style}
        onClick={onOpen}
      >
        <span className="rm-origin-dot">
          {n.branch && n.track.status === "active" ? "✓" : "↗"}
        </span>
        <span>
          <b>{text(n.track.title)}</b>
          <small>
            {n.track.status === "possible"
              ? "Try it"
              : (n.starts ??
                (n.branch && n.track.status === "active"
                  ? "Your choice ✓"
                  : n.branch
                    ? "Explore option"
                    : "Your journey"))}{" "}
            · why?
          </small>
        </span>
      </button>
    );
  const item = n.stop ?? n.crossing!;
  const state = n.stop?.state ?? "later";
  const kind = n.crossing ? "crossing" : kindFor(n.stop!);
  const complete = state === "done" || state === "ready";
  return (
    <button
      className={`rm-node rm-${state} rm-kind-${kind} ${n.kind === "crossing" ? "rm-crossing" : ""} ${n.x > 168 ? "rm-right" : ""} ${popped ? "rm-pop" : ""}`}
      style={style}
      onClick={onOpen}
      aria-label={`${n.kind === "crossing" ? "Crossing: " : ""}${text(item.title)}. ${whenLong(item.when)}. ${stateLabels[state]}`}
      data-map-stop={item.id}
    >
      {state === "next" && <span className="rm-start">Start</span>}
      <span className="rm-disc">
        <span>
          {complete ? (
            <span className="rm-tick">✓</span>
          ) : (
            <MapGlyph kind={kind} />
          )}
        </span>
      </span>
      <span className="rm-node-label">
        <small>
          {item.when.day} {MONTH_SHORT[item.when.month]}
          {n.crossing ? " · crossing" : ""}
        </small>
        <b>{text(item.title)}</b>
        <span>
          {complete
            ? "Ready ✓"
            : state === "locked"
              ? "Choose an option first"
              : n.crossing
                ? "Two ways forward"
                : n.stop?.weight === "major" && n.stop.actions.length > 0
                  ? `${Math.round(n.stop.ready)}% ready`
                  : amount != null
                    ? text(`${euro(Math.abs(amount))} · scheduled`)
                    : "On your calendar"}
        </span>
      </span>
    </button>
  );
}

function CrossingOptions({
  crossing,
  tracks,
  onExplore,
}: {
  crossing: MapCrossing;
  tracks: MapTrack[];
  onExplore: (id: string) => void;
}) {
  return (
    <div className="rm-choices">
      <h3>Which way feels right?</h3>
      {crossing.branches.map((branch) => (
        <button
          className="yr-button yr-secondary"
          key={branch.id}
          onClick={() => onExplore(branch.trackId)}
          disabled={!tracks.some((t) => t.id === branch.trackId)}
        >
          <span>
            {branch.chosen ? "✓ " : "◇ "}
            {branch.label}
          </span>
          <small>
            {branch.chosen
              ? "Your chosen option"
              : tracks.find((t) => t.id === branch.trackId)?.status ===
                  "possible"
                ? "Try it"
                : "Explore this option"}
          </small>
        </button>
      ))}
    </div>
  );
}
