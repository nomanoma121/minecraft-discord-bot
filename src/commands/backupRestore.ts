import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";

export const backupRestore = {
	name: "backup-restore",
	data: new SlashCommandBuilder()
		.setName("backup-restore")
		.setDescription("Restores a backup of a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the Minecraft server to restore.")
				.setRequired(true),
		),

	async autocomplete(interaction: AutocompleteInteraction) {},

	async execute(interaction: ChatInputCommandInteraction) {},
};
