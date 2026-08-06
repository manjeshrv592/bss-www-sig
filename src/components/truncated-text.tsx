import { cn } from "@/lib/utils";

/**
 * Text that truncates instead of stretching its table column.
 *
 * The width cap lives on this inner block deliberately: a table using the
 * default `auto` layout ignores `max-width` on `<td>` itself, so a long value
 * widens the column, pushes the table past its container, and the last columns
 * get clipped out of view. A block inside the cell is constrained normally.
 *
 * `title` carries the full value, since truncation hides it.
 */
export function TruncatedText({
  children,
  maxWidth = "16rem",
  lines = 1,
  className,
}: {
  children: string;
  /** Any CSS length. Applied to this element, not the surrounding cell. */
  maxWidth?: string;
  /** More than one switches from ellipsis to a clamped block. */
  lines?: number;
  className?: string;
}) {
  return (
    <span
      title={children}
      style={
        lines > 1
          ? { maxWidth, WebkitLineClamp: lines }
          : { maxWidth }
      }
      className={cn(
        "block",
        lines > 1
          ? "overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] break-words"
          : "truncate",
        className
      )}
    >
      {children}
    </span>
  );
}
