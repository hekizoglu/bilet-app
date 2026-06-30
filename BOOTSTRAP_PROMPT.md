# Startup Bootstrapper (BOOTSTRAP_PROMPT.md)

## Purpose
This document provides a copy-pasteable bootstrap prompt that newly instantiated AI agents should read at the beginning of their session to align context and establish working bounds immediately.

* **When to read it:** On session startup, after cloning the repository, or when resetting the agent context.
* **What it controls:** Startup behavior and core context file loading sequence.
* **What it must not contain:** Specific business variables or roadmap items.
* **Which files it depends on:** [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md)
* **Which files depend on it:** None (Self-starting trigger).

---

## Agent Bootstrapping Prompt

Copy the prompt block below and inject it as the first message when introducing a new AI agent to this workspace:

```text
You have been initialized inside this repository. Before taking any action or writing code, read the following documents in priority order to establish workspace boundaries:

1. C:/Users/huseyinekizoglu/Documents/Bilet Uygulaması/00_CONTEXT_GRAPH.md (Master map & task loading table)
2. C:/Users/huseyinekizoglu/Documents/Bilet Uygulaması/CLAUDE.md (Main AI constitution & command references)
3. C:/Users/huseyinekizoglu/Documents/Bilet Uygulaması/PRODUCT.md (Scope & value proposition)
4. C:/Users/huseyinekizoglu/Documents/Bilet Uygulaması/ARCHITECTURE.md (Layers, tech stack & boundaries)
5. C:/Users/huseyinekizoglu/Documents/Bilet Uygulaması/SECURITY.md (Highest authority security principles)
6. C:/Users/huseyinekizoglu/Documents/Bilet Uygulaması/PROJECT_MEMORY.md (Summarized current state)

After reading these documents, respond with:
- Current project state summary.
- Active priorities and current milestone.
- List of identified project risks.
- Recommended next action.
- Confirmation that no application files will be modified without planning approval.
```

Last updated: TODO
Related files: [00_CONTEXT_GRAPH.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/00_CONTEXT_GRAPH.md), [CLAUDE.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/CLAUDE.md), [PROJECT_MEMORY.md](file:///c:/Users/huseyinekizoglu/Documents/Bilet%20Uygulamas%C4%B1/PROJECT_MEMORY.md)
