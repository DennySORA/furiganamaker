import { FURIGANA_CLASS, SelectMode } from "./constants";

interface ClipboardPayload {
  html: string;
  text: string;
}

export function buildClipboardPayload(
  selection: Selection,
  selectMode: SelectMode,
): ClipboardPayload | null {
  if (selection.isCollapsed || selectMode === SelectMode.Default || selection.rangeCount === 0) {
    return null;
  }

  const htmlParts: string[] = [];
  const textParts: string[] = [];
  let hasManagedRuby = false;

  for (let index = 0; index < selection.rangeCount; index += 1) {
    const fragment = selection.getRangeAt(index).cloneContents();
    const rubies = Array.from(fragment.querySelectorAll<HTMLElement>(`ruby.${FURIGANA_CLASS}`));
    hasManagedRuby ||= rubies.length > 0;

    for (const ruby of rubies) {
      const original = getOriginalText(ruby);
      const replacementText =
        selectMode === SelectMode.Parentheses
          ? withParentheses(original, getReadingText(ruby))
          : original;
      ruby.replaceWith(document.createTextNode(replacementText));
    }

    const wrapper = document.createElement("div");
    wrapper.append(fragment);
    htmlParts.push(wrapper.innerHTML);
    textParts.push(wrapper.textContent ?? "");
  }

  if (!hasManagedRuby) {
    return null;
  }

  return {
    html: htmlParts.join(""),
    text: textParts.join(""),
  };
}

function getOriginalText(ruby: HTMLElement): string {
  return Array.from(ruby.childNodes)
    .filter(
      (node) => !(node instanceof HTMLElement && (node.tagName === "RT" || node.tagName === "RP")),
    )
    .map((node) => node.textContent ?? "")
    .join("");
}

function getReadingText(ruby: HTMLElement): string {
  return Array.from(ruby.children)
    .filter((node): node is HTMLElement => node.tagName === "RT")
    .map((node) => node.textContent ?? "")
    .join("");
}

function withParentheses(original: string, reading: string): string {
  return reading ? `${original}(${reading})` : original;
}
