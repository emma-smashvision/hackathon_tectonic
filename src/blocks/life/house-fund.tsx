"use client";

import { useId, useState } from "react";
import { formatEur } from "@/lib/format";
import type { BlockRenderProps } from "../types";
import { monthlyPayment } from "./parts/mortgage";
import { Action, Frame, Ring, Sheet } from "./parts/ui";

function Simulator() {
  const id = useId();
  const [price, setPrice] = useState(320000);
  const [own, setOwn] = useState(60000);
  const [years, setYears] = useState(25);
  const fields = [
    {
      key: "price",
      label: "Home price",
      value: price,
      min: 150000,
      max: 600000,
      step: 5000,
      set: setPrice,
      display: formatEur(price),
    },
    {
      key: "own",
      label: "Own contribution",
      value: own,
      min: 0,
      max: 150000,
      step: 1000,
      set: setOwn,
      display: formatEur(own),
    },
    {
      key: "term",
      label: "Term",
      value: years,
      min: 10,
      max: 30,
      step: 1,
      set: setYears,
      display: `${years} years`,
    },
  ];
  return (
    <div className="life-simulator">
      <div className="life-estimate">
        <span className="life-muted">Monthly estimate</span>
        <output className="life-number" aria-live="polite">
          {formatEur(monthlyPayment(price, own, years))}
          <small> / month</small>
        </output>
      </div>
      {fields.map((field) => (
        <div className="life-slider" key={field.key}>
          <label htmlFor={`${id}-${field.key}`}>
            {field.label}
            <strong>{field.display}</strong>
          </label>
          <input
            id={`${id}-${field.key}`}
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={field.value}
            aria-valuetext={field.display}
            onChange={(event) => field.set(Number(event.target.value))}
          />
        </div>
      ))}
      <p className="life-note">
        Illustrative fixed rate 3.5% · excludes fees and insurance. Indicative,
        not an offer.
      </p>
    </div>
  );
}

export function HouseFund(props: BlockRenderProps) {
  const [open, setOpen] = useState(false);
  const detailed = props.size === "lg" && props.tier !== "essential";
  return (
    <Frame {...props} title="House fund">
      <div className="life-fund-summary">
        <Ring value={69}>
          <span className="life-ring-value">
            69<small>%</small>
          </span>
        </Ring>
        <div>
          <p className="life-number life-fund-number">{formatEur(41300)}</p>
          <p className="life-muted">of {formatEur(60000)}</p>
          {props.size !== "sm" && (
            <p className="life-note">Sofie & Pieter’s first home</p>
          )}
        </div>
      </div>
      {detailed ? (
        <Simulator />
      ) : (
        <>
          <p className="life-note life-fund-caption">
            {props.tier === "expert"
              ? `${formatEur(18700)} to your goal`
              : "A place to call yours."}
          </p>
          <Action onClick={() => setOpen(true)}>
            {props.size === "sm" ? "Explore" : "Explore your mortgage"}
          </Action>
        </>
      )}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Explore your mortgage"
        largeText={props.largeText}
      >
        <Simulator />
      </Sheet>
    </Frame>
  );
}
