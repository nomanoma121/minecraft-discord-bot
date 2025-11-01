import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";

const discordToken = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const commandsPath = path.join(__dirname, "../src/commands");
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const module = await import(filePath);
	const commandName = path.basename(file, ".ts") || path.basename(file, ".js");
	const command = module[commandName];
	if (command && "data" in command && "execute" in command) {
		commands.push(command.data.toJSON());
	} else {
		console.log(
			`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
		);
	}
}

if (!discordToken || !clientId || !guildId) {
	throw new Error(
		"Missing environment variables: DISCORD_TOKEN, CLIENT_ID, or GUILD_ID",
	);
}

const rest = new REST().setToken(discordToken);

try {
	console.log(
		`Started refreshing ${commands.length} application (/) commands.`,
	);

	const data = await rest.put(
		Routes.applicationGuildCommands(clientId, guildId),
		{ body: commands },
	);

	if (!Array.isArray(data)) throw new Error("Failed to deploy commands");

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
	console.error(error);
}
