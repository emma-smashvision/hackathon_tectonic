import type { ReactNode } from "react";
import type { BlockSize } from "./types";

/**
 * The shared frame every block renders inside: size footprint, radius,
 * glass surface and an optional header. Blocks own everything inside it.
 */
export function BlockShell({
  size,
  title,
  accent,
  children,
  className = "",
}: {
  size: BlockSize;
  title?: string;
  /** CSS colour for the header dot/icon tint. */
  accent?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`block-shell ${className}`}
      data-size={size}
      style={
        accent
          ? ({ "--block-accent": accent } as React.CSSProperties)
          : undefined
      }
      aria-label={title}
    >
      {title ? (
        <header className="block-shell__header">
          <span className="block-shell__dot" aria-hidden="true" />
          <span>{title}</span>
        </header>
      ) : null}
      <div className="block-shell__body">{children}</div>
    </section>
  );
}
