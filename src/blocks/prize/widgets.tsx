"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { Action, Detail, Status, Widget } from "@/blocks/travel/parts/widget";
import type { BlockRenderProps } from "@/blocks/types";
import { Icon } from "@/components/ui";

const CONFETTI = Array.from({ length: 14 }, (_, i) => ({
  id: `confetti-${i}`,
  left: `${8 + ((i * 23) % 85)}%`,
  rotate: i * 37,
  delay: (i % 5) * 0.08,
  color: ["#ffd888", "#78d8fc", "#97e1c1"][i % 3],
}));

export function PrizeCelebration(props: BlockRenderProps) {
  const reduced = useReducedMotion();
  const [receipt, setReceipt] = useState(false);
  return (
    <Widget {...props} title="You did it" icon="trophy" tone="gold">
      <div className="prize-confetti" aria-hidden="true">
        {CONFETTI.map((piece) => (
          <motion.i
            key={piece.id}
            style={{ left: piece.left, backgroundColor: piece.color }}
            initial={{ y: -8, opacity: 0, rotate: 0 }}
            animate={
              reduced
                ? { opacity: 0 }
                : {
                    y: [0, 85],
                    opacity: [0, 0.8, 0],
                    rotate: piece.rotate,
                  }
            }
            transition={{
              duration: 1.8,
              delay: piece.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
      <p className="tp-hero prize-amount">€10,000</p>
      <p className="tp-sub">from Spott just arrived</p>
      {props.size !== "sm" && props.tier !== "essential" && (
        <>
          <p className="prize-cheer">
            Big ideas.
            <br />
            Well earned.
          </p>
          <p className="tp-note">
            Emma & Thomas, you won the hackathon. Take a moment. This one’s
            yours.
          </p>
        </>
      )}
      {props.size === "lg" && props.tier === "expert" && (
        <>
          <Detail label="From">Spott</Detail>
          <Detail label="Reference">Hackathon winners</Detail>
        </>
      )}
      <Action onClick={() => setReceipt(!receipt)}>
        {receipt ? "Close receipt" : "View prize"}
      </Action>
      {receipt && (
        <div className="tp-inset" role="status">
          <Detail label="Received">€10,000.00</Detail>
          <p className="tp-note">
            Spott · 30 September 2026
            <br />
            Demo payment · account •• 1024
          </p>
        </div>
      )}
    </Widget>
  );
}

const TEAM = [
  { name: "Emma", initials: "EM", color: "#b4d8f2" },
  { name: "Thomas", initials: "TH", color: "#c8bce8" },
  { name: "Noor", initials: "NO", color: "#b4e1cd" },
  { name: "Louis", initials: "LO", color: "#ecd0a5" },
];

export function TeamSplit(props: BlockRenderProps) {
  const [split, setSplit] = useState(false);
  const detailed = props.size !== "sm" && props.tier !== "essential";
  return (
    <Widget {...props} title="Share the win" icon="user" tone="lilac">
      <p className="tp-hero">€2,500</p>
      <p className="tp-sub">Each, for all four of you</p>
      {detailed &&
        (props.size === "lg" ? (
          <div className="prize-team">
            {TEAM.map((person) => (
              <div className="prize-person" key={person.name}>
                <span
                  className="prize-avatar"
                  style={{ background: person.color }}
                >
                  {person.initials}
                </span>
                <strong>{person.name}</strong>
                <span>€2,500</span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="prize-avatars"
            role="img"
            aria-label="Emma, Thomas, Noor and Louis"
          >
            {TEAM.map((person) => (
              <span
                key={person.name}
                className="prize-avatar"
                style={{ background: person.color }}
              >
                {person.initials}
              </span>
            ))}
          </div>
        ))}
      {props.size === "lg" && props.tier === "expert" && (
        <Detail label="Equal split">4 × 25%</Detail>
      )}
      <Action disabled={split} onClick={() => setSplit(true)}>
        {split ? "Split in demo" : "Split €10,000"}
      </Action>
      {split ? (
        <Status>Four shares created. No money moved.</Status>
      ) : (
        <p className="tp-note">Demo only · no transfers</p>
      )}
    </Widget>
  );
}

const STEPS = [
  "Choose a business account",
  "Prepare company registration",
  "Explore Start it @KBC",
];

export function StartBusiness(props: BlockRenderProps) {
  const [started, setStarted] = useState(false);
  const detailed = props.size !== "sm" && props.tier !== "essential";
  return (
    <Widget {...props} title="Your next chapter" icon="box">
      <p className="tp-heading">
        Make it
        <br />a business.
      </p>
      <p className="tp-sub">From winning idea to day one.</p>
      {(detailed || started) && (
        <ol className="prize-steps">
          {STEPS.slice(0, props.size === "lg" || started ? 3 : 2).map(
            (step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                <div>
                  {step}
                  {props.size === "lg" && props.tier === "expert" && (
                    <small>
                      {
                        [
                          "Keep project spending separate.",
                          "Gather founders’ details and a plan.",
                          "Discover support for your startup.",
                        ][index]
                      }
                    </small>
                  )}
                </div>
              </li>
            ),
          )}
        </ol>
      )}
      {props.size === "lg" && props.tier !== "essential" && (
        <div className="tp-inset prize-start">
          <Icon name="sparkle" />
          <strong>Start it @KBC</strong>
          <p className="tp-note">
            Explore a startup community, coaching and a place to develop your
            idea.
          </p>
        </div>
      )}
      <Action disabled={started} onClick={() => setStarted(true)}>
        {started ? "Checklist ready" : "Start my checklist"}
      </Action>
      {started && <Status>Demo checklist saved. No application sent.</Status>}
    </Widget>
  );
}

const ALLOCATION = [
  { name: "Holiday pot", value: "€3,000", className: "prize-holiday" },
  { name: "Buffer", value: "€5,000", className: "prize-buffer" },
  { name: "Investing starter", value: "€2,000", className: "prize-invest" },
];

export function PutToWork(props: BlockRenderProps) {
  const [saved, setSaved] = useState(false);
  const detailed = props.size !== "sm" && props.tier !== "essential";
  return (
    <Widget {...props} title="Put it to work" icon="chart" tone="mint">
      <p className="tp-heading">
        A little now.
        <br />A little later.
      </p>
      <div
        className="prize-allocation"
        role="img"
        aria-label="Example split: holiday 30 percent, buffer 50 percent, investing starter 20 percent"
      >
        <span className="prize-holiday" />
        <span className="prize-buffer" />
        <span className="prize-invest" />
      </div>
      {detailed ? (
        <div className="tp-stack">
          {ALLOCATION.map((item) => (
            <div className="prize-allocation-row" key={item.name}>
              <span className={`prize-key ${item.className}`} />
              <span>{item.name}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="tp-sub">Holiday. Buffer. Future.</p>
      )}
      {props.size === "lg" && props.tier === "expert" && (
        <p className="tp-note">
          An example using the full €10,000 prize, before any team split or tax.
          Investments can lose value.
        </p>
      )}
      <Action disabled={saved} onClick={() => setSaved(true)}>
        {saved ? "Example saved" : "Save this example"}
      </Action>
      {saved && <Status>Saved in demo. No funds allocated.</Status>}
      <p className="tp-note prize-disclaimer">
        Information only, not advice. Prize money may be taxable.
      </p>
    </Widget>
  );
}

const SUGGESTIONS = [
  {
    label: "Split our prize",
    response:
      "A four-way split of €10,000 gives each teammate €2,500. Try “Share the win” to create demo shares.",
  },
  {
    label: "Plan for tax",
    response:
      "Prize money may be taxable. Keep your prize receipt and check your situation with a qualified tax professional before allocating it.",
  },
  {
    label: "Start our business",
    response:
      "Start with a separate business account, prepare your registration details, and explore Start it @KBC. Your next chapter has a demo checklist.",
  },
  {
    label: "Prepare my trip",
    response:
      "For Lisbon, check your card-abroad setting and travel cover. You can also explore the proposed Portugal eSIM.",
  },
  {
    label: "Build a buffer",
    response:
      "A buffer keeps money available for unexpected costs. “Put it to work” shows one illustrative split of the prize.",
  },
];

export function KateSuggestions(props: BlockRenderProps) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const detailed = props.size !== "sm" && props.tier !== "essential";
  function ask() {
    if (!query.trim()) return;
    const match = /tax/i.test(query)
      ? 1
      : /business|company/i.test(query)
        ? 2
        : /trip|travel|lisbon/i.test(query)
          ? 3
          : /buffer|save/i.test(query)
            ? 4
            : /split|prize|team/i.test(query)
              ? 0
              : -1;
    setResponse(
      match < 0
        ? "In this demo I can help you explore splitting your prize, tax, a business, travel or a buffer. Try one of the suggestions."
        : SUGGESTIONS[match].response,
    );
    setQuery("");
  }
  return (
    <Widget {...props} title="Kate" icon="sparkle" tone="lilac">
      <p className="tp-heading">
        A win worth
        <br />
        planning for.
      </p>
      {detailed && <p className="tp-sub">What would you like to do next?</p>}
      {(detailed || expanded) && (
        <div className="prize-suggestions">
          {SUGGESTIONS.slice(0, 3).map((suggestion) => (
            <button
              type="button"
              key={suggestion.label}
              onClick={() => setResponse(suggestion.response)}
            >
              {suggestion.label}
              <Icon name="arrow-up-right" />
            </button>
          ))}
        </div>
      )}
      {props.size === "sm" && !expanded ? (
        <Action onClick={() => setExpanded(true)}>Ask Kate</Action>
      ) : (
        <form
          className="prize-ask"
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
        >
          <label className="tp-sr-only" htmlFor={id}>
            Ask Kate a question
          </label>
          <input
            id={id}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask Kate…"
            maxLength={240}
          />
          <button
            type="submit"
            disabled={!query.trim()}
            aria-label="Send question to demo Kate"
          >
            <Icon name="send" />
          </button>
        </form>
      )}
      {response && (
        <div role="status" className="prize-response">
          <strong>Kate</strong>
          <p>{response}</p>
        </div>
      )}
      <p className="tp-note">Demo suggestions · no AI connection</p>
      {props.size === "lg" && props.tier === "expert" && (
        <p className="tp-note">
          Based on your prize moment. Answers are prewritten for this prototype.
        </p>
      )}
    </Widget>
  );
}
