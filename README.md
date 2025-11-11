# Minecraft Discord Bot

A Discord bot for managing Minecraft servers directly from Discord.

**Note**: This bot is designed for managing individual servers that run one at a time. You can create multiple server configurations and easily switch between them, but only one server can be running simultaneously. This design ensures optimal resource usage and simplicity. Concurrent server execution is planned for future implementation.

## Features

- 🎮 Create, edit, and delete Minecraft servers
- 🚀 Start and stop servers
- 📊 Check server status
- 📝 List all servers
- 💾 Backup and restore server data
- 🖼️ Custom server icons

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/)
- [Bun](https://bun.sh/)
- [discord.js](https://discord.js.org/)
- [Docker](https://www.docker.com/) ([Dockerode](https://github.com/apocas/dockerode))
- [Sharp](https://sharp.pixelplumbing.com/) (Image processing)

## Installation and Usage

### Prerequisites

- Docker

### Setup

```bash
# Set up environment variables
cp .env.example .env
# Edit .env with your Discord tokens

# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f bot
```

### Environment Variables

```env
DISCORD_TOKEN=your_discord_token_here
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
```

## Commands

| Command | Description |
|---------|-------------|
| `/create` | Create a new Minecraft server |
| `/start` | Start an existing server |
| `/stop` | Stop a running server |
| `/status` | Check server status |
| `/list` | List all servers |
| `/edit` | Edit server configuration (owner only) |
| `/delete` | Delete a server (owner only) |
| `/backup-create` | Create a backup of server data |
| `/backup-list` | List all backups for a server |
| `/backup-restore` | Restore a server from backup |
| `/backup-delete` | Delete a backup (owner only) |
| `/help` | Show help message |

---

### `/create` - Create a new Minecraft server

Creates a new Minecraft server with customizable settings.

**Options:**
- `server-name` (required) - Unique name for your server
- `version` (required) - Minecraft version (e.g., "1.20.1")
- `icon` (optional) - Server icon image (automatically resized to 64x64)
- `description` (optional) - Server description (default: "A Minecraft server")
- `gamemode` (optional) - Game mode: survival, creative, adventure, spectator (default: survival)
- `difficulty` (optional) - Difficulty: peaceful, easy, normal, hard (default: normal)
- `server-type` (optional) - Server type (default: paper)
- `max-players` (optional) - Maximum players (1-100, default: 20)

**Example:**
```
/create server-name:MyServer version:1.20.1 gamemode:survival difficulty:normal max-players:10
```

---

### `/start` - Start a server

Starts an existing Minecraft server. Only one server can run at a time.

**Options:**
- `server-name` (required) - Name of the server to start

**Example:**
```
/start server-name:MyServer
```

The bot will wait for the server to become healthy before confirming success.

---

### `/stop` - Stop a server

Stops a currently running Minecraft server.

**Options:**
- `server-name` (required) - Name of the server to stop

**Example:**
```
/stop server-name:MyServer
```

---

### `/status` - Check server status

Displays detailed information about a server including its current status and uptime.

**Options:**
- `server-name` (required) - Name of the server to check

**Example:**
```
/status server-name:MyServer
```

Shows: version, type, gamemode, difficulty, max players, owner, and current status (Running/Stopped with uptime).

---

### `/list` - List all servers

Displays a list of all Minecraft servers with their current status.

**Example:**
```
/list
```

Shows all servers with their names, owners, and status.

---

### `/edit` - Edit server configuration

Edits an existing server's configuration. The server must be stopped before editing. **Owner only.**

**Options:**
- `server-name` (required) - Name of the server to edit
- `icon` (optional) - New server icon image (automatically resized to 64x64)
- `description` (optional) - New server description
- `max-players` (optional) - New maximum players (1-100)
- `gamemode` (optional) - New game mode
- `difficulty` (optional) - New difficulty
- `version` (optional) - New Minecraft version

**Example:**
```
/edit server-name:MyServer difficulty:hard max-players:20
```

At least one field must be provided to update.

---

### `/delete` - Delete a server

Permanently deletes a server and all its data including backups. The server must be stopped before deletion. **Owner only.**

**Options:**
- `server-name` (required) - Name of the server to delete

**Example:**
```
/delete server-name:MyServer
```

**Warning:** This action cannot be undone!

---

### `/backup-create` - Create a backup

Creates a backup of a running server's world data.

**Options:**
- `server-name` (required) - Name of the server to back up

**Example:**
```
/backup-create server-name:MyServer
```

The server must be running to create a backup. Backups are stored as compressed archives.

---

### `/backup-list` - List backups

Lists all available backups for a specific server.

**Options:**
- `server-name` (required) - Name of the server

**Example:**
```
/backup-list server-name:MyServer
```

---

### `/backup-restore` - Restore from backup

Restores a server from a previously created backup. The server must be stopped before restoring. **Owner only.**

**Options:**
- `server-name` (required) - Name of the server to restore
- `backup` (required) - Backup timestamp to restore from

**Example:**
```
/backup-restore server-name:MyServer backup:2025-01-10_15-30-45
```

**Warning:** This will overwrite the current server data!

---

### `/backup-delete` - Delete a backup

Deletes a specific backup. **Owner only.**

**Options:**
- `server-name` (required) - Name of the server
- `backup` (required) - Backup timestamp to delete

**Example:**
```
/backup-delete server-name:MyServer backup:2025-01-10_15-30-45
```

---

### `/help` - Show help

Displays a help message with available commands.

**Example:**
```
/help
```

## Configuration

Configuration settings can be modified in `src/config.ts`:

- `port` - Port number for Minecraft servers (default: 25565)
- `maxServerCount` - Maximum number of servers allowed (default: 10)
- `maxTotalBackupCount` - Maximum total backups across all servers (default: 50)
- `maxBackupCountPerServer` - Maximum backups per server (default: 7)
- `overrideOldBackups` - Auto-delete oldest backups when limit is reached (default: true)

## Development

```bash
bun run dev          # Development mode with hot reload
bun run cmd:deploy   # Deploy Discord commands
bun run biome:check  # Lint and format code
```

## Contributing

Feel free to open issues or submit pull requests for improvements and bug fixes.
