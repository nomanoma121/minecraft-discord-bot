import {
	Attachment,
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { Config } from "../config";
import {
	DEFAULT_MAX_PLAYERS,
	DIFFICULTY,
	GAMEMODE,
	SERVER_DEFAULT_ICON_URL,
	SERVER_TYPE,
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
import type { Difficulty, Gamemode, ServerType } from "../types/server";
import { saveIconImage } from "../utils";
import sharp from "sharp";
import type { Server } from "../types/server";

export const create = {
	name: "create",
	data: new SlashCommandBuilder()
		.setName("create")
		.setDescription("Creates a new Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the Minecraft server. Must be unique.")
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("version")
				.setDescription("Minecraft version to use")
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName("description")
				.setDescription("Description of the Minecraft server.")
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName("gamemode")
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
				.setName("difficulty")
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
				.setName("server-type")
				.setDescription("Type of Minecraft server (default: paper)")
				.setChoices({ name: "paper", value: SERVER_TYPE.PAPER })
				.setRequired(false),
		)
		.addIntegerOption((option) =>
			option
				.setName("max-players")
				.setDescription("Maximum number of players (default: 20)")
				.setRequired(false),
		)
		.addAttachmentOption((option) =>
			option
				.setName("icon")
				.setDescription("PNG image to use as the server icon"),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		const serverName = interaction.options.getString("server-name");
		if (!serverName) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Server name is required.")],
			});
			return;
		}

		const version = interaction.options.getString("version");
		if (!version) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Minecraft version is required.")],
			});
			return;
		}

		const iconAttachment = interaction.options.getAttachment("icon");
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
				interaction.options.getString("max-players") ||
				DEFAULT_MAX_PLAYERS.toString(),
			difficulty:
				(interaction.options.getString("difficulty") as Difficulty) ||
				DIFFICULTY.NORMAL,
			type:
				(interaction.options.getString("server-type") as ServerType) ||
				SERVER_TYPE.PAPER,
			gamemode:
				(interaction.options.getString("gamemode") as Gamemode) ||
				GAMEMODE.SURVIVAL,
			description:
				interaction.options.getString("description") || "A Minecraft server",
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
				serverIconAttachment = new AttachmentBuilder(resizedImageBuffer, { name: `${server.id}.png` });
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
				Image: "itzg/minecraft-server",
				Labels: labelBuilder({
					managed: true,
					...server,
				}),
				Env: [
					"EULA=TRUE",
					`SERVER_NAME=${server.name}`,
					`MOTD=${server.description}`,
					`VERSION=${server.version}`,
					`GAMEMODE=${server.gamemode}`,
					`DIFFICULTY=${server.difficulty}`,
					`MAX_PLAYERS=${server.maxPlayers}`,
					`ICON=${server.iconPath || SERVER_DEFAULT_ICON_URL}`,
					`TYPE=${server.type}`,
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
			console.log("Minecraft server container created.");

			const files = serverIconAttachment ? [serverIconAttachment] : [];

			await interaction.editReply({
				content: `✅ Server **${serverName}** Created Successfully!`,
				embeds: [createServerInfoEmbed(server, { attachment: serverIconAttachment })],
				files: files,
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
