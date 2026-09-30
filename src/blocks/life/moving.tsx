"use client";

import { useState } from "react";
import type { BlockRenderProps } from "../types";
import { Action, Frame, Ring, Sheet } from "./parts/ui";

const tasks = [
  "Book the movers",
  "Collect packing boxes",
  "Change your address",
  "Arrange utilities",
  "Update your insurance",
];

export function MovingChecklist(props: BlockRenderProps) {
  const [done, setDone] = useState([true, true, false, false, false]);
  const [open, setOpen] = useState(false);
  const count = done.filter(Boolean).length;
  const next = tasks.find((_, i) => !done[i]);
  const checklist = (
    <div className="life-checklist">
      {tasks.map((task, i) => (
        <label className="life-check-row" key={task}>
          <input
            type="checkbox"
            checked={done[i]}
            onChange={() =>
              setDone((values) =>
                values.map((value, index) => (index === i ? !value : value)),
              )
            }
          />
          <span>{task}</span>
        </label>
      ))}
    </div>
  );
  return (
    <Frame {...props} title="Moving day" tone="mint">
      <div className="life-moving-summary">
        <Ring value={count * 20}>
          <strong className="life-ring-value">
            {count}
            <small>/5</small>
          </strong>
        </Ring>
        <div>
          <p className="life-title">
            {props.size === "sm"
              ? (next ?? "All set, Tom")
              : count === 5
                ? "All set, Tom"
                : "Nearly home, Tom"}
          </p>
          {props.size !== "sm" && (
            <p className="life-muted">24 October · Leuven</p>
          )}
        </div>
      </div>
      {props.size === "lg" && props.tier !== "essential" ? (
        checklist
      ) : (
        <div className="life-next" hidden={props.size === "sm"}>
          <span className="life-note">
            {next ? "Up next" : "Ready for moving day"}
          </span>
          {next && <p className="life-title">{next}</p>}
        </div>
      )}
      {props.tier === "expert" && props.size !== "sm" && (
        <p className="life-note">
          Address change: register with your new municipality after the move.
        </p>
      )}
      <Action onClick={() => setOpen(true)}>
        {props.size === "sm" ? "Checklist" : "Open moving checklist"}
      </Action>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Tom’s moving checklist"
        largeText={props.largeText}
      >
        <p className="life-muted" role="status">
          {count} of 5 done · 24 October
        </p>
        {checklist}
      </Sheet>
    </Frame>
  );
}
