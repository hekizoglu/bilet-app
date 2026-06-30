# Token & Cost Optimization (TOKEN_OPTIMIZATION.md)

## Purpose
This document establishes rules for minimizing context sizes, choosing cheap vs. expensive models, compressing agent outputs, and preventing token waste during development.

* **When to read it:** Before launching complex searches, reading large code files, or configuring subagents.
* **What it controls:** File reading strategies, context compression, and model selection guidelines.
* **What it must not contain:** App requirements or system variables.
* **Which files it depends on:** [AGENTS.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/AGENTS.md)
* **Which files depend on it:** [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md), [CLAUDE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/CLAUDE.md)

---

## Context Loading Strategy & Rules

### 1. The Context Hierarchy
Before loading any files, check their status in this order:
* **Level 1 (Memory):** Read [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md) (Takes ~500 tokens). Stop if this resolves your query.
* **Level 2 (Search):** Use `grep_search` to target specific directories/lines rather than reading full files.
* **Level 3 (Read File):** Use `view_file` to read ONLY the specific lines of interest (e.g., lines 45-80). Never load more than 800 lines at once unless executing compilation reviews.

### 2. Multi-Agent Task Routing
* **Gemini Flash / GPT-4o-mini:** Use for basic code execution checks, formatting, test runs, and initial text processing.
* **Gemini Pro / Claude Opus / GPT-4o:** Use for plan creation, security audits, design decisions, and review gating.

---

## Context Compression Rules
* **Code Summaries:** When reporting results to the primary agent, write a diff-block description rather than copying whole functions.
* **Log Truncation:** Trim log files before saving them or attaching them to prompts (keep only the top and bottom 20 lines of relevant stack trace).

## Token-Wasting Anti-Patterns (Do NOT do)
* **No `cat` or broad `list_dir`:** Avoid reading all files in a folder recursively.
* **No code duplication in docs:** Do not copy code snippets into markdown logs; reference the file using a URI link instead (e.g., `[Code](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/file.js#L12)`).

Last updated: TODO
Related files: [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md), [CLAUDE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/CLAUDE.md)
