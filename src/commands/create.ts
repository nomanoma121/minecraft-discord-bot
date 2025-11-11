import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import sharp from "sharp";
import { Config } from "../config";
import {
	DEFAULT_MAX_PLAYERS,
	DIFFICULTY,
	GAMEMODE,
	ICONS_VOLUME_NAME,
	LEVEL,
	MINECRAFT_SERVER_IMAGE,
	OPTIONS,
	SERVER_TYPE,
} from "../constants";
import {
	docker,
	filterLabelBuilder,
	labelBuilder,
	parseLabels,
	serverEnvBuilder,
} from "../lib/docker";
import {
	createErrorEmbed,
	createInfoEmbed,
	createServerInfoEmbed,
} from "../lib/embed";
import { mutex } from "../lib/mutex";
import type {
	Difficulty,
	Gamemode,
	Level,
	Server,
	ServerType,
} from "../types/server";
import { saveIconImage } from "../utils";

export const create = {
	name: "create",
	data: new SlashCommandBuilder()
		.setName("create")
		.setDescription("Creates a new Minecraft server")
		.addStringOption((option) =>
			option
				.setName(OPTIONS.SERVER_NAME)
				.setDescription("Name of the Minecraft server. Must be unique.")
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName(OPTIONS.VERSION)
				.setDescription("Minecraft version to use")
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName(OPTIONS.DESCRIPTION)
				.setDescription("Description of the Minecraft server.")
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName(OPTIONS.GAMEMODE)
				.setDescription(
					"Game mode (survival, creative, adventure, spectator) (default: survival)",
				)
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
				.setName(OPTIONS.DIFFICULTY)
				.setDescription(
					"Difficulty level (peaceful, easy, normal, hard) (default: normal)",
				)
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
				.setName(OPTIONS.SERVER_TYPE)
				.setDescription("Type of Minecraft server (default: paper)")
				.setChoices(
					{ name: "paper", value: SERVER_TYPE.PAPER },
					{ name: "vanilla", value: SERVER_TYPE.VANILLA },
					{ name: "forge", value: SERVER_TYPE.FORGE },
				)
				.setRequired(false),
		)
		.addIntegerOption((option) =>
			option
				.setName(OPTIONS.MAX_PLAYERS)
				.setDescription("Maximum number of players (default: 20)")
				.setRequired(false),
		)
		.addBooleanOption((option) =>
			option
				.setName(OPTIONS.ENABLE_WHITELIST)
				.setDescription("Enable the server whitelist (default: false)")
				.setRequired(false),
		)
		.addBooleanOption((option) =>
			option
				.setName(OPTIONS.HARDCORE)
				.setDescription("Enable hardcore mode (default: false)")
				.setRequired(false),
		)
		.addBooleanOption((option) =>
			option
				.setName(OPTIONS.PVP)
				.setDescription("Enable player versus player combat (default: true)")
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName(OPTIONS.LEVEL)
				.setDescription("World type (default: normal)")
				.setChoices(
					{ name: "normal", value: LEVEL.NORMAL },
					{ name: "flat", value: LEVEL.FLAT },
					{ name: "large_biomes", value: LEVEL.LARGE_BIOMES },
					{ name: "amplified", value: LEVEL.AMPLIFIED },
					{ name: "single_biome_surface", value: LEVEL.SINGLE_BIOME_SURFACE },
				)
				.setRequired(false),
		)
		.addAttachmentOption((option) =>
			option
				.setName(OPTIONS.ICON)
				.setDescription("PNG image to use as the server icon"),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		const serverName = interaction.options.getString(OPTIONS.SERVER_NAME);
		if (!serverName) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Server name is required.")],
			});
			return;
		}

		const version = interaction.options.getString(OPTIONS.VERSION);
		if (!version) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Minecraft version is required.")],
			});
			return;
		}

		const iconAttachment = interaction.options.getAttachment(OPTIONS.ICON);
		if (iconAttachment && !iconAttachment.contentType?.includes("image/png")) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Server icon must be a PNG image.")],
			});
			return;
		}

		const server: Server = {
			id: crypto.randomUUID(),
			ownerId: interaction.user.id,
			name: serverName,
			version: version,
			maxPlayers:
				interaction.options.getString(OPTIONS.MAX_PLAYERS) ||
				DEFAULT_MAX_PLAYERS.toString(),
			difficulty:
				(interaction.options.getString(OPTIONS.DIFFICULTY) as Difficulty) ||
				DIFFICULTY.NORMAL,
			type:
				(interaction.options.getString(OPTIONS.SERVER_TYPE) as ServerType) ||
				SERVER_TYPE.PAPER,
			gamemode:
				(interaction.options.getString(OPTIONS.GAMEMODE) as Gamemode) ||
				GAMEMODE.SURVIVAL,
			description:
				interaction.options.getString(OPTIONS.DESCRIPTION) ||
				"A Minecraft server",
			pvp: interaction.options.getBoolean(OPTIONS.PVP) || true,
			hardcore: interaction.options.getBoolean(OPTIONS.HARDCORE) || false,
			level:
				(interaction.options.getString(OPTIONS.LEVEL) as Level) || LEVEL.NORMAL,
			enableWhitelist:
				interaction.options.getBoolean(OPTIONS.ENABLE_WHITELIST) || false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		let serverIconAttachment: AttachmentBuilder | undefined;
		if (iconAttachment) {
			try {
				const response = await fetch(iconAttachment.url);
				const imageBuffer = Buffer.from(await response.arrayBuffer());
				const resizedImageBuffer = await sharp(imageBuffer)
					.resize(64, 64)
					.png()
					.toBuffer();
				serverIconAttachment = new AttachmentBuilder(resizedImageBuffer, {
					name: `${server.id}.png`,
				});
				server.iconPath = await saveIconImage(server.id, resizedImageBuffer);
			} catch (error) {
				console.error("Error saving server icon:", error);
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							"An error occurred while saving the server icon. Please try again.",
						),
					],
				});
				return;
			}
		}

		const release = await mutex.acquire();

		try {
			const containers = await docker.listContainers({
				all: true,
				filters: {
					label: filterLabelBuilder({ managed: true }),
				},
			});

			const existingServerCount = containers.length;
			if (existingServerCount >= Config.maxServerCount) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							"The maximum number of servers has been reached. Please try again later.",
						),
					],
				});
				return;
			}

			const isNameTaken = containers.some((container) => {
				const labels = parseLabels(container.Labels);
				return labels.name === server.name;
			});
			if (isNameTaken) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							`The server name **${server.name}** is already taken. Please choose a different name.`,
						),
					],
				});
				return;
			}

			if (Number(server.maxPlayers) < 1 || Number(server.maxPlayers) > 100) {
				await interaction.editReply({
					embeds: [createInfoEmbed("Max players must be between 1 and 100.")],
				});
				return;
			}

			await interaction.editReply("⌛ Creating the server...");

			await docker.createVolume({
				Name: server.id,
			});

			await docker.createContainer({
				name: server.id,
				Image: MINECRAFT_SERVER_IMAGE,
				Labels: labelBuilder({
					managed: true,
					...server,
				}),
				Env: serverEnvBuilder(server),
				HostConfig: {
					PortBindings: {
						[`${Config.port}/tcp`]: [{ HostPort: Config.port.toString() }],
					},
					Binds: [
						`${server.id}:/data`,
						`${ICONS_VOLUME_NAME}:/app/data/icons:ro`,
					],
				},
				ExposedPorts: {
					[`${Config.port}/tcp`]: {},
				},
			});
			console.log("Minecraft server container created.");

			await interaction.editReply({
				content: `✅ Server **${serverName}** Created Successfully!`,
				embeds: [
					createServerInfoEmbed(server, { attachment: serverIconAttachment }),
				],
				files: serverIconAttachment ? [serverIconAttachment] : [],
			});
		} catch (error) {
			console.error("Error starting the Minecraft server:", error);
			await interaction.editReply({
				content: "",
				embeds: [
					createErrorEmbed(
						"An error occurred while creating the Minecraft server. Please try again later.",
					),
				],
			});
		} finally {
			release();
		}
	},
};
