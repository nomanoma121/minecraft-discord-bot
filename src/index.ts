import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	MessageFlags,
} from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.MessageContent,
	],
});

client.once(Events.ClientReady, () => {
	console.log("Ready!");
});

// ref: https://discordjs.guide/legacy/app-creation/handling-commands
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
	.readdirSync(commandsPath)
	.filter((file) => file.endsWith(".ts") || file.endsWith(".js"));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const module = await import(filePath);
	const commandName = path.basename(file, ".ts") || path.basename(file, ".js");
	const command = module[commandName];

	if (command && "data" in command && "execute" in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(
			`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
		);
	}
}

client.on(Events.InteractionCreate, async (interaction) => {
	if (interaction.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(
				`No command matching ${interaction.commandName} was found.`,
			);
			return;
		}

		if (!command.autocomplete) {
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	}

	if (!interaction.isCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	if (interaction.isChatInputCommand()) {
		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`Error executing ${interaction.commandName}:`, error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			} else {
				await interaction.reply({
					content: "There was an error while executing this command!",
					flags: MessageFlags.Ephemeral,
				});
			}
		}
	}
});

client.login(process.env.DISCORD_TOKEN);
