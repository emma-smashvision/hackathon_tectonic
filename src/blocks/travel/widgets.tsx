"use client";

import { useId, useState } from "react";
import type { BlockRenderProps } from "@/blocks/types";
import { Icon } from "@/components/ui";
import { Action, Detail, Status, Widget } from "./parts/widget";

export function TripReady(props: BlockRenderProps) {
  const [abroad, setAbroad] = useState(true);
  const [open, setOpen] = useState(false);
  const detailed = props.size !== "sm" && props.tier !== "essential";
  return (
    <Widget {...props} title="Trip ready" icon="plane">
      <div className="tp-route">
        <strong>BRU</strong>
        <span>
          <span className="tp-sr-only">to</span>
          <Icon name="plane" />
        </span>
        <strong>LIS</strong>
      </div>
      <p className="tp-sub">Lisbon, in 5 days</p>
      {detailed && (
        <div className="tp-ticket">
          <span>Lina’s next adventure</span>
          <strong>5–9 October</strong>
        </div>
      )}
      {(detailed || open) && (
        <div className="tp-stack">
          <button
            type="button"
            role="switch"
            aria-checked={abroad}
            aria-label="Card payments abroad"
            className="tp-toggle-row"
            onClick={() => setAbroad(!abroad)}
          >
            <span>
              Card abroad
              <strong className="tp-toggle-status">
                {abroad ? "Ready to use" : "Switched off"}
              </strong>
            </span>
            <span className="tp-switch" data-on={abroad}>
              <span />
            </span>
          </button>
          <Detail label="Travel cover">
            <span className="tp-green">
              Active <Icon name="shield" />
            </span>
          </Detail>
          {props.size === "lg" && (
            <p className="tp-note">
              Your card works in Portugal. Pay in euros to avoid a merchant’s
              currency conversion.
            </p>
          )}
          {props.size === "lg" && props.tier === "expert" && (
            <>
              <Detail label="Card ending">•• 2048</Detail>
              <Detail label="Cover until">10 October</Detail>
            </>
          )}
        </div>
      )}
      <Action onClick={() => setOpen(!open)}>
        {open ? "All set, Lina" : "Check my trip"}
      </Action>
      {open && (
        <Status>
          {abroad ? "Ready for Lisbon" : "Enable your card before you go"}
        </Status>
      )}
    </Widget>
  );
}

export function CurrencyExchange(props: BlockRenderProps) {
  const [step, setStep] = useState(0);
  const [amount, setAmount] = useState("100");
  const id = useId();
  const value = Number(amount);
  const valid = Number.isFinite(value) && value >= 1 && value <= 1240;
  const received = (value * 0.86).toFixed(2);
  const detailed = props.size !== "sm" && props.tier !== "essential";
  return (
    <Widget {...props} title="Currency pockets" icon="wallet">
      {step === 0 ? (
        <>
          <p className="tp-hero">
            €1,240<span className="tp-decimal">.00</span>
          </p>
          <p className="tp-sub">Euro pocket</p>
          {detailed && (
            <div className="tp-pockets">
              <Detail label="GBP">£320.00</Detail>
              <Detail label="JPY">¥24,000</Detail>
            </div>
          )}
          {props.size === "lg" && props.tier !== "essential" && (
            <div className="tp-inset">
              <p className="tp-eyebrow">Today’s demo rate</p>
              <p className="tp-rate">
                €1 <span>=</span> £0.86
              </p>
              <p className="tp-note">EUR → GBP · no exchange fee</p>
            </div>
          )}
          {props.tier === "expert" && props.size === "lg" && (
            <p className="tp-note">
              Mock rate held through confirmation. Spend from the matching
              currency pocket.
            </p>
          )}
          <Action onClick={() => setStep(1)}>Exchange</Action>
        </>
      ) : step < 4 ? (
        <div className="tp-flow">
          <p className="tp-eyebrow">EUR → GBP · {step} of 3</p>
          {step === 1 ? (
            <>
              <label className="tp-input-label" htmlFor={id}>
                Amount in euros
              </label>
              <input
                id={id}
                type="number"
                inputMode="decimal"
                min="1"
                max="1240"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="tp-input"
              />
              <p className="tp-note">€1,240 available. Minimum €1.</p>
            </>
          ) : step === 2 ? (
            <>
              <p className="tp-sub">You receive</p>
              <p className="tp-hero">£{received}</p>
              <Detail label="Mock rate">0.86 GBP/EUR</Detail>
            </>
          ) : (
            <>
              <p className="tp-sub">Review exchange</p>
              <Detail label="You pay">€{value.toFixed(2)}</Detail>
              <Detail label="You receive">£{received}</Detail>
              <Detail label="Fee">€0.00</Detail>
              <p className="tp-note">Demo only. No money will move.</p>
            </>
          )}
          <Action disabled={!valid} onClick={() => setStep(step + 1)}>
            {step === 3
              ? "Confirm exchange"
              : step === 2
                ? "Review fee"
                : "See rate"}
          </Action>
          <button
            type="button"
            className="tp-text-button"
            onClick={() => setStep(step - 1)}
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
        </div>
      ) : (
        <>
          <p className="tp-hero">£{received}</p>
          <Status>Demo exchange complete</Status>
          <p className="tp-note">Your real balances haven’t changed.</p>
          <Action onClick={() => setStep(0)}>Back to pockets</Action>
        </>
      )}
    </Widget>
  );
}

