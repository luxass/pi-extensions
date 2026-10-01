import type { AssistantMessage } from "@earendil-works/pi-ai";
import {
  createAgentSession,
  DefaultResourceLoader,
  getAgentDir,
  SessionManager,
  type AgentSession,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const SIDE_PROMPT =
  "The user is asking a side question (a 'btw') about the conversation above. The main agent keeps its own thread; you only answer here. Answer directly and briefly. Your tools are read-only.";

const SUMMARY_PROMPT =
  "Summarize this side conversation for the main agent. Keep decisions, findings, open questions, and next steps. Output only the summary.";

export interface Exchange {
  question: string;
  answer: AssistantMessage;
}

export interface ToolRow {
  id: string;
  name: string;
  detail: string;
  status: "running" | "done" | "error";
}

export interface BtwState {
  thread: Exchange[];
  pending?: { question: string; text: string; tools: ToolRow[]; error?: string };
  busy: boolean;
}

export function answerText(message: AssistantMessage): string {
  return message.content
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();
}

export async function createSideSession(
  ctx: ExtensionContext,
  thinkingLevel: ReturnType<ExtensionAPI["getThinkingLevel"]>,
  thread: Exchange[],
): Promise<AgentSession> {
  const resourceLoader = new DefaultResourceLoader({
    cwd: ctx.cwd,
    agentDir: getAgentDir(),
    noExtensions: true,
    appendSystemPrompt: [SIDE_PROMPT],
  });
  await resourceLoader.reload();

  // Seeding with the main branch keeps its system prompt in front, so the request shares the
  // main chat's prefix and Pi only appends a patch for SIDE_PROMPT and the read-only tools.
  const sessionManager = SessionManager.inMemory(
    ctx.cwd,
    undefined,
    ctx.sessionManager.getBranch(),
  );
  for (const { question, answer } of thread) {
    sessionManager.appendMessage({ role: "user", content: question, timestamp: answer.timestamp });
    sessionManager.appendMessage(answer);
  }

  const { session } = await createAgentSession({
    cwd: ctx.cwd,
    model: ctx.model,
    thinkingLevel,
    tools: ["read", "grep", "find", "ls"],
    resourceLoader,
    sessionManager,
  });
  return session;
}

export async function summarize(
  ctx: ExtensionContext,
  model: NonNullable<ExtensionContext["model"]>,
  thread: Exchange[],
): Promise<string> {
  const transcript = thread
    .map(({ question, answer }) => `User: ${question}\n\nAssistant: ${answerText(answer)}`)
    .join("\n\n---\n\n");
  const response = await ctx.modelRegistry.complete(model, {
    systemPrompt: SUMMARY_PROMPT,
    messages: [{ role: "user", content: transcript, timestamp: Date.now() }],
  });
  if (response.stopReason === "error" || response.stopReason === "aborted") {
    throw new Error(response.errorMessage ?? "Summary failed");
  }
  return answerText(response);
}
