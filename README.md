# Hopkin CLI

Manage your ad campaigns and marketing tools across Meta, Google, LinkedIn, Reddit, TikTok, Mailchimp, and Google Search Console — all from the terminal.

Hopkin CLI provides a unified interface to interact with ad and marketing platforms. Instead of juggling multiple dashboards, run one command.

You need a [Hopkin account](https://hopkin.ai) to use the CLI. Sign up at [hopkin.ai](https://hopkin.ai) to get your API key.

## Install

```bash
npm install -g @hopkin/cli
```

## Quick Start

```bash
# Set your API key
hopkin auth set-key <your-key>

# List campaigns on Meta
hopkin meta campaigns list

# List Google ad groups as JSON
hopkin google adgroups list --json

# Export Reddit campaigns to CSV
hopkin reddit campaigns list --format csv --output campaigns.csv
```

## Supported Platforms

| Platform               | Command      |
|------------------------|--------------|
| Meta                   | `meta`       |
| Google Ads             | `google`     |
| LinkedIn               | `linkedin`   |
| Reddit                 | `reddit`     |
| TikTok                 | `tiktok`     |
| Mailchimp              | `mailchimp`  |
| Google Search Console  | `gsc`        |

## Usage

```
hopkin <platform> <resource> [verb] [flags]
```

### Platform Commands

Use `hopkin tools list` to see all available tools, or explore a platform interactively:

```bash
# See what's available on a platform
hopkin meta --help

# List tools for a specific platform
hopkin tools list --platform meta
```

Command resolution is flexible — `hopkin meta campaigns list` and `hopkin meta list campaigns` both work.

### Built-in Commands

#### `hopkin auth`

Manage authentication.

```bash
hopkin auth login          # Log in to Hopkin
hopkin auth logout         # Log out
hopkin auth status         # Show authentication status
hopkin auth whoami         # Display current user info
hopkin auth set-key <key>  # Set an API key
```

#### `hopkin config`

Manage CLI configuration.

```bash
hopkin config set meta.default_account 123456789
hopkin config get meta.default_account
hopkin config unset meta.default_account
```

#### `hopkin tools`

Manage tool discovery and caching.

```bash
hopkin tools list      # List available tools
hopkin tools refresh   # Refresh the tool cache
```

#### `hopkin apikeys`

Manage API keys.

```bash
hopkin apikeys list
hopkin apikeys create
hopkin apikeys delete
```

#### `hopkin completion`

Generate shell completion scripts.

```bash
# Bash
hopkin completion bash >> ~/.bashrc

# Zsh
hopkin completion zsh >> ~/.zshrc

# Fish
hopkin completion fish > ~/.config/fish/completions/hopkin.fish
```

### Global Flags

| Flag              | Description                              |
|-------------------|------------------------------------------|
| `--json`          | Output as JSON                           |
| `--format <fmt>`  | Output format: `table`, `json`, `csv`, `tsv` |
| `--output <path>` | Write output to a file                   |
| `--all`           | Fetch all pages of results               |
| `--limit <n>`     | Max results per page                     |
| `--fields <list>` | Comma-separated fields to include        |
| `--account <id>`  | Override account ID                      |
| `--api-key <key>` | Override API key                         |
| `--debug`         | Enable debug logging                     |
| `--no-color`      | Disable color output                     |

## Authentication

Hopkin resolves credentials in this order:

1. `--api-key` flag
2. `HOPKIN_API_KEY` environment variable
3. Stored credentials in `~/.config/hopkin/credentials.json`

Set your API key to get started:

```bash
hopkin auth set-key <your-key>
```

You can manage API keys at [app.hopkin.ai](https://app.hopkin.ai).

## Configuration

Configuration is stored in `~/.config/hopkin/config.json` (or `$XDG_CONFIG_HOME/hopkin/config.json`).

### Environment Variables

| Variable                 | Description                        |
|--------------------------|------------------------------------|
| `HOPKIN_API_KEY`         | API key                            |
| `HOPKIN_CONFIG_DIR`      | Override config directory location  |
| `HOPKIN_DEFAULT_ACCOUNT` | Default account ID                  |
| `HOPKIN_DEFAULT_PLATFORM`| Default platform                    |
| `HOPKIN_OUTPUT_FORMAT`   | Default output format               |
| `HOPKIN_NO_COLOR`        | Disable color output                |
| `HOPKIN_DEBUG`           | Enable debug logging                |

## Examples

```bash
# List all Meta campaigns with specific fields
hopkin meta campaigns list --fields id,name,status

# Get all Google campaigns across all pages
hopkin google campaigns list --all

# Export LinkedIn campaigns to a file as TSV
hopkin linkedin campaigns list --format tsv --output report.tsv

# Use a specific account
hopkin meta campaigns list --account 123456789

# Pipe JSON output to jq
hopkin meta campaigns list --json | jq '.[] | .name'
```

## Development

```bash
git clone https://github.com/nichochar/hopkin-cli.git
cd hopkin-cli
npm install
npm run build
```

### Scripts

| Command          | Description              |
|------------------|--------------------------|
| `npm run build`  | Build with tsup          |
| `npm run dev`    | Watch mode               |
| `npm test`       | Run unit tests           |
| `npm run test:int` | Integration tests      |
| `npm run test:e2e` | End-to-end tests       |
| `npm run test:all` | All tests              |
| `npm run lint`   | Lint with ESLint         |
| `npm run typecheck` | TypeScript type check |

## License

Apache-2.0
