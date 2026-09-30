"use client";

import { useState } from "react";
import type { BlockRenderProps } from "../types";
import { Action, Chip, Frame, LifeIcon, Sheet } from "./parts/ui";

const policies = [
  {
    name: "Home contents",
    status: "To arrange",
    detail: "Your furniture and belongings",
    tone: "warn" as const,
  },
  {
    name: "Fire insurance",
    status: "In review",
    detail: "Your new home and building",
    tone: "muted" as const,
  },
  {
    name: "Debt balance",
    status: "To arrange",
    detail: "Cover linked to your mortgage",
    tone: "warn" as const,
  },
];

export function Insurance(props: BlockRenderProps) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  return (
    <Frame {...props} title="Home insurance" tone="amber">
      <div className="life-heading">
        <LifeIcon name="shield" />
        <div>
          <p className="life-title">2 to arrange</p>
          <p className="life-muted">Before the keys</p>
        </div>
      </div>
      {props.size !== "sm" && props.tier !== "essential" && (
        <div className="life-policy-list">
          {policies.map((policy) => (
            <div className="life-row" key={policy.name}>
              <div>
                <strong>{policy.name}</strong>
                {props.size === "lg" && props.tier === "expert" && (
                  <p className="life-note">{policy.detail}</p>
                )}
              </div>
              <Chip tone={policy.tone}>{policy.status}</Chip>
            </div>
          ))}
        </div>
      )}
      {props.size === "lg" && props.tier !== "essential" && (
        <p className="life-note">
          Keep your cover and start dates together as your move takes shape.
        </p>
      )}
      <Action onClick={() => setOpen(true)}>
        {props.size === "sm" ? "Review" : "Review your cover"}
      </Action>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Insurance to arrange"
        largeText={props.largeText}
      >
        <div className="life-policy-list">
          {policies.map((policy) => (
            <div className="life-row" key={policy.name}>
              <div>
                <strong>{policy.name}</strong>
                <p className="life-note">{policy.detail}</p>
              </div>
              <Chip tone={policy.tone}>{policy.status}</Chip>
            </div>
          ))}
        </div>
        <p className="life-note">
          Discuss cover, exclusions and start dates at your mortgage
          appointment.
        </p>
        <Action onClick={() => setAdded(true)}>
          {added ? "Added to your agenda" : "Add to appointment agenda"}
        </Action>
        <p className="life-notice" role="status">
          {added ? "Saved in this demo for your advisor appointment." : ""}
        </p>
      </Sheet>
    </Frame>
  );
}
