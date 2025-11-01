# Minecraft Discord Bot

A Discord bot for managing Minecraft servers directly from Discord.

## Features

- Create and delete Minecraft servers
- Start and stop servers
- Check server status
- List all servers

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/)
- [Bun](https://bun.sh/)
- [discord.js](https://discord.js.org/)
- [Docker](https://www.docker.com/) ([Dockerode](https://github.com/apocas/dockerode))
- [SQLite](https://www.sqlite.org/) ([Drizzle ORM](https://orm.drizzle.team/))

## Installation and Usage

### Prerequisites

- Bun
- Docker

### Setup

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your tokens and configuration

# Initialize database
bun run db:push

# Deploy Discord commands
bun run cmd:deploy

# Start the bot
bun run dev
```

### Environment Variables

```env
DISCORD_TOKEN=your_discord_token_here
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
DB_FILE_NAME=database.db
```

## Commands

| Command | Description |
|---------|-------------|
| `/create` | Create a new Minecraft server |
| `/start` | Start an existing server |
| `/stop` | Stop a running server |
| `/status` | Check server status |
| `/list` | List all servers |
| `/delete` | Delete a server (owner only) |
| `/help` | Show help message |

### Server Creation Options

- `server-name` - Server name (required)
- `version` - Minecraft version (default: latest)
- `gamemode` - Game mode (survival/creative/adventure/spectator)
- `difficulty` - Difficulty level (peaceful/easy/normal/hard)
- `description` - Server description
- `max-players` - Maximum players (default: 20)

## Configuration

Configuration settings can be modified in `src/config.ts`:

- `port` - Port number for Minecraft servers (default: 25565)
- `maxServerCount` - Maximum number of servers allowed (default: 10)

## Development

```bash
bun run dev          # Development mode with hot reload
bun run db:push      # Apply database schema
bun run cmd:deploy   # Deploy Discord commands
bun run biome:check  # Lint and format code
```

## Contributing

Feel free to open issues or submit pull requests for improvements and bug fixes.
