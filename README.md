# attractor-ui

Web frontend for the attractor pipeline runner.

[![CI](https://github.com/bkrabach/attractor-ui/actions/workflows/ci.yaml/badge.svg)](https://github.com/bkrabach/attractor-ui/actions)
[![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

A React-based dashboard for running and observing [attractor](https://github.com/bkrabach/attractor) pipelines in the browser. It connects to [attractor-server](https://github.com/bkrabach/attractor-server) for pipeline execution and streams real-time events, graph visualization, human-in-the-loop interaction, and file exploration through a single-page interface.

## Features

- **Pipeline graph** — interactive DAG visualization with zoom, pan, and node selection
- **Event stream** — real-time pipeline events with collapsible per-node grouping
- **Human-in-the-loop** — answer pipeline questions directly in the browser
- **File explorer** — browse pipeline working directory contents with markdown rendering
- **Node details** — inspect node responses with instance navigation for looped nodes
- **DOT rendering** — client-side graph layout via @viz-js/viz
- **Responsive layout** — resizable panels for graph, events, and detail views

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

## Origin

This project was developed as a web frontend companion to [attractor](https://github.com/bkrabach/attractor), providing a browser-based interface for running and observing pipelines.

## Ecosystem

| Project | Description |
|---------|-------------|
| [attractor](https://github.com/bkrabach/attractor) | DOT-based pipeline engine |
| [attractor-server](https://github.com/bkrabach/attractor-server) | HTTP API server |
| [attractor-ui](https://github.com/bkrabach/attractor-ui) | Web frontend |
| [unified-llm](https://github.com/bkrabach/unified-llm) | Multi-provider LLM client |
| [coding-agent-loop](https://github.com/bkrabach/coding-agent-loop) | Agentic tool loop |

## License

MIT
