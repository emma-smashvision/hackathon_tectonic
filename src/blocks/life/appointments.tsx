"use client";

import { useState } from "react";
import type { BlockRenderProps } from "../types";
import { Action, Frame, Sheet } from "./parts/ui";

const slots = [
  {
    label: "Thu 10:00",
    day: "01",
    date: "20261001T080000Z",
    end: "20261001T090000Z",
  },
  {
    label: "Fri 14:00",
    day: "02",
    date: "20261002T120000Z",
    end: "20261002T130000Z",
  },
  {
    label: "Mon 11:00",
    day: "05",
    date: "20261005T090000Z",
    end: "20261005T100000Z",
  },
];

export function Appointments(props: BlockRenderProps) {
  const [slot, setSlot] = useState(0);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  function calendar() {
    const event = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//KBC Prototype//Life Moments//EN",
      "BEGIN:VEVENT",
      "UID:mock-mortgage-advisor@kbc.example",
      "DTSTAMP:20260930T100000Z",
      `DTSTART:${slots[slot].date}`,
      `DTEND:${slots[slot].end}`,
      "SUMMARY:Mortgage advisor (demo)",
      "LOCATION:KBC Leuven",
      "DESCRIPTION:Synthetic prototype appointment.",
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([event], { type: "text/calendar;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "mortgage-advisor.ics";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Calendar file downloaded");
  }
  return (
    <Frame {...props} title="Appointments">
      <div className="life-appointment">
        <div className="life-date">
          <span>Oct</span>
          <strong>{slots[slot].day}</strong>
        </div>
        <div>
          <p className="life-title">Mortgage advisor</p>
          <p className="life-time">{slots[slot].label}</p>
          {props.size !== "sm" && <p className="life-muted">KBC Leuven</p>}
        </div>
      </div>
      {props.size === "sm" && <p className="life-muted">KBC Leuven</p>}
      {props.size === "lg" && props.tier !== "essential" && (
        <div className="life-upcoming">
          <h3>Also coming up</h3>
          <div className="life-row">
            <div>
              <strong>Estate agent</strong>
              <p className="life-muted">Final property visit</p>
            </div>
            <span>
              6 Oct
              <br />
              16:30
            </span>
          </div>
          <div className="life-row">
            <div>
              <strong>Notary</strong>
              <p className="life-muted">Deed preparation</p>
            </div>
            <span>
              12 Oct
              <br />
              09:00
            </span>
          </div>
        </div>
      )}
      {props.tier === "expert" && props.size !== "sm" && (
        <p className="life-note">60 min · bring your ID and payslips</p>
      )}
      <div className="life-actions">
        <Action onClick={props.size === "sm" ? () => setOpen(true) : calendar}>
          {props.size === "sm" ? "View visit" : "Add to calendar"}
        </Action>
        {props.tier !== "essential" && props.size !== "sm" && (
          <Action secondary onClick={() => setOpen(true)}>
            Reschedule
          </Action>
        )}
      </div>
      <span className="life-notice" role="status">
        {notice}
      </span>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Your advisor appointment"
        largeText={props.largeText}
      >
        <p className="life-muted">Mortgage advisor · KBC Leuven</p>
        <p className="life-note">
          Demo availability. Changes stay in this prototype.
        </p>
        <Action onClick={calendar}>Add to calendar</Action>
        <p className="life-note">Reschedule to a demo time:</p>
        <div className="life-slot-list">
          {slots.map((item, index) => (
            <Action
              key={item.label}
              secondary
              onClick={() => {
                setSlot(index);
                setOpen(false);
                setNotice("Demo appointment rescheduled");
              }}
            >
              {item.label} · {item.day} Oct{slot === index ? " (current)" : ""}
            </Action>
          ))}
        </div>
      </Sheet>
    </Frame>
  );
}
