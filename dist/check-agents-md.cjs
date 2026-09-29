#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/check-agents-md.ts
var check_agents_md_exports = {};
__export(check_agents_md_exports, {
  addedLines: () => addedLines,
  blocksOf: () => blocksOf,
  fails: () => fails,
  includesOf: () => includesOf,
  loadConfig: () => loadConfig,
  parseArgv: () => parseArgv,
  refsOf: () => refsOf,
  resolve: () => resolve,
  spansOf: () => spansOf,
  tasksIn: () => tasksIn,
  warns: () => warns
});
module.exports = __toCommonJS(check_agents_md_exports);
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var DEFAULT_ENDPOINT = "https://openrouter.ai/api/alpha/decisions";
var DEFAULT_MODEL = "~typesafe/jev-latest";
var DEFAULT_FILENAMES = ["AGENTS.md"];
var DEFAULT_JOBS = 4;
var RETRYABLE = /* @__PURE__ */ new Set([408, 429, 500, 502, 503, 529]);
var ATTEMPTS = 4;
var BACKOFF_MS = 800;
var FAIL_IMPLEMENTATION = 0.8;
var WARN_IMPLEMENTATION = 0.4;
var IMPLEMENTATION_KIND = 0.5;
var FAIL_PROBABILITY = 0.7;
var OVERRIDE_PROBABILITY = 0.85;
var WARN_PROBABILITY = 0.5;
var IMPLEMENTATION_LEVELS = ["2", "3"];
var IMPLEMENTATION_KINDS = ["mechanism", "rationale"];
var EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|sh|yml|yaml|lua|toml|nix|ptc|scm)$/;
var RUNNERS = /* @__PURE__ */ new Set(["pnpm", "npm", "yarn", "turbo", "task", "npx"]);
var FILE_PURPOSE = "An AGENTS.md in this monorepo holds the rules a coding agent works under: how things are interfaced, which way dependencies run, where a thing belongs. It points the agent at the files, packages, commands and exported names it will need, and says in a phrase what each one is for. That is wanted. What it must never do is say how any of them works: the steps, the order they run in, the data that moves and what happens at runtime are read in the code, because prose rots and the code does not.";
var IMPLEMENTATION = {
  type: "score",
  instructions: "Where does `passage` sit between saying what something is and explaining how it works? Naming a file, a package, a command or an exported name, and saying in a phrase what it is for, counts as saying what it is. Judge `passage` whole, as it now reads, and take `section` and `changed_lines` only as context for what the change touched.",
  criteria: [
    "A rule, a boundary, or a statement of where a thing belongs. It tells the reader what to do or not do, or which way a dependency runs, and points at nothing in particular.",
    "A map or a pointer. It names files, packages, paths, commands, scripts or exported names, and gives each one a phrase saying what it is for. It says what a thing is, never how it does it.",
    "It goes past what a thing is for and into what it is made of: the fields it carries, the arguments it takes, what comes back from it, the shape of a type, or the conditions under which a case applies.",
    "It walks through how the code works while it runs: the steps it takes, the order they happen in, what it does with the data that passes through it, or what happens when it is called. None of these is this: listing the commands a tool runs in the order it runs them, saying what a command does when a person runs it, or describing what the product is and what someone gets out of using it."
  ]
};
var MECHANISM = {
  type: "noul",
  instructions: "Does `passage` explain how something works, rather than what it is for?",
  criteria: {
    true: "It walks through what the code does while it runs: the steps it takes, the order they happen in, what it does with the data that passes through it, or the conditions under which one case is taken instead of another.",
    false: "It names things and says what each one is for, or it states a rule, a constraint or a boundary, and leaves the workings to be read in the code. None of these counts as an explanation: a phrase giving a file\u2019s or a symbol\u2019s job; a list of the commands or checks a tool runs and the order it runs them in; what a command does when a person runs it; a sentence describing what the product is, who uses it and what they get out of it; or an account of how a tool or a test behaved."
  }
};
var SYMBOLS = {
  type: "noul",
  instructions: "Does `passage` name an identifier that exists in the source code, such as a type, a function, a class, a method, a variable, a field, an exported name, or a signature?",
  criteria: {
    true: "At least one such identifier appears, however it is spelled or quoted.",
    false: "The only concrete names are packages, directories, file paths, package scripts, shell commands, configuration keys, environment variables, or tool names. None of those is a source identifier."
  }
};
var RATIONALE = {
  type: "noul",
  instructions: "Does `passage` explain why something was designed or decided the way it is, instead of stating the rule that came out of the decision?",
  criteria: {
    true: "It gives a history, an alternative that was rejected, a tradeoff that was weighed, or a justification that reads as a design note.",
    false: "It states the rule or the boundary. A short clause that makes the rule\u2019s meaning or its stakes precise is not a design note."
  }
};
var KIND = {
  type: "choice",
  instructions: "What does `passage` do?",
  criteria: {
    rule: "States something the reader must or must not do, or a constraint the repository holds itself to.",
    placement: "Says where a thing belongs, which package owns it, or which way a dependency is allowed to run.",
    pointer: "Names files, packages, commands, scripts or exported names and gives each one a phrase saying what it is for. A map of what lives where is a pointer.",
    mechanism: "Describes how something works: the steps, the order, the data that moves, the internal shape of a type or a function.",
    rationale: "Explains why a decision was made, what was tried before, or what the tradeoffs were.",
    editorial: "Rewords, reformats, or relocates existing text without adding a claim."
  }
};
var SCOPE = {
  type: "noul",
  instructions: "Does `passage` state a rule that governs one single package or app, rather than the whole repository?",
  criteria: {
    true: "It only makes sense for one package or app, so it belongs in that package\u2019s own AGENTS.md.",
    false: "It applies repository-wide, or it describes how packages relate to one another."
  }
};
var USAGE = `check-agents-md [options]

  --checks <names>         Which checks to run: \`rules\`, \`refs\`, or both. Default both.
  --base <ref>             Judge what this branch adds on top of it. Default origin/main,
                           or the pull request base under GitHub Actions.
  --staged                 Judge what is staged for commit instead of a branch diff.
  --all                    Judge every tracked AGENTS.md, not only what changed.
  --only <path>            Restrict to one AGENTS.md, or to everything under a directory.
  --filenames <names>      Space separated basenames read as agent files. Default AGENTS.md.
  --ignore <regex>         Skip agent files whose path matches it. Repeatable.
  --model <id>             Model asked to judge the prose. Default ${DEFAULT_MODEL}.
  --endpoint <url>         Provider it is asked through. Default ${DEFAULT_ENDPOINT}.
  --api-key <key>          Key for that provider. Defaults to the OPENROUTER_API_KEY variable.
  --jobs <n>               Blocks judged in parallel. Default ${DEFAULT_JOBS}.
  --print                  List what would be judged and exit, asking the model nothing.
  --raw                    Dump each raw answer alongside the report.
  --no-fail-on-violations  Report findings but exit zero.
  --working-directory <dir>
  --help

Defaults come from check-agents-md.json, or a "check-agents-md" key in package.json.
`;
var BOOLEANS = /* @__PURE__ */ new Set(["staged", "all", "print", "raw", "annotations", "fail-on-violations"]);
var flags = /* @__PURE__ */ new Map();
var config = {};
function parseArgv(argv) {
  const out = /* @__PURE__ */ new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(USAGE);
      process.exit(0);
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument \`${arg}\`. See --help.`);
    const eq = arg.indexOf("=");
    let name = (eq === -1 ? arg.slice(2) : arg.slice(2, eq)).toLowerCase();
    let value = eq === -1 ? void 0 : arg.slice(eq + 1);
    const negated = name.startsWith("no-") && BOOLEANS.has(name.slice(3));
    if (negated) name = name.slice(3);
    if (BOOLEANS.has(name) && value === void 0) value = negated ? "false" : "true";
    if (value === void 0) value = argv[++i];
    if (value === void 0) throw new Error(`Flag \`--${name}\` needs a value.`);
    const seen = out.get(name);
    if (seen) seen.push(value);
    else out.set(name, [value]);
  }
  return out;
}
function readJson(file) {
  try {
    return JSON.parse((0, import_node_fs.readFileSync)(file, "utf8"));
  } catch (err) {
    throw new Error(
      `${file} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
function loadConfig() {
  if ((0, import_node_fs.existsSync)("check-agents-md.json")) return readJson("check-agents-md.json");
  if ((0, import_node_fs.existsSync)("package.json")) {
    const stored = readJson("package.json")["check-agents-md"];
    if (stored) return stored;
  }
  return {};
}
function input(name) {
  const flag = flags.get(name);
  if (flag) return flag.join("\n");
  const key = `INPUT_${name.toUpperCase().replace(/-/g, "_")}`;
  const fromEnv = (process.env[key] ?? "").trim();
  if (fromEnv) return fromEnv;
  const stored = config[name];
  if (Array.isArray(stored)) return stored.join("\n");
  return typeof stored === "number" ? String(stored) : (stored ?? "").trim();
}
function bool(name, fallback) {
  const raw = input(name).toLowerCase();
  if (raw === "") return fallback;
  return raw === "true" || raw === "1" || raw === "yes";
}
function list(name) {
  return input(name).split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean);
}
function lines(name) {
  return input(name).split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
}
function patterns(name) {
  return lines(name).map((s) => {
    try {
      return new RegExp(s);
    } catch {
      throw new Error(`Input \`${name}\` holds an invalid regular expression: ${s}`);
    }
  });
}
function git(args) {
  return (0, import_node_child_process.execFileSync)("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
}
function addedLines(patch) {
  const added = /* @__PURE__ */ new Set();
  let cursor = 0;
  for (const line of patch.split("\n")) {
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (hunk?.[1]) {
      cursor = Number(hunk[1]);
      continue;
    }
    if (line.startsWith("+++")) continue;
    if (line.startsWith("+")) {
      added.add(cursor);
      cursor += 1;
    }
  }
  return added;
}
function agentFiles(out, filenames, ignored) {
  return out.split("\n").filter(Boolean).filter((file) => filenames.has((0, import_node_path.basename)(file))).filter(import_node_fs.existsSync).filter((file) => !ignored.some((re) => re.test(file)));
}
function pathspecs(filenames) {
  return filenames.flatMap((name) => [name, `*/${name}`]);
}
function defaultBase() {
  const path = process.env.GITHUB_EVENT_PATH;
  if (path && (0, import_node_fs.existsSync)(path)) {
    try {
      const payload = JSON.parse((0, import_node_fs.readFileSync)(path, "utf8"));
      const sha = payload?.pull_request?.base?.sha;
      if (typeof sha === "string" && sha !== "") return sha;
    } catch {
    }
  }
  const ref = process.env.GITHUB_BASE_REF;
  return ref ? `origin/${ref}` : "origin/main";
}
function mergeBase(base) {
  try {
    return git(["merge-base", base, "HEAD"]).trim();
  } catch {
    return base;
  }
}
function scopeOf(filenames, ignored) {
  const specs = pathspecs([...filenames]);
  if (bool("all", false)) {
    return {
      files: agentFiles(git(["ls-files", "--", ...specs]), filenames, ignored),
      isNew: () => () => true,
      label: "tracked"
    };
  }
  if (bool("staged", false)) {
    return {
      files: agentFiles(
        git(["diff", "--cached", "--name-only", "--diff-filter=d", "--", ...specs]),
        filenames,
        ignored
      ),
      isNew: (file) => {
        const added = addedLines(git(["diff", "--cached", "--unified=0", "--", file]));
        return (line) => added.has(line);
      },
      label: "staged"
    };
  }
  const base = mergeBase(input("base") || defaultBase());
  return {
    files: agentFiles(
      git(["diff", "--name-only", "--diff-filter=d", base, "--", ...specs]),
      filenames,
      ignored
    ),
    isNew: (file) => {
      const added = addedLines(git(["diff", "--unified=0", base, "--", file]));
      return (line) => added.has(line);
    },
    label: "changed"
  };
}
function isHeading(line) {
  return /^#{1,6}\s/.test(line);
}
function blocksOf(text, file, isNew) {
  const lines2 = text.split("\n");
  const root = (0, import_node_path.dirname)(file) === ".";
  const blocks = [];
  let section = "";
  let fenced = false;
  let start = -1;
  const flush = (end) => {
    if (start === -1) return;
    const range = lines2.slice(start - 1, end);
    const numbers = range.map((_, index) => start + index);
    const news = numbers.filter(isNew);
    const first = start;
    start = -1;
    if (news.length === 0) return;
    const paragraph = range.join("\n").trim();
    const added = news.map((n) => lines2[n - 1]).join("\n").trim();
    if (added === "" || range.every((line) => isHeading(line))) return;
    blocks.push({ file, line: news[0] ?? first, section, paragraph, added, root });
  };
  lines2.forEach((line, index) => {
    const number = index + 1;
    if (/^\s*```/.test(line)) {
      flush(number - 1);
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    if (line.trim() === "") {
      flush(number - 1);
      return;
    }
    if (isHeading(line)) {
      flush(number - 1);
      section = line.replace(/^#+\s*/, "").trim();
      return;
    }
    if (start === -1) start = number;
  });
  flush(lines2.length);
  return blocks;
}
async function decide(judge, state, questions) {
  const body = JSON.stringify({ model: judge.model, state, questions });
  let wait = BACKOFF_MS;
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(judge.endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${judge.key}`, "content-type": "application/json" },
      body
    });
    if (response.ok) return await response.json();
    if (!RETRYABLE.has(response.status) || attempt === ATTEMPTS) {
      throw new Error(
        `${judge.model} answered ${response.status}: ${(await response.text()).slice(0, 400)}`
      );
    }
    await new Promise((resolve2) => setTimeout(resolve2, wait));
    wait *= 2;
  }
}
function massOf(probabilities, keys) {
  if (probabilities === void 0) return void 0;
  return keys.reduce((sum, key) => sum + (probabilities[key] ?? 0), 0);
}
async function ask(judge, block) {
  const questions = {
    implementation: IMPLEMENTATION,
    mechanism: MECHANISM,
    symbols: SYMBOLS,
    rationale: RATIONALE,
    kind: KIND
  };
  if (block.root) questions.scope = SCOPE;
  const { answers } = await decide(
    judge,
    {
      file_purpose: FILE_PURPOSE,
      file: block.file,
      section: block.section,
      passage: block.paragraph,
      changed_lines: block.added
    },
    questions
  );
  if (judge.raw) process.stdout.write(`${JSON.stringify(answers, null, 2)}
`);
  const answered = (value, id) => {
    if (value === void 0) throw new Error(`no answer to ${id}`);
    return value;
  };
  return {
    ...block,
    implementation: answered(answers.implementation?.score, "implementation"),
    confidence: answered(answers.implementation?.confidence, "implementation confidence"),
    mass: answered(
      massOf(answers.implementation?.probabilities, IMPLEMENTATION_LEVELS),
      "implementation probabilities"
    ),
    mechanism: answered(answers.mechanism?.noul, "mechanism"),
    symbols: answered(answers.symbols?.noul, "symbols"),
    rationale: answered(answers.rationale?.noul, "rationale"),
    kind: answered(answers.kind?.choice, "kind"),
    implicated: answered(
      massOf(answers.kind?.probabilities, IMPLEMENTATION_KINDS),
      "kind probabilities"
    ),
    scope: block.root ? answered(answers.scope?.noul, "scope") : 0
  };
}
async function askAll(judge, blocks, jobs) {
  const judged = [];
  const unanswered = [];
  let next = 0;
  const runner = async () => {
    while (next < blocks.length) {
      const block = blocks[next++];
      if (block === void 0) continue;
      try {
        judged.push(await ask(judge, block));
      } catch (error) {
        unanswered.push({
          block,
          reason: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, blocks.length)) }, runner));
  return { judged, unanswered };
}
function fails(judged) {
  if (judged.mechanism >= OVERRIDE_PROBABILITY) return true;
  if (judged.implicated < IMPLEMENTATION_KIND) return false;
  if (judged.mass >= FAIL_IMPLEMENTATION) return true;
  return judged.mechanism >= FAIL_PROBABILITY && judged.mass >= WARN_IMPLEMENTATION;
}
function warns(judged) {
  return judged.mass >= WARN_IMPLEMENTATION || judged.mechanism >= WARN_PROBABILITY || judged.symbols >= WARN_PROBABILITY || judged.rationale >= FAIL_PROBABILITY || judged.scope >= FAIL_PROBABILITY;
}
function severity(judged) {
  return judged.mass + Math.max(judged.mechanism, judged.symbols);
}
function headline(judged) {
  const one = judged.root ? `  one-package ${judged.scope.toFixed(2)}` : "";
  return `${judged.file}:${judged.line}  implementation ${judged.implementation.toFixed(2)} mass ${judged.mass.toFixed(2)} (confidence ${judged.confidence.toFixed(2)})  mechanism ${judged.mechanism.toFixed(2)}  identifiers ${judged.symbols.toFixed(2)}  design-note ${judged.rationale.toFixed(2)}${one}  kind=${judged.kind} ${judged.implicated.toFixed(2)}`;
}
function report(judged, mark) {
  const quoted = judged.paragraph.split("\n").map((line) => `    ${line}`).join("\n");
  return `${mark}  ${headline(judged)}
${quoted}
`;
}
function scriptNames() {
  const names = /* @__PURE__ */ new Set();
  for (const manifest of git(["ls-files", "--", "package.json", "*/package.json"]).split("\n").filter(Boolean)) {
    try {
      const json = JSON.parse((0, import_node_fs.readFileSync)(manifest, "utf8"));
      for (const name of Object.keys(json.scripts ?? {})) names.add(name);
    } catch {
    }
  }
  return names;
}
function unquote(value) {
  return value.replace(/^["']|["']$/g, "");
}
function includesOf(file, lines2, prefix) {
  const dir = (0, import_node_path.dirname)(file);
  const found = [];
  let inIncludes = false;
  let name = "";
  let path = "";
  let flatten = false;
  const flush = () => {
    if (name !== "" && path !== "") {
      found.push({ path: (0, import_node_path.join)(dir, path), prefix: flatten ? prefix : `${prefix}${name}:` });
    }
    name = "";
    path = "";
    flatten = false;
  };
  for (const line of lines2) {
    if (/^includes:\s*$/.test(line)) {
      inIncludes = true;
      continue;
    }
    if (!inIncludes) continue;
    if (/^\S/.test(line)) break;
    const inline = /^ {2}([A-Za-z0-9_-]+):\s*(\S+)\s*$/.exec(line);
    if (inline?.[1] && inline[2]) {
      flush();
      found.push({ path: (0, import_node_path.join)(dir, unquote(inline[2])), prefix: `${prefix}${inline[1]}:` });
      continue;
    }
    const header = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (header?.[1]) {
      flush();
      name = header[1];
      continue;
    }
    const taskfile = /^\s+taskfile:\s*(\S+)\s*$/.exec(line);
    if (taskfile?.[1]) {
      path = unquote(taskfile[1]);
      continue;
    }
    if (/^\s+flatten:\s*true\s*$/.test(line)) flatten = true;
  }
  flush();
  return found;
}
function tasksIn(text, prefix, names) {
  let inTasks = false;
  let inAliases = false;
  for (const line of text.split("\n")) {
    if (/^tasks:\s*$/.test(line)) {
      inTasks = true;
      continue;
    }
    if (!inTasks) continue;
    if (/^\S/.test(line)) break;
    const task = /^ {2}([A-Za-z0-9_:.-]+):\s*$/.exec(line);
    if (task?.[1]) {
      names.add(`${prefix}${task[1]}`);
      if (task[1] === "default" && prefix !== "") names.add(prefix.slice(0, -1));
      inAliases = false;
      continue;
    }
    if (/^\s+aliases:\s*$/.test(line)) {
      inAliases = true;
      continue;
    }
    const alias = /^\s+- ([A-Za-z0-9_:.-]+)\s*$/.exec(line);
    if (inAliases && alias?.[1]) {
      names.add(`${prefix}${alias[1]}`);
      continue;
    }
    if (/^\s+\S+:/.test(line)) inAliases = false;
  }
}
function collectTasks(file, prefix, names, seen) {
  const key = `${prefix}${file}`;
  if (seen.has(key) || !(0, import_node_fs.existsSync)(file)) return;
  seen.add(key);
  const text = (0, import_node_fs.readFileSync)(file, "utf8");
  for (const include of includesOf(file, text.split("\n"), prefix)) {
    collectTasks(include.path, include.prefix, names, seen);
  }
  tasksIn(text, prefix, names);
}
function taskNames() {
  const names = /* @__PURE__ */ new Set();
  const seen = /* @__PURE__ */ new Set();
  collectTasks("Taskfile.yml", "", names, seen);
  collectTasks("Taskfile.yaml", "", names, seen);
  return names;
}
function spansOf(text, file, isNew) {
  const spans = [];
  let fenced = false;
  text.split("\n").forEach((line, index) => {
    const number = index + 1;
    if (/^\s*```/.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced || !isNew(number)) return;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const span = match[1];
      if (span === void 0) continue;
      spans.push({ file, line: number, token: span });
    }
  });
  return spans;
}
function clean(token) {
  return token.replace(/^["'(]+/, "").replace(/["')]+$/, "").replace(/[,.;:]+$/, "");
}
function skipped(token) {
  if (token === "") return true;
  if (token.includes("<") || token.includes("*") || token.includes("=")) return true;
  if (token.startsWith("@") || token.startsWith("/")) return true;
  if (token.startsWith("node:")) return true;
  if (!token.includes("/") && /^[.-]/.test(token)) return true;
  if (/^[A-Z0-9_]+$/.test(token) && token.includes("_")) return true;
  return false;
}
function pathLike(token) {
  return token.includes("/") || EXTENSIONS.test(token);
}
function refsOf(span) {
  const tokens = span.token.split(/\s+/).map(clean).filter(Boolean);
  const first = tokens[0];
  if (first === void 0) return [];
  if (tokens.length === 1) {
    if (skipped(first)) return [];
    if (pathLike(first)) {
      return [{ ...span, token: first, kind: "path", needle: first, namespace: "" }];
    }
    if (first.includes(":")) {
      return [{ ...span, token: first, kind: "command", needle: first, namespace: "either" }];
    }
    const needle = first.replace(/\(\)/g, "").split(".")[0] ?? "";
    if (needle === "") return [];
    return [{ ...span, token: first, kind: "identifier", needle, namespace: "" }];
  }
  const refs2 = [];
  if (RUNNERS.has(first)) {
    const at = (first === "turbo" || first === "npm") && tokens[1] === "run" ? 2 : 1;
    const name = tokens[at];
    if (name !== void 0 && !name.startsWith("-") && !pathLike(name)) {
      refs2.push({
        ...span,
        token: name,
        kind: "command",
        needle: name,
        namespace: first === "task" ? "task" : "script"
      });
    }
  }
  for (const token of tokens) {
    if (skipped(token) || !pathLike(token)) continue;
    refs2.push({ ...span, token, kind: "path", needle: token, namespace: "" });
  }
  return refs2;
}
function resolve(ref, world) {
  if (ref.kind === "command") {
    const inScripts = world.scripts.has(ref.needle);
    const inTasks = world.tasks.has(ref.needle);
    if (ref.namespace === "script" && inScripts) return [];
    if (ref.namespace === "task" && inTasks) return [];
    if (ref.namespace === "either" && (inScripts || inTasks)) return [];
    if (ref.namespace === "task") return ["no such target in Taskfile.yml"];
    if (ref.namespace === "script") return ["no package.json declares the script"];
    return ["no package.json declares the script, and Taskfile.yml has no target"];
  }
  if (ref.kind === "identifier") {
    return world.names(ref.needle) ? [] : ["no tracked source file names it"];
  }
  const dir = (0, import_node_path.dirname)(ref.file);
  const prefix = dir === "." ? "" : `${dir}/`;
  const needle = ref.needle.replace(/^\.\//, "").replace(/\/+$/, "");
  const local = (0, import_node_path.join)(prefix, needle);
  if (world.exists(local)) return [];
  if (world.exists(needle)) return [];
  const tail = `/${needle}`;
  const scope = needle.includes("/") ? prefix : "";
  const nested = world.tracked.some(
    (file) => file.startsWith(scope) && (file.endsWith(tail) || file.includes(`${tail}/`))
  );
  if (nested) return [];
  if (prefix === "") return ["no such path tracked anywhere in the repo"];
  if (needle.includes("/")) {
    return [`no such path at ${local} or ${needle}, and none tracked under ${dir}`];
  }
  return [`no file named ${needle} is tracked anywhere in the repo`];
}
function worldOf() {
  const known = /* @__PURE__ */ new Map();
  return {
    tracked: git(["ls-files"]).split("\n").filter(Boolean),
    scripts: scriptNames(),
    tasks: taskNames(),
    exists: import_node_fs.existsSync,
    names: (needle) => {
      const seen = known.get(needle);
      if (seen !== void 0) return seen;
      let hit = false;
      try {
        (0, import_node_child_process.execFileSync)("git", ["grep", "-q", "-w", "-F", "-e", needle, "--", ":!*.md"], {
          stdio: "ignore"
        });
        hit = true;
      } catch {
      }
      known.set(needle, hit);
      return hit;
    }
  };
}
function escapeData(s) {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function escapeProp(s) {
  return escapeData(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
}
function annotate(level, file, line, title, message) {
  const head = `::${level} file=${escapeProp(file)},line=${line},title=${escapeProp(title)}`;
  process.stdout.write(`${head}::${escapeData(message)}
`);
}
function setOutput(name, value) {
  const target = process.env.GITHUB_OUTPUT;
  if (target) (0, import_node_fs.appendFileSync)(target, `${name}<<__EOF__
${value}
__EOF__
`);
}
function plural(n, one, many) {
  return n === 1 ? one : many;
}
var UNJUDGED = -1;
async function rules(scope, annotations) {
  const blocks = scope.files.flatMap(
    (file) => blocksOf((0, import_node_fs.readFileSync)(file, "utf8"), file, scope.isNew(file))
  );
  setOutput("blocks", blocks.length);
  if (blocks.length === 0) {
    process.stdout.write(`${scope.files.length} ${scope.label} AGENTS.md, no prose to judge.
`);
    return 0;
  }
  if (bool("print", false)) {
    for (const block of blocks) {
      const shown = {
        file: block.file,
        line: block.line,
        section: block.section,
        passage: block.paragraph,
        changed_lines: block.added
      };
      process.stdout.write(`${JSON.stringify(shown, null, 2)}
`);
    }
    process.stdout.write(`${blocks.length} blocks in ${scope.files.length} AGENTS.md.
`);
    return 0;
  }
  const model = input("model") || DEFAULT_MODEL;
  const key = input("api-key") || (process.env.OPENROUTER_API_KEY ?? "");
  if (key === "") {
    process.stderr.write(
      `No key for ${model}. Pass \`api-key\`, or set OPENROUTER_API_KEY in the environment.
`
    );
    process.exit(2);
  }
  const judge = {
    endpoint: input("endpoint") || DEFAULT_ENDPOINT,
    key,
    model,
    raw: bool("raw", false)
  };
  const { judged, unanswered } = await askAll(judge, blocks, Number(input("jobs")) || DEFAULT_JOBS);
  const failed = judged.filter(fails).sort((a, b) => severity(b) - severity(a));
  const warned = judged.filter((j) => !fails(j) && warns(j)).sort((a, b) => severity(b) - severity(a));
  setOutput("failures", failed.length);
  setOutput("warnings", warned.length);
  for (const one of failed) {
    process.stderr.write(report(one, "FAIL"));
    if (annotations) annotate("error", one.file, one.line, "Implementation detail", headline(one));
  }
  for (const one of warned) {
    process.stdout.write(report(one, "warn"));
    if (annotations) {
      annotate("warning", one.file, one.line, "Leaning on implementation", headline(one));
    }
  }
  if (bool("all", false)) {
    for (const file of scope.files) {
      const mine = judged.filter((j) => j.file === file);
      const bad = mine.filter(fails).length;
      const soft = mine.filter((j) => !fails(j) && warns(j)).length;
      process.stdout.write(`${file}  ${mine.length} blocks, ${bad} failing, ${soft} warning
`);
    }
  }
  for (const { block, reason } of unanswered) {
    process.stderr.write(`${block.file}:${block.line} went unjudged: ${reason}
`);
  }
  if (unanswered.length > 0) {
    process.stderr.write(
      `${unanswered.length} of ${blocks.length} blocks went unjudged. A block the model did not answer for is not a block that passed.
`
    );
    return UNJUDGED;
  }
  if (failed.length === 0) {
    process.stdout.write(
      `${blocks.length} ${plural(blocks.length, "block", "blocks")} in ${scope.files.length} AGENTS.md, none carrying implementation detail.
`
    );
    return 0;
  }
  process.stderr.write("\n");
  process.stderr.write(
    `${failed.length} ${plural(failed.length, "block carries", "blocks carry")} implementation detail.
`
  );
  process.stderr.write("\n");
  process.stderr.write("An AGENTS.md holds rules, not implementation. A name, a step or\n");
  process.stderr.write("a data flow written here rots the moment the code moves. Put the\n");
  process.stderr.write("constraint in a name, a type or a test, and leave the prose with\n");
  process.stderr.write("the rule, the boundary, or where the thing belongs.\n");
  return failed.length;
}
function refs(scope, annotations) {
  const spans = scope.files.flatMap(
    (file) => spansOf((0, import_node_fs.readFileSync)(file, "utf8"), file, scope.isNew(file))
  );
  const all = spans.flatMap(refsOf);
  setOutput("references", all.length);
  const world = worldOf();
  if (bool("print", false)) {
    for (const ref of all) {
      const tried = resolve(ref, world);
      const mark = tried.length === 0 ? "ok  " : "DEAD";
      process.stdout.write(`${ref.file}:${ref.line}  ${mark}  ${ref.kind.padEnd(10)}  ${ref.token}
`);
    }
    process.stdout.write(`${all.length} references in ${scope.files.length} AGENTS.md.
`);
    return 0;
  }
  const dead = [];
  for (const ref of all) {
    const tried = resolve(ref, world);
    if (tried.length > 0) dead.push({ ...ref, tried });
  }
  setOutput("dead-references", dead.length);
  if (dead.length === 0) {
    process.stdout.write(
      `${all.length} ${plural(all.length, "reference", "references")} in ${scope.files.length} AGENTS.md, all still resolving.
`
    );
    return 0;
  }
  for (const one of dead) {
    process.stderr.write(`${one.file}:${one.line}  ${one.token}
`);
    for (const line of one.tried) process.stderr.write(`  ${line}
`);
    if (annotations) {
      annotate("error", one.file, one.line, "Dead reference", `${one.token}: ${one.tried.join("; ")}`);
    }
  }
  process.stderr.write("\n");
  process.stderr.write(
    `${dead.length} dead ${plural(dead.length, "reference", "references")} in ${scope.files.length} AGENTS.md.
`
  );
  process.stderr.write("\n");
  process.stderr.write("An AGENTS.md points at the code, and the code is the only source\n");
  process.stderr.write("of truth. A path, a command or a name written here is dead the\n");
  process.stderr.write("moment the code moves. Fix the reference, or delete the sentence\n");
  process.stderr.write("that carries it. Prose that names a thing which must not exist\n");
  process.stderr.write("carries no backticks, so it is not read as a reference.\n");
  return dead.length;
}
async function main() {
  flags = parseArgv(process.argv.slice(2));
  const dir = input("working-directory");
  if (dir && dir !== ".") process.chdir(dir);
  config = loadConfig();
  const asked = list("checks");
  const which = asked.length > 0 ? asked : ["rules", "refs"];
  const unknown = which.filter((name) => name !== "rules" && name !== "refs");
  if (unknown.length > 0) {
    process.stderr.write(
      `Unknown ${plural(unknown.length, "check", "checks")}: ${unknown.join(", ")}. Pick \`rules\`, \`refs\`, or both.
`
    );
    process.exit(2);
  }
  const named = list("filenames");
  const filenames = new Set(named.length > 0 ? named : DEFAULT_FILENAMES);
  const annotations = bool("annotations", process.env.GITHUB_ACTIONS === "true");
  const only = input("only").replace(/\/+$/, "");
  const scope = scopeOf(filenames, patterns("ignore"));
  scope.files = scope.files.filter(
    (file) => only === "" || file === only || file.startsWith(`${only}/`)
  );
  setOutput("files", scope.files.length);
  setOutput("blocks", 0);
  setOutput("failures", 0);
  setOutput("warnings", 0);
  setOutput("references", 0);
  setOutput("dead-references", 0);
  if (scope.files.length === 0) {
    process.stdout.write(`No ${scope.label} AGENTS.md. Skipped.
`);
    return;
  }
  let violations = 0;
  let unjudged = false;
  if (which.includes("rules")) {
    const found = await rules(scope, annotations);
    if (found === UNJUDGED) unjudged = true;
    else violations += found;
  }
  if (which.includes("refs")) violations += refs(scope, annotations);
  if (unjudged) process.exit(1);
  if (violations > 0 && bool("fail-on-violations", true)) process.exit(1);
}
if (process.env.CHECK_AGENTS_MD_LIB !== "1") {
  main().catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}
`);
    process.exit(2);
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addedLines,
  blocksOf,
  fails,
  includesOf,
  loadConfig,
  parseArgv,
  refsOf,
  resolve,
  spansOf,
  tasksIn,
  warns
});
