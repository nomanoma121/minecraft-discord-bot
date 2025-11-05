import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { queries as q } from "../db/queries";

export const backupAuto = {
	name: "backup-auto",
	data: new SlashCommandBuilder()
		.setName("backup-auto")
		.setDescription("Toggles automatic backups for a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription(
					"Name of the Minecraft server to toggle automatic backups for.",
				)
				.setRequired(true),
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused();
		const servers = await q.getAllServers();
		const filtered = servers.filter((server) =>
			server.name.toLowerCase().startsWith(focusedValue.toLowerCase()),
		);
		await interaction.respond(
			filtered.map((server) => ({
				name: server.name,
				value: server.name,
			})),
		);
	},

	async execute(interaction: ChatInputCommandInteraction) {
		const serverName = interaction.options.getString("server-name");
	},
};
