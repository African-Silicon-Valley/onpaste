import { buildInfo, hasType } from './clipboard.js';
import { insertText } from './insert.js';
import type {
  OnPasteOptions,
  PasteHandler,
  PasteInfo,
  PasteTarget,
  Unsubscribe,
} from './types.js';

export type {
  OnPasteOptions,
  PasteHandler,
  PasteInfo,
  PasteTarget,
  Unsubscribe,
} from './types.js';
export { insertText } from './insert.js';

function isElement(value: unknown): value is Element {
  return !!value && (value as Node).nodeType === 1;
}

function isEventTarget(value: unknown): value is EventTarget {
  return !!value && typeof (value as EventTarget).addEventListener === 'function';
}

function resolveTargets(target: PasteTarget): EventTarget[] {
  if (typeof target === 'string') {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll(target));
  }
  if (isEventTarget(target)) return [target];
  if (typeof target === 'object' && target !== null) {
    // Covers NodeList, HTMLCollection, arrays and any other iterable of nodes.
    return Array.from(target as Iterable<EventTarget>).filter(isEventTarget);
  }
  return [];
}

/**
 * Call `handler` whenever something is pasted into `target`.
 *
 * ```ts
 * const stop = onPaste('#search', ({ text }) => console.log(text));
 * stop(); // detach
 * ```
 *
 * `target` can be a CSS selector, an element, a list of elements, `document`
 * or `window`. Returns a function that detaches every listener it attached.
 */
export function onPaste(
  target: PasteTarget,
  handler: PasteHandler,
  options: OnPasteOptions = {},
): Unsubscribe {
  if (typeof handler !== 'function') {
    throw new TypeError('onPaste: handler must be a function');
  }

  const { selector, preventDefault, transform, once, capture, signal } = options;
  const types =
    options.types === undefined
      ? undefined
      : Array.isArray(options.types)
        ? options.types
        : [options.types];

  const targets = resolveTargets(target);
  const detachers: Unsubscribe[] = [];
  let detached = false;

  const detach: Unsubscribe = () => {
    if (detached) return;
    detached = true;
    for (const off of detachers) off();
  };

  const listener = (event: Event): void => {
    const clipboardEvent = event as ClipboardEvent;
    const currentTarget = clipboardEvent.currentTarget;
    const eventTarget = clipboardEvent.target;

    let element: Element | null = null;
    if (selector) {
      element = isElement(eventTarget) ? eventTarget.closest(selector) : null;
      if (!element) return;
    } else if (isElement(currentTarget)) {
      element = currentTarget;
    } else if (isElement(eventTarget)) {
      element = eventTarget;
    }
    if (!element) return;

    const host = isElement(currentTarget) ? currentTarget : element;
    const info: PasteInfo = buildInfo(clipboardEvent, element, host);

    if (types && !hasType(info.types, types)) return;
    if (preventDefault) clipboardEvent.preventDefault();

    if (transform) {
      const replacement = transform(info);
      if (replacement === null || replacement === false) {
        clipboardEvent.preventDefault();
      } else if (typeof replacement === 'string') {
        clipboardEvent.preventDefault();
        insertText(element, replacement);
        info.text = replacement;
      }
    }

    if (once) detach();
    handler(info);
  };

  for (const node of targets) {
    node.addEventListener('paste', listener, { capture });
    detachers.push(() => node.removeEventListener('paste', listener, { capture }));
  }

  if (signal) {
    if (signal.aborted) {
      detach();
    } else {
      signal.addEventListener('abort', detach, { once: true });
      detachers.push(() => signal.removeEventListener('abort', detach));
    }
  }

  return detach;
}

/** Like {@link onPaste}, detaching itself after the first paste. */
export function oncePaste(
  target: PasteTarget,
  handler: PasteHandler,
  options: Omit<OnPasteOptions, 'once'> = {},
): Unsubscribe {
  return onPaste(target, handler, { ...options, once: true });
}

/**
 * Force every paste into `target` to arrive as plain text, dropping any
 * formatting the clipboard carried.
 */
export function onPastePlainText(
  target: PasteTarget,
  handler?: PasteHandler,
  options: Omit<OnPasteOptions, 'transform'> = {},
): Unsubscribe {
  return onPaste(target, handler ?? (() => {}), {
    ...options,
    transform: (info) => info.text,
  });
}
