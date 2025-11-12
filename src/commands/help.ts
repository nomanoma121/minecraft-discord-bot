import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { EMBED_COLORS } from "../constants";

export const help = {
	name: "help",
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("Shows all available commands and their descriptions"),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		const embed = new EmbedBuilder()
			.setTitle("Minecraft Discord Bot - Commands")
			.setColor(EMBED_COLORS.INFO)
			.setDescription(
				"Here are all the available commands for managing Minecraft servers:",
			)
			.addFields(
				{
					name: "/create",
					value:
						"Creates a new Minecraft server with customizable settings (version, gamemode, difficulty, etc.)",
					inline: false,
				},
				{
					name: "/list",
					value:
						"Lists all Minecraft servers with their current status and details",
					inline: false,
				},
				{
					name: "/start",
					value:
						"Starts an existing Minecraft server (only one server can run at a time)",
					inline: false,
				},
				{
					name: "/stop",
					value: "Stops a running Minecraft server",
					inline: false,
				},
				{
					name: "/status",
					value:
						"Shows detailed status information of a specific Minecraft server",
					inline: false,
				},
				{
					name: "/delete",
					value:
						"Deletes a Minecraft server (only the owner can delete their server)",
					inline: false,
				},
				{
					name: "/edit",
					value:
						"Edits server settings like description, max players, gamemode, difficulty, and version (owner only)",
					inline: false,
				},
				{
					name: "/whitelist",
					value: "Manage server whitelist (list/add/remove players)",
					inline: false,
				},
				{
					name: "/ops",
					value: "Manage server operators (list/add/remove operators)",
					inline: false,
				},
				{
					name: "/backup-create",
					value: "Creates a backup of a Minecraft server's world data",
					inline: false,
				},
				{
					name: "/backup-list",
					value: "Lists all available backups for a specific server",
					inline: false,
				},
				{
					name: "/backup-restore",
					value:
						"Restores a server from a backup (owner only, server must be stopped)",
					inline: false,
				},
				{
					name: "/backup-delete",
					value: "Deletes a backup for a specific server (owner only)",
					inline: false,
				},
				{
					name: "/help",
					value: "Shows this help message with all available commands",
					inline: false,
				},
			)
			.setFooter({
				text: "Use /create to get started with your first server!",
			});

		await interaction.editReply({ embeds: [embed] });
	},
};
