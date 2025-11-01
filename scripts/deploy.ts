import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";

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

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

try {
	console.log(
		`Started refreshing ${commands.length} application (/) commands.`,
	);

	const data = await rest.put(
		Routes.applicationGuildCommands(
			process.env.CLIENT_ID!,
			process.env.GUILD_ID!,
		),
		{ body: commands },
	);

	if (!Array.isArray(data)) throw new Error("Failed to deploy commands");

	console.log(`Successfully reloaded ${data.length} application (/) commands.`);
} catch (error) {
	console.error(error);
}
