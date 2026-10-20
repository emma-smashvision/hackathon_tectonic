import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractJson } from "../json";

export { extractJson };

// Two ways to reach Claude, with the same results and the same rules fallback:
// - with ANTHROPIC_API_KEY set (servers, deploys): the Anthropic API through the official SDK;
// - without it (local dev): the Claude Code CLI in print mode (`claude -p`), using the
//   developer's own login, so the whole pipeline is visible in the terminal that runs `bun dev`.
//
//   KBC_AI=off                 skip Claude, use the rules fallback
//   ANTHROPIC_API_KEY=...      use the Anthropic API instead of the CLI
//   KBC_CLAUDE_BIN=claude      path to the CLI
//   KBC_COMPOSE_MODEL          model for composing the home (CLI default: haiku)
//   KBC_KATE_MODEL             model for Kate, layouts, blocks and themes (CLI default: sonnet)
//   KBC_CLAUDE_TIMEOUT_MS=90000

export const aiEnabled = () => process.env.KBC_AI !== "off";
const useApi = () => Boolean(process.env.ANTHROPIC_API_KEY);

const BIN = process.env.KBC_CLAUDE_BIN ?? "claude";
const TIMEOUT = Number(process.env.KBC_CLAUDE_TIMEOUT_MS ?? 90_000);
// An empty working directory, so the CLI never reads or touches the repository.
const SANDBOX = mkdtempSync(
  /*turbopackIgnore: true*/ join(tmpdir(), "kbc-claude-"),
);

const c = {
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

export type ClaudeResult<T> = {
  data: T;
  ms: number;
  model: string;
  costUsd?: number;
};

let minimalFlags = false; // set when the installed CLI rejects the newer flags

function argsFor(model: string, system: string): string[] {
  const base = ["-p", "--output-format", "json", "--model", model];
  if (minimalFlags) return [...base, "--append-system-prompt", system];
  return [
    ...base,
    "--system-prompt",
    system,
    "--tools",
    "",
    "--no-session-persistence",
    "--strict-mcp-config",
  ];
}

function exec(
  args: string[],
  input: string,
): Promise<{ code: number | null; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(BIN, args, {
      cwd: SANDBOX,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`claude -p timed out after ${TIMEOUT} ms`));
    }, TIMEOUT);
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
    child.stdin.end(input);
  });
}

export async function askClaude<T = unknown>(opts: {
  label: string;
  model: string;
  system: string;
  prompt: string;
}): Promise<ClaudeResult<T>> {
  if (useApi()) {
    const res = await apiMessage({ ...opts, onText: undefined });
    const data = extractJson(res.text) as T;
    console.log(c.dim(indent(JSON.stringify(data, null, 2))));
    return { data, ms: res.ms, model: res.model };
  }
  const t0 = Date.now();
  console.log(
    `\n${c.cyan("◆ kate")} ${c.bold(opts.label)} ${c.dim(`→ claude -p --model ${opts.model} (${opts.prompt.length} chars)`)}`,
  );
  let res = await exec(argsFor(opts.model, opts.system), opts.prompt);
  if (
    res.code !== 0 &&
    !minimalFlags &&
    /unknown option|error: option/i.test(res.err + res.out)
  ) {
    console.log(c.dim("  older CLI detected, retrying with minimal flags"));
    minimalFlags = true;
    res = await exec(argsFor(opts.model, opts.system), opts.prompt);
  }
  if (res.code !== 0)
    throw new Error(
      `claude exited ${res.code}: ${(res.err || res.out).slice(0, 300)}`,
    );
  const envelope = JSON.parse(res.out) as {
    result?: string;
    is_error?: boolean;
    total_cost_usd?: number;
  };
  if (envelope.is_error || typeof envelope.result !== "string")
    throw new Error(`claude error: ${res.out.slice(0, 300)}`);
  const data = extractJson(envelope.result) as T;
  const ms = Date.now() - t0;
  console.log(
    `${c.green("  ✓")} ${c.dim(`${ms} ms`)}${envelope.total_cost_usd ? c.dim(` · $${envelope.total_cost_usd.toFixed(4)}`) : ""}`,
  );
  console.log(c.dim(indent(JSON.stringify(data, null, 2))));
  return { data, ms, model: opts.model, costUsd: envelope.total_cost_usd };
}

export function logFallback(label: string, error: unknown) {
  console.log(
    `${c.red("  ✗")} ${label}: ${error instanceof Error ? error.message : String(error)} ${c.dim("→ rules fallback")}`,
  );
}

function indent(s: string) {
  const lines = s.split("\n");
  const shown =
    lines.length > 60
      ? [...lines.slice(0, 60), `… ${lines.length - 60} more lines`]
      : lines;
  return shown.map((l) => `    ${l}`).join("\n");
}

export const MODELS = {
  compose: process.env.KBC_COMPOSE_MODEL ?? (useApi() ? "claude-opus-5-5" : "haiku"),
  kate: process.env.KBC_KATE_MODEL ?? (useApi() ? "claude-opus-5-5" : "sonnet"),
};

// ---------- Anthropic API ----------

