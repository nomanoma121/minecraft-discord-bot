import {
	AttachmentBuilder,
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import sharp from "sharp";
import { Config } from "../config";
import {
	AUTOCOMPLETE_MAX_CHOICES,
	DIFFICULTY,
	GAMEMODE,
	SERVER_DEFAULT_ICON_URL,
} from "../constants";
import {
	docker,
	filterLabelBuilder,
	labelBuilder,
	parseLabels,
} from "../lib/docker";
import {
	createErrorEmbed,
	createInfoEmbed,
	createServerInfoEmbed,
} from "../lib/embed";
import { mutex } from "../lib/mutex";
import type { Difficulty, Gamemode, Server } from "../types/server";
import { getAllServers, saveIconImage } from "../utils";

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
		)
		.addStringOption((option) =>
			option
				.setName("version")
				.setDescription("Minecraft version")
				.setRequired(false),
		)
		.addAttachmentOption((option) =>
			option
				.setName("icon")
				.setDescription("Icon image for the server (PNG format, will be automatically resized to 64x64 pixels)")
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
		await interaction.deferReply();

		const serverName = interaction.options.getString("server-name");
		if (!serverName) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Server name is required.")],
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
		const version = interaction.options.getString("version");
		const iconAttachment = interaction.options.getAttachment("icon");

		if (
			!description &&
			!maxPlayers &&
			!gamemode &&
			!difficulty &&
			!version &&
			!iconAttachment
		) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(
						"Please provide at least one field to update (description, max-players, gamemode, or difficulty).",
					),
				],
			});
			return;
		}

		if (maxPlayers && (maxPlayers < 1 || maxPlayers > 100)) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Max players must be between 1 and 100.")],
			});
			return;
		}

		if (iconAttachment && !iconAttachment.contentType?.includes("image/png")) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Server icon must be a PNG image.")],
			});
			return;
		}

		const release = await mutex.acquire();

		try {
			const containers = await docker.listContainers({
				all: true,
				filters: {
					label: filterLabelBuilder({ managed: true, name: serverName }),
				},
			});
			const container = containers[0];
			if (!container) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(`No server found with the name **${serverName}**.`),
					],
				});
				return;
			}

			const server = parseLabels(container.Labels);
			if (server.ownerId !== interaction.user.id) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							"You don't have permission to edit this server. Only the owner can edit it.",
						),
					],
				});
				return;
			}

			const updatedServer: Server = { ...server, updatedAt: new Date() };

			let serverIconAttachment: AttachmentBuilder | undefined;
			if (iconAttachment) {
				const response = await fetch(iconAttachment.url);
				const imageBuffer = Buffer.from(await response.arrayBuffer());
				const resizedImageBuffer = await sharp(imageBuffer)
					.resize(64, 64)
					.png()
					.toBuffer();
				serverIconAttachment = new AttachmentBuilder(resizedImageBuffer, {
					name: `${server.id}.png`,
				});
				updatedServer.iconPath = await saveIconImage(
					server.id,
					resizedImageBuffer,
				);
			}

			if (container.State === "running") {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							`Server **${serverName}** is currently running. Please stop the server before editing its configuration.`,
						),
					],
				});
				return;
			}

			await interaction.editReply("⌛ Updating the server...");

			if (description) updatedServer.description = description;
			if (maxPlayers) updatedServer.maxPlayers = String(maxPlayers);
			if (gamemode) updatedServer.gamemode = gamemode;
			if (difficulty) updatedServer.difficulty = difficulty;
			if (version) updatedServer.version = version;

			const containerInstance = docker.getContainer(container.Id);
			await containerInstance.remove({ v: false });

			await docker.createContainer({
				name: updatedServer.id,
				Image: container.Image,
				Labels: labelBuilder({
					managed: true,
					...server,
					...updatedServer,
				}),
				Env: [
					"EULA=TRUE",
					`SERVER_NAME=${updatedServer.name}`,
					`MOTD=${updatedServer.description}`,
					`VERSION=${updatedServer.version}`,
					`GAMEMODE=${updatedServer.gamemode}`,
					`DIFFICULTY=${updatedServer.difficulty}`,
					`MAX_PLAYERS=${updatedServer.maxPlayers}`,
					`ICON=${updatedServer.iconPath || SERVER_DEFAULT_ICON_URL}`,
					`TYPE=${server.type}`, // type is not editable
				],
				HostConfig: {
					PortBindings: {
						[`${Config.port}/tcp`]: [{ HostPort: Config.port.toString() }],
					},
					Binds: [`${server.id}:/data`],
				},
				ExposedPorts: {
					[`${Config.port}/tcp`]: {},
				},
			});

			await interaction.editReply({
				content: `✅ Server **${serverName}** Updated Successfully!`,
				embeds: [
					createServerInfoEmbed(updatedServer, {
						attachment: serverIconAttachment,
					}),
				],
				files: serverIconAttachment ? [serverIconAttachment] : [],
			});
		} catch (error) {
			console.error("Error editing server:", error);
			await interaction.editReply({
				content: "",
				embeds: [
					createErrorEmbed(
						"An error occurred while updating the server. Please try again later.",
					),
				],
			});
		} finally {
			release();
		}
	},
};
