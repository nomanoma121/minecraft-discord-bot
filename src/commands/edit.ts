import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import {
	AUTOCOMPLETE_MAX_CHOICES,
	DIFFICULTY,
	EMBED_COLORS,
	GAMEMODE,
} from "../constants";
import { createErrorEmbed } from "../lib/embed";
import type { Difficulty, Gamemode } from "../types/server";
import { getAllServers } from "../utils"
import { docker, parseLabels, filterLabelBuilder } from "../lib/docker";

export const edit = {
	name: "edit",
	data: new SlashCommandBuilder()
		.setName("edit")
		.setDescription("Edit an existing Minecraft server configuration")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the server to edit")
				.setAutocomplete(true)
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("description")
				.setDescription("New description for the server")
				.setRequired(false),
		)
		.addIntegerOption((option) =>
			option
				.setName("max-players")
				.setDescription("Maximum number of players")
				.setMinValue(1)
				.setMaxValue(100)
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("gamemode")
				.setDescription("Game mode")
				.setChoices(
					{ name: "survival", value: GAMEMODE.SURVIVAL },
					{ name: "creative", value: GAMEMODE.CREATIVE },
					{ name: "adventure", value: GAMEMODE.ADVENTURE },
					{ name: "spectator", value: GAMEMODE.SPECTATOR },
				)
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("difficulty")
				.setDescription("Difficulty level")
				.setChoices(
					{ name: "peaceful", value: DIFFICULTY.PEACEFUL },
					{ name: "easy", value: DIFFICULTY.EASY },
					{ name: "normal", value: DIFFICULTY.NORMAL },
					{ name: "hard", value: DIFFICULTY.HARD },
				)
				.setRequired(false),
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused();
		const servers = await getAllServers();
		const filtered = servers.filter((server) =>
			server.name.toLowerCase().startsWith(focusedValue.toLowerCase()),
		);
		await interaction.respond(
			filtered.slice(0, AUTOCOMPLETE_MAX_CHOICES).map((server) => ({
				name: server.name,
				value: server.name,
			})),
		);
	},

	async execute(interaction: ChatInputCommandInteraction) {
		const serverName = interaction.options.getString("server-name");
		if (!serverName) {
			await interaction.reply({
				embeds: [createErrorEmbed("Server name is required.")],
			});
			return;
		}

		const description = interaction.options.getString("description");
		const maxPlayers = interaction.options.getInteger("max-players");
		const gamemode = interaction.options.getString(
			"gamemode",
		) as Gamemode | null;
		const difficulty = interaction.options.getString(
			"difficulty",
		) as Difficulty | null;

		// Check if at least one field is provided
		if (!description && !maxPlayers && !gamemode && !difficulty) {
			await interaction.reply({
				embeds: [
					createErrorEmbed(
						"Please provide at least one field to update (description, max-players, gamemode, or difficulty).",
					),
				],
				ephemeral: true,
			});
			return;
		}

		await interaction.reply(`⌛ Checking server "${serverName}"...`);

		try {
			const containers = await docker.listContainers({
				all: false,
				filters: {
					labels: filterLabelBuilder({ managed: true, name: serverName }) 
				}
			})
			const container = containers[0];
			if (!container) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(`No server found with the name "${serverName}".`),
					],
				});
				return;
			}

			const server = parseLabels(container.Labels);
			if (server.ownerId !== interaction.user.id) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							"You don't have permission to edit this server. Only the owner can edit it.",
						),
					],
				});
				return;
			}

			await interaction.editReply(
				`✅ Check server "${serverName}"\n⌛ Updating configuration...`,
			);

			const updates: {
				description?: string;
				maxPlayers?: number;
				gamemode?: Gamemode;
				difficulty?: Difficulty;
			} = {};

			if (description !== null) updates.description = description;
			if (maxPlayers !== null) updates.maxPlayers = maxPlayers;
			if (gamemode !== null) updates.gamemode = gamemode;
			if (difficulty !== null) updates.difficulty = difficulty;

			const 

			const embed = new EmbedBuilder()
				.setTitle(`Server "${serverName}" Updated`)
				.setColor(EMBED_COLORS.SUCCESS)
				.setDescription(
					"The server configuration has been updated successfully.\n\n**Note:** You need to restart the server for changes to take effect.",
				)
				.addFields(
					{ name: "Server Name", value: updatedServer.name, inline: true },
					{ name: "Version", value: updatedServer.version, inline: true },
					{
						name: "Gamemode",
						value: updatedServer.gamemode,
						inline: true,
					},
					{
						name: "Difficulty",
						value: updatedServer.difficulty,
						inline: true,
					},
					{
						name: "Max Players",
						value: updatedServer.maxPlayers.toString(),
						inline: true,
					},
					{
						name: "Description",
						value: updatedServer.description || "N/A",
						inline: false,
					},
					{ name: "Owner", value: `<@${updatedServer.ownerId}>`, inline: true },
				)
				.setFooter({ text: "Restart the server to apply changes" });

			await interaction.editReply({ content: "", embeds: [embed] });
		} catch (error) {
			console.error("Error editing server:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while updating the server. Please try again later.",
					),
				],
			});
		}
	},
};
