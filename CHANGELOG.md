# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0]

### Added

- `onPaste(target, handler, options)` — attach a paste listener to a selector,
  element, list of elements, `document` or `window`; returns an unsubscribe
  function.
- Callback payload with `text`, `html`, `files`, `types`, `target`,
  `currentTarget`, `event`, `preventDefault()` and `insert()`.
- Options: `selector` (delegation), `types` (MIME filter with wildcards),
  `preventDefault`, `transform`, `once`, `capture` and `signal`.
- `oncePaste` and `onPastePlainText` convenience wrappers.
- `insertText(element, value)` for `<input>`, `<textarea>` and
  `contenteditable`, dispatching an `input` event.
