# onpaste

Lightweight paste-event listener for input fields, textareas and
`contenteditable` elements. It wraps the `paste` event, hands your callback the
clipboard contents already unpacked, and gets out of the way.

- Zero runtime dependencies, ~1 kB min+gzip
- ESM + CJS + TypeScript types
- Plain text, HTML and pasted files in one payload
- Rewrite pastes as they arrive (strip formatting, trim, sanitize)
- Event delegation, MIME filters and `AbortSignal` support

**[Try it in the playground →](https://onpaste.onrender.com)**

## Install

```bash
npm install onpaste
```

## Usage

```js
import { onPaste } from 'onpaste';

const stop = onPaste('#search', ({ text }) => {
  console.log('pasted:', text);
});

stop(); // detach when you are done
```

`target` can be a CSS selector, an element, a `NodeList` or array of elements,
`document`, or `window`. `onPaste` returns an unsubscribe function that detaches
every listener it attached, and is safe to call more than once.

### The callback payload

```js
onPaste('#editor', (info) => {
  info.text;          // 'hello'            — text/plain, '' when absent
  info.html;          // '<b>hello</b>'     — text/html, null when absent
  info.files;         // [File]             — pasted images and files
  info.types;         // ['text/plain', …]  — MIME types on the clipboard
  info.target;        // the element the paste landed in
  info.currentTarget; // the element the listener is attached to
  info.event;         // the underlying ClipboardEvent
  info.preventDefault();
  info.insert('text'); // replace the selection, caret after it
});
```

### Strip formatting

```js
import { onPastePlainText } from 'onpaste';

onPastePlainText('[contenteditable]');
```

Or do it yourself with `transform`, which replaces what gets pasted:

```js
onPaste('#slug', () => {}, {
  transform: ({ text }) => text.trim().toLowerCase().replace(/\s+/g, '-'),
});
```

`transform` returns a string to paste instead of the clipboard text,
`undefined` to leave the paste alone, or `null` / `false` to drop it.

### Handle pasted images

```js
onPaste('#composer', async ({ files }) => {
  for (const file of files) await upload(file);
}, { types: 'image/*' });
```

### Delegate to fields added later

```js
onPaste(document, ({ target, text }) => {
  console.log(target.name, text);
}, { selector: 'input, textarea' });
```

### Detach with a signal

```js
const controller = new AbortController();
onPaste('#notes', handler, { signal: controller.signal });
controller.abort();
```

## API

### `onPaste(target, handler, options?): () => void`

| Option | Type | Description |
| --- | --- | --- |
| `selector` | `string` | Listen on an ancestor, fire only for pastes whose target matches (event delegation). |
| `types` | `string \| string[]` | Fire only when the clipboard offers one of these MIME types. Matched against the clipboard's data types and the MIME types of pasted files, so `'image/*'` catches a pasted image. Wildcards are allowed. |
| `preventDefault` | `boolean` | Block the native paste before the handler runs. |
| `transform` | `(info) => string \| null \| undefined \| false` | Replace what gets pasted. |
| `once` | `boolean` | Detach after the handler has run once. |
| `capture` | `boolean` | Listen during the capture phase. |
| `signal` | `AbortSignal` | Detach when the signal aborts. |

### `oncePaste(target, handler, options?)`

`onPaste` with `once: true`.

### `onPastePlainText(target, handler?, options?)`

`onPaste` with `transform: (info) => info.text`, so formatted clipboard content
always arrives as plain text. The handler is optional.

### `insertText(element, value)`

Replace the current selection in `element` with `value` and leave the caret
after it. Works on `<input>`, `<textarea>` and `contenteditable`, and dispatches
an `input` event so frameworks and validation notice the change.

## Notes

- `transform` and `info.insert()` call `preventDefault()` for you — the browser
  will not also insert the original clipboard contents.
- Clipboard contents are only readable inside the `paste` event. Copy what you
  need out of `info` before an `await`; `info.files` and `info.text` are already
  materialized, but `info.event.clipboardData` is not readable afterwards.
- The package touches no DOM APIs at import time, so it is safe to import in
  SSR code; call `onPaste` from the browser.

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
