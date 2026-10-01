import type { AssistantMessage } from "@earendil-works/pi-ai";
import { getMarkdownTheme, type Theme } from "@earendil-works/pi-coding-agent";
import {
  Input,
  Markdown,
  truncateToWidth,
  visibleWidth,
  wrapTextWithAnsi,
  type Component,
  type Focusable,
  type KeybindingsManager,
  type TUI,
} from "@earendil-works/pi-tui";

import { answerText, type BtwState, type ToolRow } from "./session";

const TOOL_ICONS = { running: "⚙", done: "✓", error: "✗" };
const TOOL_COLORS = { running: "dim", done: "success", error: "error" } as const;

interface OverlayOptions {
  tui: TUI;
  theme: Theme;
  keybindings: KeybindingsManager;
  title: string;
  state: BtwState;
  onAsk: (question: string) => void;
  onEscape: () => void;
}

export function createOverlay({
  tui,
  theme,
  keybindings,
  title,
  state,
  onAsk,
  onEscape,
}: OverlayOptions): Component & Focusable {
  const input = new Input();
  let answers = new WeakMap<AssistantMessage, Markdown>();
  // Lines scrolled up from the bottom; 0 follows new output.
  let scroll = 0;
  let page = 1;

  input.onSubmit = (value) => {
    const question = value.trim();
    if (!question || state.busy) return;
    input.setValue("");
    scroll = 0;
    onAsk(question);
  };

  const border = (text: string) => theme.fg("borderAccent", text);

  function markdown(answer: AssistantMessage, width: number): string[] {
    let rendered = answers.get(answer);
    if (rendered == null) {
      rendered = new Markdown(answerText(answer), 0, 0, getMarkdownTheme());
      answers.set(answer, rendered);
    }
    return rendered.render(width);
  }

  function question(text: string, width: number): string[] {
    return wrapTextWithAnsi(theme.fg("userMessageText", text), width - 2).map((line) =>
      theme.bg("userMessageBg", ` ${line}${" ".repeat(width - 2 - visibleWidth(line))} `),
    );
  }

  function answer(lines: string[]): string[] {
    return lines.map((line) => theme.fg("borderAccent", "▎ ") + line);
  }

  function tool({ name, detail, status }: ToolRow, width: number): string {
    const line = `${theme.fg(TOOL_COLORS[status], TOOL_ICONS[status])} ${theme.fg("toolTitle", name)} ${theme.fg("dim", detail)}`;
    return truncateToWidth(line, width, "…");
  }

  function transcript(width: number): string[] {
    const lines: string[] = [];
    for (const exchange of state.thread) {
      lines.push(
        ...question(exchange.question, width),
        "",
        ...answer(markdown(exchange.answer, width - 2)),
        "",
      );
    }

    const { pending } = state;
    if (pending != null) {
      lines.push(
        ...question(pending.question, width),
        "",
        ...pending.tools.map((row) => tool(row, width)),
      );
      if (pending.text)
        lines.push(...new Markdown(pending.text, 0, 0, getMarkdownTheme()).render(width));
      if (pending.error != null)
        lines.push(...wrapTextWithAnsi(theme.fg("error", pending.error), width));
      if (state.busy) lines.push("", theme.fg("dim", "answering… esc to stop"));
    }

    if (lines.length > 0) return lines;
    return wrapTextWithAnsi(
      theme.fg(
        "dim",
        "Ask a side question. The main conversation is included as context. When you close, you can keep this thread or inject a summary into the main chat.",
      ),
      width,
    );
  }

  function row(content: string, width: number): string {
    const fitted = truncateToWidth(content, width, "");
    return `${border("│")} ${fitted}${" ".repeat(Math.max(0, width - visibleWidth(fitted)))} ${border("│")}`;
  }

  function edge(left: string, right: string, label: string, info: string, width: number): string {
    const fill = Math.max(0, width - visibleWidth(label) - visibleWidth(info) - 2);
    const line = border(`${left}─`) + label + border("─".repeat(fill)) + info + border(`─${right}`);
    return truncateToWidth(line, width + 2, "");
  }

  return {
    get focused() {
      return input.focused;
    },
    set focused(value: boolean) {
      input.focused = value;
    },

    render(width) {
      const inner = width - 2;
      const content = inner - 2;
      const height = Math.max(4, Math.floor(tui.terminal.rows * 0.8) - 4);
      page = height;

      const lines = transcript(content);
      scroll = Math.min(scroll, Math.max(0, lines.length - height));
      const end = lines.length - scroll;
      const visible = lines.slice(Math.max(0, end - height), end);
      while (visible.length < height) visible.push("");
      const position = lines.length > height ? ` ${end}/${lines.length} ` : "";

      return [
        edge("┌", "┐", theme.fg("accent", ` btw · ${title} `), "", inner),
        ...visible.map((line) => row(line, content)),
        border(`├${"─".repeat(inner)}┤`),
        row(input.render(content)[0] ?? "", content),
        edge(
          "└",
          "┘",
          theme.fg("dim", " enter ask · esc close · ↑↓ scroll "),
          theme.fg("dim", position),
          inner,
        ),
      ];
    },

    handleInput(data) {
      if (keybindings.matches(data, "tui.select.cancel")) {
        onEscape();
        return;
      }
      if (keybindings.matches(data, "tui.select.up")) scroll += 1;
      else if (keybindings.matches(data, "tui.select.down")) scroll = Math.max(0, scroll - 1);
      else if (keybindings.matches(data, "tui.select.pageUp")) scroll += page;
      else if (keybindings.matches(data, "tui.select.pageDown"))
        scroll = Math.max(0, scroll - page);
      else input.handleInput(data);
      tui.requestRender();
    },

    invalidate() {
      answers = new WeakMap();
    },
  };
}
