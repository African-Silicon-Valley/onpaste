/**
 * jsdom has no clipboard, so build a ClipboardEvent whose `clipboardData`
 * behaves like the real thing for the bits this package reads.
 */
export function pasteEvent(
  data: Record<string, string> = {},
  files: File[] = [],
): ClipboardEvent {
  const types = [...Object.keys(data), ...(files.length ? ['Files'] : [])];
  const clipboardData = {
    types,
    files,
    items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
    getData: (type: string) => data[type] ?? '',
  };

  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', { value: clipboardData });
  return event;
}

export function field(tag: 'input' | 'textarea' = 'input', value = ''): HTMLInputElement {
  const el = document.createElement(tag) as HTMLInputElement;
  el.value = value;
  document.body.append(el);
  return el;
}
