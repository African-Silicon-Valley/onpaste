import { afterEach, describe, expect, it, vi } from 'vitest';
import { onPaste, oncePaste, onPastePlainText } from '../src/index.js';
import { field, pasteEvent } from './helpers.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('onPaste', () => {
  it('fires with the pasted plain text', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler);

    input.dispatchEvent(pasteEvent({ 'text/plain': 'hello' }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].text).toBe('hello');
  });

  it('accepts a CSS selector', () => {
    const input = field();
    input.id = 'search';
    const handler = vi.fn();
    onPaste('#search', handler);

    input.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('accepts a list of elements', () => {
    field().className = 'f';
    field().className = 'f';
    const handler = vi.fn();
    onPaste(document.querySelectorAll('.f'), handler);

    for (const el of document.querySelectorAll('.f')) {
      el.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));
    }

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('exposes html, files and types', () => {
    const input = field();
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const handler = vi.fn();
    onPaste(input, handler);

    input.dispatchEvent(pasteEvent({ 'text/plain': 'hi', 'text/html': '<b>hi</b>' }, [file]));

    const info = handler.mock.calls[0]![0];
    expect(info.html).toBe('<b>hi</b>');
    expect(info.files).toEqual([file]);
    expect(info.types).toEqual(['text/plain', 'text/html', 'Files']);
  });

  it('reports html as null when the clipboard has none', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler);

    input.dispatchEvent(pasteEvent({ 'text/plain': 'hi' }));

    expect(handler.mock.calls[0]![0].html).toBeNull();
  });

  it('stops firing once detached', () => {
    const input = field();
    const handler = vi.fn();
    const stop = onPaste(input, handler);

    stop();
    stop(); // idempotent
    input.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('rejects a non-function handler', () => {
    // @ts-expect-error — exercising the runtime guard
    expect(() => onPaste(field(), 'nope')).toThrow(TypeError);
  });
});

