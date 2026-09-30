"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { amountInCents, isStructuredCommunication } from "./money-input";

type Route = "contact" | "bill" | "qr";
type Step = "options" | "camera" | "details" | "review" | "success";
const CONTACTS = ["Alex Vermeer", "Sam Peeters", "Robin Jacobs"];

/** Deliberately local: no account mutations, camera access or payment requests. */
export function MoneyFlow({
  kind,
  onClose,
}: {
  kind: "transfer" | "pay";
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>(
    kind === "pay" ? "options" : "details",
  );
  const [route, setRoute] = useState<Route>("contact");
  const [account, setAccount] = useState("Current account");
  const [contact, setContact] = useState(CONTACTS[0]);
  const [newRecipient, setNewRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [communication, setCommunication] = useState("");
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const initial = useRef(true);
  const id = useId();
  const reduced = useReducedMotion();
  const cents = amountInCents(amount);
  const recipient =
    route === "bill"
      ? "Demo Utilities"
      : route === "qr"
        ? "Demo Corner Café"
        : contact === "new"
          ? newRecipient.trim()
          : contact;
  const formatted = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents !== null && cents % 100 === 0 ? 0 : 2,
  }).format((cents ?? 0) / 100);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    if (step) heading.current?.focus({ preventScroll: true });
  }, [step]);

  const choose = (next: Route) => {
    setRoute(next);
    setError("");
    setStep(next === "qr" ? "camera" : "details");
  };
  const title =
    step === "options"
      ? "How would you like to pay?"
      : step === "camera"
        ? "Scan a demo QR"
        : step === "review"
          ? "Review your payment"
          : step === "success"
            ? "Payment complete"
            : route === "bill"
              ? "Pay a bill"
              : route === "qr"
                ? "Pay Demo Corner Café"
                : kind === "transfer"
                  ? "Make a transfer"
                  : "Pay a contact";

  return (
    <div className="money-flow">
      <p className="money-demo">Demo – no real money moves</p>
      <h3 ref={heading} tabIndex={-1} className="money-heading">
        {title}
      </h3>
      {step === "options" && (
        <div className="money-options">
          <button type="button" onClick={() => choose("qr")}>
            Scan QR / Payconiq-style{" "}
            <span className="money-option-hint">
              Try a simulated QR payment
            </span>
          </button>
          <button type="button" onClick={() => choose("bill")}>
            Pay a bill{" "}
            <span className="money-option-hint">
              Enter a structured communication
            </span>
          </button>
          <button type="button" onClick={() => choose("contact")}>
            Pay a contact{" "}
            <span className="money-option-hint">
              Choose a recent demo contact
            </span>
          </button>
        </div>
      )}
      {step === "camera" && (
        <>
          <div
            className="money-camera"
            role="img"
            aria-label="Mock camera frame with a sample QR symbol"
          >
            <span className="money-qr-symbol" aria-hidden="true">
              ▦
            </span>
            <p>Mock camera · no camera access</p>
          </div>
          <p>Try a €12.50 payment to our fictional Demo Corner Café.</p>
          <button
            type="button"
            className="money-primary"
            onClick={() => {
              setAmount("12.50");
              setStep("details");
            }}
          >
            Use demo QR
          </button>
          <button type="button" onClick={() => setStep("options")}>
            Back to payment options
          </button>
        </>
      )}
      {step === "details" && (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!recipient) {
              setError("Enter a name for the demo recipient.");
              return;
            }
            if (cents === null) {
              setError(
                "Enter an amount above €0 with up to two decimal places.",
              );
              return;
            }
            if (route === "bill" && !isStructuredCommunication(communication)) {
              setError(
                "Use the format +++123/4567/89012+++ for the structured communication.",
              );
              return;
            }
            setError("");
            setStep("review");
          }}
        >
          <label htmlFor={`${id}-account`}>From account</label>
          <select
            id={`${id}-account`}
            value={account}
            onChange={(event) => setAccount(event.target.value)}
          >
            <option>Current account</option>
            <option>Savings account</option>
          </select>
          {route === "contact" && (
            <>
              <label htmlFor={`${id}-recipient`}>
                Recipient · recent demo contacts
              </label>
              <select
                id={`${id}-recipient`}
                value={contact}
                onChange={(event) => setContact(event.target.value)}
              >
                {CONTACTS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
                <option value="new">New recipient</option>
              </select>
              {contact === "new" && (
                <>
                  <label htmlFor={`${id}-name`}>
                    New recipient name (demo)
                  </label>
                  <input
                    id={`${id}-name`}
                    autoComplete="off"
                    maxLength={60}
                    value={newRecipient}
                    onChange={(event) => setNewRecipient(event.target.value)}
                    required
                  />
                </>
              )}
            </>
          )}
          {route === "bill" && (
            <>
              <p>
                Bill recipient: <strong>Demo Utilities</strong>
              </p>
              <label htmlFor={`${id}-communication`}>
                Structured communication
              </label>
              <input
                id={`${id}-communication`}
                type="text"
                placeholder="+++123/4567/89012+++"
                aria-describedby={`${id}-communication-help`}
                value={communication}
                onChange={(event) => setCommunication(event.target.value)}
                required
              />
              <p id={`${id}-communication-help`} className="money-hint">
                Demo format: +++123/4567/89012+++
              </p>
            </>
          )}
          <label htmlFor={`${id}-amount`}>Amount (€)</label>
          <input
            className="money-amount"
            id={`${id}-amount`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            maxLength={10}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <fieldset className="money-keypad" aria-label="Amount keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
              (key) => (
                <button
                  type="button"
                  key={key}
                  aria-label={
                    key === "⌫"
                      ? "Delete last digit"
                      : key === "."
                        ? "Decimal point"
                        : key
                  }
                  onClick={() =>
                    setAmount((value) =>
                      key === "⌫"
                        ? value.slice(0, -1)
                        : value.length < 10
                          ? value + key
                          : value,
                    )
                  }
                >
                  {key}
                </button>
              ),
            )}
          </fieldset>
          <label htmlFor={`${id}-message`}>Message (optional)</label>
          <input
            id={`${id}-message`}
            value={message}
            maxLength={140}
            onChange={(event) => setMessage(event.target.value)}
          />
          {error && (
            <p className="money-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="money-primary">
            Review
          </button>
          {kind === "pay" && (
            <button type="button" onClick={() => setStep("options")}>
              Back to payment options
            </button>
          )}
        </form>
      )}
      {step === "review" && (
        <>
          <dl className="money-summary">
            <div>
              <dt>From</dt>
              <dd>{account}</dd>
            </div>
            <div>
              <dt>To</dt>
              <dd>{recipient}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatted}</dd>
            </div>
            {route === "bill" && (
              <div>
                <dt>Communication</dt>
                <dd>{communication.trim()}</dd>
              </div>
            )}
            {message && (
              <div>
                <dt>Message</dt>
                <dd>{message}</dd>
              </div>
            )}
          </dl>
          <button
            type="button"
            className="money-primary"
            onClick={() => setStep("success")}
          >
            Confirm
          </button>
          <button type="button" onClick={() => setStep("details")}>
            Back to edit
          </button>
        </>
      )}
      {step === "success" && (
        <div className="money-success" role="status">
          <motion.svg
            viewBox="0 0 64 64"
            aria-hidden="true"
            initial={reduced ? false : { scale: 0.7 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <circle cx="32" cy="32" r="30" fill="#d9f5e8" />
            <motion.path
              d="M18 32l9 9 19-20"
              fill="none"
              stroke="#126044"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduced ? 0 : 0.4 }}
            />
          </motion.svg>
          <p>
            <strong>
              {formatted} sent to {recipient}
            </strong>
          </p>
          <p>This was a simulation. Your balances are unchanged.</p>
          <button type="button" className="money-primary" onClick={onClose}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}
