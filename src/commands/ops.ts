import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { EMBED_COLORS } from "../constants";
import { docker, execCommands } from "../lib/docker";
import { createErrorEmbed, createInfoEmbed } from "../lib/embed";
import type { Whitelist } from "../types/server";
import { getServerByName } from "../utils";

const SUBCOMMANDS = {
	LIST: "list",
	ADD: "add",
	REMOVE: "remove",
};

export const ops = {
	name: "ops",
	description: "Manage server operators",
	data: new SlashCommandBuilder()
		.setName("ops")
		.setDescription("Manage server operators")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.LIST)
				.setDescription("List all operators on the server")
				.addStringOption((option) =>
					option
						.setName("server-name")
						.setDescription("The name of the server")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.ADD)
				.setDescription("Add an operator to the server")
				.addStringOption((option) =>
					option
						.setName("server-name")
						.setDescription("The name of the server")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("user-id")
						.setDescription("The username of the player to add as an operator")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.REMOVE)
				.setDescription("Remove an operator from the server")
				.addStringOption((option) =>
					option
						.setName("server-name")
						.setDescription("The name of the server")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("user-id")
						.setDescription(
							"The username of the player to remove from operators",
						)
						.setRequired(true),
				),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();
		const subcommand = interaction.options.getSubcommand();

		const serverName = interaction.options.getString("server-name");
		if (!serverName) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Server name is required.")],
			});
			return;
		}

		const server = await getServerByName(serverName);
		if (!server) {
			await interaction.editReply({
				embeds: [createInfoEmbed(`Server "${serverName}" not found.`)],
			});
			return;
		}

		const userId = interaction.options.getString("user-id");

		const container = docker.getContainer(server.id);
		const containerInfo = await container.inspect();
		if (!containerInfo.State.Running) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(`
          Server "${serverName}" is not running.`),
				],
			});
			return;
		}

		switch (subcommand) {
			case SUBCOMMANDS.LIST: {
				const { output, errorOutput } = await execCommands(container, [
					"cat",
					"/data/ops.json",
				]);
				const ops = JSON.parse(output) as Whitelist[];

				const embed = new EmbedBuilder()
					.setTitle(`Operators for ${serverName}`)
					.setColor(EMBED_COLORS.INFO)
					.setDescription("No operators found.");

				if (ops.length > 0) {
					embed.setDescription(
						ops.map((op) => `- ${op.name} (Level: ${op.level})`).join("\n"),
					);
				}

				await interaction.editReply({ embeds: [embed] });
				break;
			}
			case SUBCOMMANDS.ADD: {
				if (!userId) {
					await interaction.editReply({
						embeds: [
							createErrorEmbed("User ID is required to add an operator."),
						],
					});
					return;
				}

				const { output, errorOutput } = await execCommands(container, [
					"rcon-cli",
					"op",
					userId,
				]);

				await interaction.editReply(`${output}, ${errorOutput}`);
				break;
			}
			case SUBCOMMANDS.REMOVE: {
				if (!userId) {
					await interaction.editReply({
						embeds: [
							createErrorEmbed("User ID is required to remove an operator."),
						],
					});
					return;
				}

				const { output, errorOutput } = await execCommands(container, [
					"rcon-cli",
					"deop",
					userId,
				]);

				await interaction.editReply(`${output}, ${errorOutput}`);
				break;
			}
			default:
				await interaction.editReply("Unknown subcommand.");
		}
	},
};
