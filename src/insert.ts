type TextField = HTMLInputElement | HTMLTextAreaElement;

function isTextField(el: Element): el is TextField {
  const tag = el.tagName;
  return tag === 'TEXTAREA' || (tag === 'INPUT' && 'selectionStart' in el);
}

function notifyInput(el: Element, value: string): void {
  const win = el.ownerDocument.defaultView;
  const InputEventCtor = win?.InputEvent;
  const event = InputEventCtor
    ? new InputEventCtor('input', {
        bubbles: true,
        inputType: 'insertFromPaste',
        data: value,
      })
    : new Event('input', { bubbles: true });
  el.dispatchEvent(event);
}

/**
 * Replace the current selection in `el` with `value` and leave the caret after
 * it, for `<input>`, `<textarea>` and `contenteditable` elements alike.
 */
export function insertText(el: Element, value: string): void {
  if (isTextField(el)) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    if (typeof el.setRangeText === 'function') {
      el.setRangeText(value, start, end, 'end');
    } else {
      el.value = el.value.slice(0, start) + value + el.value.slice(end);
      const caret = start + value.length;
      el.setSelectionRange(caret, caret);
    }
    notifyInput(el, value);
    return;
  }

  const doc = el.ownerDocument;
  // execCommand is deprecated but remains the only insertion that browsers add
  // to their own undo stack, so it is still worth trying first.
  if (typeof doc.execCommand === 'function') {
    try {
      if (doc.execCommand('insertText', false, value)) return;
    } catch {
      // Fall through to the manual range edit below.
    }
  }

  const selection = doc.defaultView?.getSelection();
  if (!selection || selection.rangeCount === 0) {
    el.textContent = (el.textContent ?? '') + value;
    notifyInput(el, value);
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = doc.createTextNode(value);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  notifyInput(el, value);
}