describe('options', () => {
  it('preventDefault blocks the native paste', () => {
    const input = field();
    onPaste(input, () => {}, { preventDefault: true });

    const event = pasteEvent({ 'text/plain': 'x' });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('types filters out pastes the clipboard cannot satisfy', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler, { types: 'image/*' });

    input.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));
    expect(handler).not.toHaveBeenCalled();

    input.dispatchEvent(pasteEvent({ 'image/png': 'blob' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('types matches the MIME type of a pasted file', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler, { types: 'image/*' });

    // Browsers report a pasted file as the data type 'Files' and keep the real
    // MIME type on the File, so the filter has to look at info.files too.
    input.dispatchEvent(pasteEvent({}, [new File(['x'], 'a.png', { type: 'image/png' })]));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].types).toEqual(['Files']);

    input.dispatchEvent(pasteEvent({}, [new File(['x'], 'a.pdf', { type: 'application/pdf' })]));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('types still matches the Files data type and exact file types', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler, { types: ['Files', 'text/html'] });

    input.dispatchEvent(pasteEvent({}, [new File(['x'], 'a.pdf', { type: 'application/pdf' })]));
    expect(handler).toHaveBeenCalledTimes(1);

    input.dispatchEvent(pasteEvent({ 'text/plain': 'x', 'text/html': '<b>x</b>' }));
    expect(handler).toHaveBeenCalledTimes(2);

    input.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('types ignores files with no MIME type', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler, { types: 'image/*' });

    input.dispatchEvent(pasteEvent({}, [new File(['x'], 'mystery', { type: '' })]));
    expect(handler).not.toHaveBeenCalled();
  });

  it('once detaches after the first paste', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler, { once: true });

    input.dispatchEvent(pasteEvent({ 'text/plain': 'a' }));
    input.dispatchEvent(pasteEvent({ 'text/plain': 'b' }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].text).toBe('a');
  });

  it('selector delegates to matching descendants', () => {
    document.body.innerHTML = '<form><input name="a"><div></div></form>';
    const form = document.querySelector('form')!;
    const handler = vi.fn();
    onPaste(form, handler, { selector: 'input' });

    form.querySelector('div')!.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));
    expect(handler).not.toHaveBeenCalled();

    form.querySelector('input')!.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].target.tagName).toBe('INPUT');
    expect(handler.mock.calls[0]![0].currentTarget).toBe(form);
  });

  it('signal detaches on abort', () => {
    const input = field();
    const handler = vi.fn();
    const controller = new AbortController();
    onPaste(input, handler, { signal: controller.signal });

    controller.abort();
    input.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('an already-aborted signal attaches nothing', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler, { signal: AbortSignal.abort() });

    input.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('transform', () => {
  it('rewrites the pasted text in place', () => {
    const input = field('input', '');
    onPaste(input, () => {}, { transform: ({ text }) => text.trim().toUpperCase() });

    const event = pasteEvent({ 'text/plain': '  hi  ' });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe('HI');
  });

  it('inserts at the caret, replacing the selection', () => {
    const input = field('input', 'abcd');
    input.setSelectionRange(1, 3);
    onPaste(input, () => {}, { transform: () => 'XY' });

    input.dispatchEvent(pasteEvent({ 'text/plain': 'ignored' }));

    expect(input.value).toBe('aXYd');
    expect(input.selectionStart).toBe(3);
  });

  it('dispatches an input event so frameworks notice', () => {
    const input = field();
    const onInput = vi.fn();
    input.addEventListener('input', onInput);
    onPaste(input, () => {}, { transform: () => 'x' });

    input.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));

    expect(onInput).toHaveBeenCalledTimes(1);
  });

  it('null drops the paste entirely', () => {
    const input = field('input', 'keep');
    onPaste(input, () => {}, { transform: () => null });

    const event = pasteEvent({ 'text/plain': 'nope' });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe('keep');
  });

  it('undefined leaves the paste alone', () => {
    const input = field();
    onPaste(input, () => {}, { transform: () => undefined });

    const event = pasteEvent({ 'text/plain': 'x' });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it('reports the replacement as info.text', () => {
    const input = field();
    const handler = vi.fn();
    onPaste(input, handler, { transform: () => 'replaced' });

    input.dispatchEvent(pasteEvent({ 'text/plain': 'original' }));

    expect(handler.mock.calls[0]![0].text).toBe('replaced');
  });
});

describe('info.insert', () => {
  it('writes into a textarea and blocks the default paste', () => {
    const area = field('textarea', 'ab') as unknown as HTMLTextAreaElement;
    area.setSelectionRange(2, 2);
    onPaste(area, ({ insert }) => insert('!'));

    const event = pasteEvent({ 'text/plain': 'x' });
    area.dispatchEvent(event);

    expect(area.value).toBe('ab!');
    expect(event.defaultPrevented).toBe(true);
  });

  it('writes into a contenteditable element', () => {
    document.body.innerHTML = '<div contenteditable></div>';
    const div = document.querySelector('div')!;
    onPaste(div, ({ insert }) => insert('typed'));

    div.dispatchEvent(pasteEvent({ 'text/plain': 'x' }));

    expect(div.textContent).toContain('typed');
  });
});

describe('helpers', () => {
  it('oncePaste fires a single time', () => {
    const input = field();
    const handler = vi.fn();
    oncePaste(input, handler);

    input.dispatchEvent(pasteEvent({ 'text/plain': 'a' }));
    input.dispatchEvent(pasteEvent({ 'text/plain': 'b' }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('onPastePlainText strips formatting', () => {
    const input = field();
    onPastePlainText(input);

    const event = pasteEvent({ 'text/plain': 'bold', 'text/html': '<b>bold</b>' });
    input.dispatchEvent(event);

    expect(input.value).toBe('bold');
    expect(event.defaultPrevented).toBe(true);
  });
});
