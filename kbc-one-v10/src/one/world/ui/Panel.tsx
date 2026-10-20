"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./world.module.css";

/** Non-modal: the island and area rail remain available to keyboard users. */
export function Panel({ title, subtitle, onClose, onBack, children, wide = false }: {
  title: string; subtitle?: string; onClose: () => void; onBack?: () => void; children: ReactNode; wide?: boolean;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [title]);
  return <aside className={styles.panel} aria-labelledby={id} data-testid="world-panel" data-wide={wide}>
    <header className={styles.panelHeader}>
      {onBack && <button className={styles.iconButton} type="button" onClick={onBack} aria-label="Back to area"><Icon name="back" /></button>}
      <div>{subtitle && <p>{subtitle}</p>}<h2 ref={heading} id={id} tabIndex={-1}>{title}</h2></div>
      <button className={styles.iconButton} type="button" onClick={onClose} aria-label="Close area panel"><Icon name="close" /></button>
    </header>
    <div className={styles.panelBody}>{children}</div>
  </aside>;
}
