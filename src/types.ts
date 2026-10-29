/** Anything `onPaste` knows how to attach a listener to. */
export type PasteTarget =
  | string
  | EventTarget
  | ArrayLike<EventTarget>
  | Iterable<EventTarget>;

/** The object handed to your callback for every paste. */
export interface PasteInfo {
  /** Pasted plain text (`text/plain`), or `''` when the clipboard held none. */
  text: string;
  /** Pasted rich text (`text/html`), or `null` when the clipboard held none. */
  html: string | null;
  /** Files and images on the clipboard. Empty when nothing was pasted as a file. */
  files: File[];
  /** MIME types the clipboard offered, e.g. `['text/plain', 'text/html']`. */
  types: string[];
  /** The element the paste landed in. */
  target: Element;
  /** The element the listener is attached to — same as `target` without `selector`. */
  currentTarget: Element;
  /** The underlying DOM event, for anything this payload does not cover. */
  event: ClipboardEvent;
  /** Shorthand for `event.preventDefault()`. */
  preventDefault(): void;
  /**
   * Replace the current selection in `target` with `value`, leaving the caret
   * after it. Prevents the default paste on first use, so the browser does not
   * also insert the original clipboard contents.
   */
  insert(value: string): void;
}

export type PasteHandler = (info: PasteInfo) => void;

export interface OnPasteOptions {
  /**
   * Listen on an ancestor and only fire for pastes whose target matches this
   * selector (event delegation) — handy for fields added after binding.
   */
  selector?: string;
  /**
   * Fire only when the clipboard offers at least one of these MIME types.
   * Accepts exact types (`'text/html'`) and wildcards (`'image/*'`).
   */
  types?: string | string[];
  /** Call `preventDefault()` before the handler runs, blocking the native paste. */
  preventDefault?: boolean;
  /**
   * Return a string to paste in place of the clipboard text — e.g. to strip
   * formatting or trim whitespace. Return `undefined` to leave the paste alone,
   * `null` or `false` to drop it entirely.
   */
  transform?: (info: PasteInfo) => string | null | undefined | false;
  /** Detach automatically after the handler has run once. */
  once?: boolean;
  /** Listen during the capture phase. */
  capture?: boolean;
  /** Detach when this signal aborts. */
  signal?: AbortSignal;
}

/** Detaches the listeners `onPaste` attached. Safe to call more than once. */
export type Unsubscribe = () => void;
