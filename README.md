# attractor-ui

Web frontend for the [attractor](https://github.com/bkrabach/attractor) pipeline runner.

[![CI](https://github.com/bkrabach/attractor-ui/actions/workflows/ci.yaml/badge.svg)](https://github.com/bkrabach/attractor-ui/actions)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

A React-based dashboard for running and observing attractor pipelines:

- **Pipeline graph** — interactive DAG visualization with zoom, pan, and node selection
- **Event stream** — real-time pipeline events with collapsible per-node grouping
- **Human-in-the-loop** — answer pipeline questions directly in the browser
- **File explorer** — browse pipeline working directory contents with markdown rendering
- **Node details** — inspect node responses with instance navigation for looped nodes

## Quick Start

```bash
git clone https://github.com/bkrabach/attractor-ui.git
cd attractor-ui
npm install --legacy-peer-deps
npm run dev
```

Requires [attractor-server](https://github.com/bkrabach/attractor-server) running on port 3000.

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS
- Vite
- Vitest for testing
- @viz-js/viz for DOT graph rendering

## Development

```bash
npm run dev          # Start dev server
npx vitest run       # Run tests
npx vite build       # Production build
```

## Related

- [attractor](https://github.com/bkrabach/attractor) — Pipeline engine
- [attractor-server](https://github.com/bkrabach/attractor-server) — HTTP API server
- [unified-llm](https://github.com/bkrabach/unified-llm) — Multi-provider LLM client
- [coding-agent-loop](https://github.com/bkrabach/coding-agent-loop) — Agentic tool loop
