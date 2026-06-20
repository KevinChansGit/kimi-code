# Kimi Code CLI (Custom Fork)

> **⚠️ This is a custom fork of [Moonshot AI Kimi Code CLI](https://github.com/MoonshotAI/kimi-code).**  
> This build adds cost-optimized subagent model routing and per-profile thinking-level configuration. Auto-update and upstream feedback are disabled. See the [Custom Features](#custom-features) section below for details.

[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![Docs](https://img.shields.io/badge/docs-online-blue)](https://moonshotai.github.io/kimi-code/en/) <br>
[Documentation](https://moonshotai.github.io/kimi-code/en/) · [Issues](https://github.com/MoonshotAI/kimi-code/issues) · [中文](README.zh-CN.md)

![Demo of using Kimi Code](./docs/media/intro.gif)

## What is Kimi Code CLI

Kimi Code CLI is an AI coding agent that runs in your terminal — it can read and edit code, run shell commands, search files, fetch web pages, and choose the next step based on the feedback it receives. It works out of the box with Moonshot AI's Kimi models and can also be configured to use other compatible providers.

## Custom Features

This fork adds the following capabilities on top of the upstream Kimi Code CLI:

- **Subagent model routing.** Built-in subagents (`coder`, `explore`, `plan`) can be configured to use different models than the main agent. For example, the main agent can use a powerful model (e.g. Kimi K2.5) while subagents use cost-optimized models (e.g. DeepSeek V4 Flash), reducing API costs without sacrificing quality on the main reasoning path.
- **Per-profile thinking-level configuration.** Each subagent profile can declare its own `thinkingLevel` (e.g. `off` / `low` / `medium` / `high` / `max`), independent of the main agent's setting. Useful for tuning reasoning depth per task type.
- **Runtime model override.** `spawn` options accept a `modelAlias` parameter to override the profile-declared model on a per-invocation basis.
- **Config-level agent defaults.** The `config.toml` `[agent_defaults]` section lets you assign a default model alias to any agent by name, without creating a separate profile file.
- **Disabled auto-update.** The built-in `kimi update` command is disabled to prevent overwriting this custom build with upstream binaries. Run `git pull` and `pnpm build` to update from source instead.
- **Disabled upstream feedback.** The feedback command is routed to a no-op URL to avoid sending custom-build issues to the upstream repository.

### Built-in subagent configuration (recommended in `config.toml`)

The built-in subagents (`coder`, `explore`, `plan`) can be assigned different models via the `config.toml` `[agent_defaults]` section. The bundled profile does not hard-code any provider-specific model names — you configure them in your own config.

Recommended default for cost-optimized routing:

| Subagent | Suggested model | Thinking level | Rationale |
|----------|--------------|----------------|-----------|
| `coder` | `deepseek-v4-flash` | `max` | High-throughput code editing; reasoning compensates for cheaper model |
| `explore` | `deepseek-v4-flash` | `max` | Fast read-only exploration; max reasoning for accurate analysis |
| `plan` | `deepseek-v4-pro` | `max` | Stronger model for architecture planning; pro over flash for design quality |

Add this to your `config.toml`:

```toml
[agent_defaults]
coder = "deepseek-v4-flash"
explore = "deepseek-v4-flash"
plan = "deepseek-v4-pro"

[models.deepseek-v4-flash]
provider = "deepseek"
model = "deepseek-v4-flash"
max_context_size = 64000

[models.deepseek-v4-pro]
provider = "deepseek"
model = "deepseek-v4-pro"
max_context_size = 64000

[providers.deepseek]
type = "openai"
api_key = "YOUR_API_KEY"
```

Alternatively, you can create custom agent profile YAML files with `modelAlias` and `thinkingLevel` fields — the profile loader supports both `extends` inheritance and per-subagent overrides.

## Install

**This fork must be built from source.** There is no CDN-hosted binary. You need Node.js ≥ 24.15.0 and pnpm 10.33.0.

```sh
git clone <your-fork-url>
cd kimi-code
pnpm install
pnpm build
```

Then add the built CLI to your PATH. On Windows, add `apps\kimi-code\dist` to your user PATH. On macOS/Linux, create a symlink:

```sh
ln -s $(pwd)/apps/kimi-code/dist/kimi ~/bin/kimi
```

## Quick Start

Open a project and start the interactive UI:

```sh
cd your-project
kimi
```

On first launch, run `/login` inside Kimi Code CLI and choose either Kimi Code OAuth or a Moonshot AI Open Platform API key. After login, try your first task:

```
Take a look at this project and explain its main directories.
```

## Key Features

- **Single-binary distribution.** Install with one command: no Node.js setup, PATH gymnastics, or global module conflicts.
- **Blazing-fast startup.** The TUI is ready in milliseconds, so starting a session never feels heavy.
- **Purpose-built TUI.** A carefully tuned interface, optimized end to end for long, focused agent sessions.
- **Video input.** Drop a screen recording or demo clip into the chat and let the agent watch what is hard to describe in words — turn a reference clip into a LUT, a long video into a short, a screen recording into working code, and more.
- **AI-native MCP configuration.** Add, edit, and authenticate Model Context Protocol servers conversationally with `/mcp-config`, without hand-editing JSON.
- **Rich plugin ecosystem.** Install skills, MCP servers, and data sources from the marketplace or any GitHub repo, with each install's trust level surfaced up front.
- **Subagents for focused, parallel work.** Dispatch built-in `coder`, `explore`, and `plan` subagents in isolated contexts while keeping the main conversation clean.
- **Lifecycle hooks.** Run local commands at key points to gate risky tool calls, audit decisions, trigger desktop notifications, or connect to your own automation.
- **Editor & IDE integration (ACP).** Drive a Kimi Code CLI session straight from Zed, JetBrains, or any [Agent Client Protocol](https://agentclientprotocol.com/) client with `kimi acp`.

## Use it in your editor (ACP)

Kimi Code CLI speaks the [Agent Client Protocol](https://agentclientprotocol.com/), so ACP-compatible editors and IDEs (Zed, JetBrains, …) can drive a session over stdio. Log in once, then point your editor at the `kimi acp` subcommand — no extra login needed.

For Zed, add this to `~/.config/zed/settings.json`:

```json
{
  "agent_servers": {
    "Kimi Code CLI": {
      "type": "custom",
      "command": "kimi",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

Then open a new conversation in Zed's Agent panel. See [Using in IDEs](https://moonshotai.github.io/kimi-code/en/guides/ides) for JetBrains setup and troubleshooting, and the [`kimi acp` reference](https://moonshotai.github.io/kimi-code/en/reference/kimi-acp) for the full capability matrix.

## Docs

- [Getting Started](https://moonshotai.github.io/kimi-code/en/guides/getting-started)
- [Interaction and approvals](https://moonshotai.github.io/kimi-code/en/guides/interaction)
- [Sessions](https://moonshotai.github.io/kimi-code/en/guides/sessions)
- [Using in IDEs (ACP)](https://moonshotai.github.io/kimi-code/en/guides/ides)
- [Configuration](https://moonshotai.github.io/kimi-code/en/configuration/config-files)
- [Command reference](https://moonshotai.github.io/kimi-code/en/reference/kimi-command)

## Develop

Requirements: Node.js ≥ 24.15.0, pnpm 10.33.0.

```sh
git clone https://github.com/MoonshotAI/kimi-code.git
cd kimi-code
pnpm install
```

```sh
pnpm dev:cli    # run the CLI in dev mode
pnpm test       # run tests
pnpm typecheck  # TypeScript check
pnpm lint       # oxlint
pnpm build      # build all packages
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide.

## Community

- [Issues](https://github.com/MoonshotAI/kimi-code/issues)
- For security vulnerabilities, see [SECURITY.md](SECURITY.md).

## Acknowledgements

Our TUI is built on top of [`pi-tui`](https://github.com/earendil-works/pi-mono/tree/main/packages/tui). We thank the authors of `pi-tui` for their valuable work.

## License

Released under the [MIT License](LICENSE).
