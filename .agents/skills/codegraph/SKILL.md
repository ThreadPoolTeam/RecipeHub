---
name: codegraph
description: Code intelligence, symbol search, dependency tracing and call graph using CodeGraph CLI and MCP. Use when exploring architecture, finding callers/callees, tracking impact of changes, or searching symbols.
---

# CodeGraph

Code intelligence and knowledge graph tool for codebase navigation.

## Status Check
Check if project is indexed:
- Inspect `.codegraph/` folder in project root.
- If missing, run `codegraph init .` to initialize and build the index.

## CLI Usage

| Action | Command | Purpose |
|---|---|---|
| Initialize | `codegraph init .` | Build initial project index |
| Update Index | `codegraph sync .` | Incremental update after code edits |
| Full Reindex | `codegraph index .` | Full rebuild of graph index |
| Check Status | `codegraph status .` | Show indexing stats |
| Explore | `codegraph explore "<query>"` | Symbol source + call paths in one shot |
| Symbol Trail | `codegraph node "<symbol>"` | Source code + caller/callee trail |
| Callers | `codegraph callers "<symbol>"` | Find all callers of symbol |
| Callees | `codegraph callees "<symbol>"` | Find all functions symbol calls |
| Impact | `codegraph impact "<symbol>"` | Impact analysis before refactoring |
| Affected Tests | `codegraph affected [files...]` | Find test files affected by changes |

## MCP Tools
When indexed, use available MCP tools:
- `codegraph_explore`: Deep context exploration around an area/feature.
- `codegraph_node`: Deep lookup for a specific symbol.