export function Esim(props: BlockRenderProps) {
  const [active, setActive] = useState(false);
  return (
    <Widget {...props} title="Travel eSIM" icon="phone">
      <span className="tp-proposed">Proposed service</span>
      <p className="tp-hero">5 GB</p>
      <p className="tp-sub">Portugal · 7 days</p>
      {props.size !== "sm" && props.tier !== "essential" && (
        <>
          <Detail label="One-time price">€8.00</Detail>
          {props.size === "lg" && (
            <div className="tp-inset">
              <Icon name="phone" />
              <p className="tp-heading">Land. Connect. Explore.</p>
              <p className="tp-note">
                Keep your own number. Use your travel eSIM for maps, messages
                and finding your next pastel de nata.
              </p>
            </div>
          )}
        </>
      )}
      {props.size === "lg" && props.tier === "expert" && (
        <p className="tp-note">
          Data only · compatible unlocked phone required. Starts on activation,
          expires after 7 days.
        </p>
      )}
      <Action disabled={active} onClick={() => setActive(true)}>
        {active ? "Activated in demo" : "Activate · €8"}
      </Action>
      {active && <Status>Demo eSIM ready. No charge.</Status>}
    </Widget>
  );
}

const ATMS = [
  {
    name: "Multibanco · Rossio",
    distance: "250 m",
    fee: "Fee-free",
    x: 110,
    y: 60,
  },
  {
    name: "Multibanco · Baixa",
    distance: "450 m",
    fee: "Fee-free",
    x: 215,
    y: 96,
  },
  { name: "ATM · Avenida", distance: "650 m", fee: "€3.95 fee", x: 72, y: 125 },
];

function LisbonMap({ selected }: { selected: boolean }) {
  return (
    <svg
      className="tp-map"
      viewBox="0 0 320 158"
      role="img"
      aria-label={
        selected
          ? "Demo walking route to fee-free Multibanco Rossio, 250 metres"
          : "Illustrative Lisbon map with two fee-free ATMs and one paid ATM"
      }
    >
      <rect width="320" height="158" fill="#0f2536" />
      <path
        d="M240 0L265 40 255 84 320 119V158H263L222 109 220 55Z"
        fill="#16445e"
      />
      <g fill="#193a40">
        <rect x="19" y="18" width="45" height="29" rx="8" />
        <rect x="142" y="89" width="45" height="45" rx="9" />
      </g>
      <g fill="none" stroke="#345065" strokeWidth="9">
        <path d="M0 78L252 35M30 0L118 158M115 0L203 158M0 146L273 93M205 0L270 158" />
      </g>
      <g fill="none" stroke="#506579" strokeWidth="2">
        <path d="M0 78L252 35M30 0L118 158M115 0L203 158M0 146L273 93" />
      </g>
      {selected && (
        <path
          d="M156 112L135 74 110 60"
          fill="none"
          stroke="#7bd4ff"
          strokeWidth="4"
          strokeDasharray="5 5"
        />
      )}
      <circle cx="156" cy="112" r="12" fill="#00aeef" fillOpacity=".18" />
      <circle
        cx="156"
        cy="112"
        r="5"
        fill="#77d8ff"
        stroke="#fff"
        strokeWidth="2"
      />
      {ATMS.map((atm, index) => (
        <g key={atm.name} transform={`translate(${atm.x} ${atm.y})`}>
          <circle
            r="12"
            fill={index === 2 ? "#ffc979" : "#79e3b3"}
            stroke="#0f2536"
            strokeWidth="3"
          />
          <text
            y="4"
            textAnchor="middle"
            fill="#08251c"
            fontSize="11"
            fontWeight="700"
          >
            €
          </text>
        </g>
      ))}
      <text x="19" y="24" fill="#c6d6e4" fontSize="10">
        Lisbon
      </text>
      <text x="277" y="146" fill="#a0cada" fontSize="10">
        Tejo
      </text>
    </svg>
  );
}

export function NearbyAtms(props: BlockRenderProps) {
  const [route, setRoute] = useState(false);
  const detailed = props.size !== "sm" && props.tier !== "essential";
  return (
    <Widget {...props} title="Nearby ATMs" icon="pin" tone="mint">
      {props.size === "sm" || props.tier === "essential" ? (
        <>
          <p className="tp-hero">
            250<span className="tp-unit"> m</span>
          </p>
          <p className="tp-sub">To a fee-free ATM</p>
        </>
      ) : (
        <LisbonMap selected={route} />
      )}
      {detailed && (
        <div className="tp-stack">
          {ATMS.slice(
            0,
            props.size === "lg" && props.tier === "expert"
              ? 3
              : props.size === "lg"
                ? 2
                : 1,
          ).map((atm) => (
            <div className="tp-atm" key={atm.name}>
              <div>
                <strong className="tp-atm-name">{atm.name}</strong>
                <span
                  className={atm.fee === "Fee-free" ? "tp-green" : "tp-note"}
                >
                  {atm.fee}
                </span>
              </div>
              <span>{atm.distance}</span>
            </div>
          ))}
        </div>
      )}
      <Action onClick={() => setRoute(!route)}>
        {route ? "Hide route" : "Show route"}
      </Action>
      {route && <Status>Rossio · 3 min walk north</Status>}
      <p className="tp-note">
        Mock map{detailed ? " · fee estimates for this demo" : " · Lisbon"}
      </p>
    </Widget>
  );
}
