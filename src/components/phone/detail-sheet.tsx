"use client";

import { motion, useDragControls, useReducedMotion } from "motion/react";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { Icon } from "../ui";

/** Native modal dialog supplies inert background, focus containment and Escape. */
export function DetailSheet({
  title,
  onClose,
  children,
  strip,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional compact row shown above the sheet, e.g. the bubble strip. */
  strip?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const reduced = useReducedMotion();
  const drag = useDragControls();
  // Layout effect: the dialog is open and positioned before shared-layout
  // animations measure it on the next frame.
  useLayoutEffect(() => {
    const element = dialog.current;
    const phone = element?.closest(".phone");
    if (!element || !phone) return;
    const previous = document.activeElement as HTMLElement | null;
    const position = () => {
      const rect = phone.getBoundingClientRect();
      Object.assign(element.style, {
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      });
    };
    position();
    element.showModal();
    closeButton.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    observer.observe(phone);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      element.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      else
        phone
          .querySelector<HTMLButtonElement>("[data-kate-trigger]")
          ?.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label={title}
      className="phone-dialog"
      data-has-strip={Boolean(strip)}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const items = [
          ...e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, a[href], [tabindex="0"]',
          ),
        ].filter((el) => el.checkVisibility());
        const first = items[0];
        const last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
    >
      <button
        type="button"
        className="phone-dialog-scrim"
        aria-label="Dismiss overlay"
        tabIndex={-1}
        onClick={onClose}
      />
      {strip}
      <motion.section
        className="detail-sheet"
        initial={{ y: reduced ? 0 : 140, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { type: "spring", stiffness: 340, damping: 30, mass: 0.9 }
        }
        drag={reduced ? false : "y"}
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 65 || info.velocity.y > 500) onClose();
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-navy/10 px-4 py-2">
          <button
            type="button"
            aria-label="Swipe down or tap to close"
            className="tap flex w-14 touch-none items-center justify-center"
            onPointerDown={(e) => drag.start(e)}
            onClick={onClose}
          >
            <span className="h-1 w-9 rounded-full bg-navy/25" />
          </button>
          <h2 className="t-title text-navy">{title}</h2>
          <button
            type="button"
            ref={closeButton}
            aria-label="Close panel"
            className="tap flex w-12 items-center justify-center rounded-full text-navy"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-3">{children}</div>
      </motion.section>
    </dialog>
  );
}