let client: Anthropic | undefined;
const api = () => (client ??= new Anthropic({ timeout: TIMEOUT, maxRetries: 1 }));

// CLI aliases still work in KBC_*_MODEL; the API needs full model IDs.
const API_ALIAS: Record<string, string> = { opus: "claude-opus-5-5", sonnet: "claude-sonnet-5-5", haiku: "claude-haiku-5-5" };
const apiModel = (model: string) => API_ALIAS[model] ?? model;

/**
 * One Messages API call. Streams so Kate can show typing; `onText` gets each text delta.
 * Server-side fallbacks re-run a safety-declined request on another model; a remaining
 * refusal throws, so callers drop to the rules fallback as they do for any other failure.
 */
async function apiMessage(opts: {
  label: string;
  model: string;
  system: string;
  prompt: string;
  onText?: (delta: string) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; ms: number; model: string }> {
  const t0 = Date.now();
  const model = apiModel(opts.model);
  console.log(
    `\n${c.cyan("◆ kate")} ${c.bold(opts.label)} ${c.dim(`→ Anthropic API · ${model} (${opts.prompt.length} chars)`)}`,
  );
  // Server-side fallbacks are available for Opus and Sonnet models, not for Haiku.
  const fallback = /^claude-(opus|sonnet)/.test(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
    : {};
  const stream = api().beta.messages.stream(
    {
      model,
      max_tokens: 16000,
      // Short replies and JSON layouts: low effort keeps Home and Kate fast.
      output_config: { effort: "low" },
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      ...fallback,
    },
    { signal: opts.signal },
  );
  if (opts.onText) stream.on("text", opts.onText);
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal")
    throw new Error(`refused${message.stop_details?.category ? ` (${message.stop_details.category})` : ""}`);
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  if (!text) throw new Error(`no text in the reply (stop: ${message.stop_reason})`);
  const ms = Date.now() - t0;
  console.log(`${c.green("  ✓")} ${c.dim(`${ms} ms · ${message.model} · ${message.usage.input_tokens} in / ${message.usage.output_tokens} out`)}`);
  return { text, ms, model: message.model };
}

/**
 * Streaming variant for Kate: `claude -p --output-format stream-json --include-partial-messages`.
 * Calls `onText` with each text delta so the phone can show Kate typing.
 */
export async function streamClaude(opts: {
  label: string;
  model: string;
  system: string;
  prompt: string;
  onText: (delta: string) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; ms: number; model: string; costUsd?: number }> {
  if (useApi()) {
    const res = await apiMessage(opts);
    console.log(c.dim(indent(res.text)));
    return res;
  }
  const t0 = Date.now();
  console.log(
    `\n${c.cyan("◆ kate")} ${c.bold(opts.label)} ${c.dim(`→ claude -p --model ${opts.model} (stream, ${opts.prompt.length} chars)`)}`,
  );
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--model",
    opts.model,
    ...(minimalFlags
      ? ["--append-system-prompt", opts.system]
      : [
          "--system-prompt",
          opts.system,
          "--tools",
          "",
          "--no-session-persistence",
          "--strict-mcp-config",
        ]),
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(BIN, args, {
      cwd: SANDBOX,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buf = "";
    let err = "";
    let text = "";
    let final: string | undefined;
    let cost: number | undefined;
    let failed = false;
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`claude -p timed out after ${TIMEOUT} ms`));
    }, TIMEOUT);
    opts.signal?.addEventListener("abort", () => {
      console.log(c.dim("  stopped by the customer"));
      child.kill("SIGTERM");
    });
    child.stdout.on("data", (d) => {
      buf += d;
      let nl = buf.indexOf("\n");
      while (nl >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        nl = buf.indexOf("\n");
        if (!line) continue;
        try {
          const ev = JSON.parse(line) as {
            type?: string;
            event?: { type?: string; delta?: { type?: string; text?: string } };
            result?: string;
            is_error?: boolean;
            total_cost_usd?: number;
          };
          if (
            ev.type === "stream_event" &&
            ev.event?.type === "content_block_delta" &&
            typeof ev.event.delta?.text === "string"
          ) {
            text += ev.event.delta.text;
            opts.onText(ev.event.delta.text);
          } else if (ev.type === "result") {
            final = ev.result;
            cost = ev.total_cost_usd;
            failed = Boolean(ev.is_error);
          }
        } catch {
          /* ignore non-JSON lines */
        }
      }
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0 || failed) {
        if (!minimalFlags && /unknown option|error: option/i.test(err))
          minimalFlags = true;
        reject(
          new Error(
            `claude exited ${code}: ${(err || final || "").slice(0, 300)}`,
          ),
        );
        return;
      }
      const ms = Date.now() - t0;
      const out = final ?? text;
      console.log(
        `${c.green("  ✓")} ${c.dim(`${ms} ms`)}${cost ? c.dim(` · $${cost.toFixed(4)}`) : ""}`,
      );
      console.log(c.dim(indent(out)));
      resolve({ text: out, ms, model: opts.model, costUsd: cost });
    });
    child.stdin.end(opts.prompt);
  });
}
