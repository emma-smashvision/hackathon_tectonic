"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import type { BlockRenderProps } from "../types";
import { Action, Chip, Frame, LifeIcon, Sheet } from "./parts/ui";

const stages = ["Visits", "Offer", "Mortgage", "Notary", "Keys"];
const documents = [
  "Payslips",
  "Identity cards",
  "Compromise",
  "Property details",
];

export function BuyingTimeline(props: BlockRenderProps) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState([true, true, false, false]);
  const count = ready.filter(Boolean).length;
  const checklist = (
    <div className="life-checklist">
      {documents.map((doc, index) => (
        <label className="life-check-row" key={doc}>
          <input
            type="checkbox"
            checked={ready[index]}
            onChange={() =>
              setReady((values) =>
                values.map((value, i) => (i === index ? !value : value)),
              )
            }
          />
          <span>{doc}</span>
        </label>
      ))}
      <p className="life-note">
        {count} of 4 ready · mark documents as prepared. Your files stay with
        you.
      </p>
    </div>
  );
  return (
    <Frame {...props} title="Your first home" tone="mint">
      <div className="life-heading">
        <LifeIcon name="home" />
        <div>
          <p className="life-title">Mortgage</p>
          <p className="life-muted">Your next chapter</p>
        </div>
      </div>
      {props.size !== "sm" && props.tier !== "essential" && (
        <ol className="life-timeline" aria-label="House-buying progress">
          {stages.map((stage, index) => (
            <li
              key={stage}
              data-state={
                index < 2 ? "done" : index === 2 ? "current" : "upcoming"
              }
              aria-current={index === 2 ? "step" : undefined}
            >
              <span className="life-step">
                {index < 2 ? <Icon name="check" /> : index + 1}
              </span>
              <span>{stage}</span>
              <span className="life-sr">
                {index < 2
                  ? ", complete"
                  : index === 2
                    ? ", current"
                    : ", upcoming"}
              </span>
            </li>
          ))}
        </ol>
      )}
      {props.size === "lg" && props.tier !== "essential" ? (
        <>
          <div className="life-section-heading">
            <h3>Documents</h3>
            <Chip tone={count === 4 ? "ok" : "warn"}>{count}/4 ready</Chip>
          </div>
          {checklist}
        </>
      ) : (
        <p className="life-muted">{count}/4 documents ready</p>
      )}
      {props.tier === "expert" && props.size !== "sm" && (
        <p className="life-note">Next: bring your documents to your advisor.</p>
      )}
      <Action onClick={() => setOpen(true)}>
        {props.size === "sm" ? "Documents" : "Prepare documents"}
      </Action>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Your mortgage documents"
        largeText={props.largeText}
      >
        {checklist}
      </Sheet>
    </Frame>
  );
}
