/**
 * Click-away layer behind a modal panel. A real button (not a clickable div) so it is
 * announced correctly; Escape handles keyboard dismissal, so it stays out of the tab order.
 * The panel placed after it must be `relative` to sit above it.
 */
export function ModalBackdrop({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label="Close dialog"
      className="absolute inset-0 cursor-default"
      onClick={onClick}
    />
  );
}
