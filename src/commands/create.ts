import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { GAMEMODE, DIFFICULTY, SERVER_TYPE } from "../constants";
import { docker } from "../lib/docker";
import { Config } from "../config"
import { queries as q } from "../db/queries";
import type { Difficulty, Gamemode, ServerConfig, ServerType } from "../types/type";
import { createErrorEmbed } from "../lib/embed";

export const create = {
  name: "create",
  data: new SlashCommandBuilder()
    .setName("create")
    .setDescription("Creates a new Minecraft server")
    .addStringOption((option) =>
      option
        .setName("server-name")
        .setDescription("Name of the Minecraft server. Must be unique.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("Description of the Minecraft server.")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("gamemode")
        .setDescription("Game mode (survival, creative, adventure, spectator) (default: survival)")
        .setChoices(
          { name: "survival", value: GAMEMODE.SURVIVAL },
          { name: "creative", value: GAMEMODE.CREATIVE },
          { name: "adventure", value: GAMEMODE.ADVENTURE },
          { name: "spectator", value: GAMEMODE.SPECTATOR }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("version")
        .setDescription("Minecraft version to use (default: latest)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("difficulty")
        .setDescription("Difficulty level (peaceful, easy, normal, hard) (default: normal)")
        .setChoices(
          { name: "peaceful", value: DIFFICULTY.PEACEFUL },
          { name: "easy", value: DIFFICULTY.EASY },
          { name: "normal", value: DIFFICULTY.NORMAL },
          { name: "hard", value: DIFFICULTY.HARD }
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("server-type")
        .setDescription("Type of Minecraft server (default: paper)")
        .setChoices({ name: "paper", value: SERVER_TYPE.PAPER })
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("max-players")
        .setDescription("Maximum number of players (default: 20)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply("⏳ Creating Minecraft Server...");

    const serverConfig = {
      name: interaction.options.getString("server-name")!,
      version: interaction.options.getString("version") ?? "latest",
      maxPlayers: 20,
      difficulty: (interaction.options.getString("difficulty") ?? DIFFICULTY.NORMAL) as Difficulty,
      type: (interaction.options.getString("server-type") ?? SERVER_TYPE.PAPER) as ServerType,
      gamemode: (interaction.options.getString("gamemode") ?? GAMEMODE.SURVIVAL) as Gamemode,
      description: interaction.options.getString("description") ?? "",
    };

    const existingServerCount = await q.getCurrentServerCount();
    if (existingServerCount >= Config.maxServerCount) {
      await interaction.editReply({ embeds: [createErrorEmbed("The maximum number of servers has been reached. Please try again later.")] });
      return;
    }
    const isNameAvailable = await q.isServerNameAvailable(serverConfig.name);
    if (!isNameAvailable) {
      await interaction.editReply({ embeds: [createErrorEmbed(`The server name "${serverConfig.name}" is already taken. Please choose a different name.`)] });
      return;
    }

    try {
      const server = await q.createServer(interaction.user.id, {
        name: serverConfig.name,
        version: serverConfig.version,
        maxPlayers: serverConfig.maxPlayers,
        difficulty: serverConfig.difficulty,
        type: serverConfig.type,
        gamemode: serverConfig.gamemode,
        description: serverConfig.description,
      });

      console.log("Minecraft server record created in the database:", server);

      await docker.createContainer({
        name: server.id,
        Image: "itzg/minecraft-server",
        Env: [
          "EULA=TRUE",
          `SERVER_NAME=${serverConfig.name}`,
          `MOTD=${serverConfig.description}`,
          `MINECRAFT_VERSION=${serverConfig.version}`,
          `GAMEMODE=${serverConfig.gamemode}`,
          `DIFFICULTY=${serverConfig.difficulty}`,
          `TYPE=${serverConfig.type}`,
        ],
        HostConfig: {
          PortBindings: {
            [Config.port + "/tcp"]: [{ HostPort: Config.port.toString() }],
          },
        },
        ExposedPorts: {
          [Config.port + "/tcp"]: {},
        },
      });
      console.log("Minecraft server container created.");

      const embed = new EmbedBuilder()
        .setTitle("Created Server Information")
        .setColor(0x00FF00)
        .addFields(
          { name: "Server Name", value: server.name, inline: true },
          { name: "Version", value: server.version, inline: true },
          { name: "Gamemode", value: server.gamemode, inline: true },
          { name: "Difficulty", value: server.difficulty, inline: true },
          { name: "Max Players", value: server.maxPlayers.toString(), inline: true },
          { name: "Description", value: server.description || "N/A", inline: false },
          { name: "Owner", value: `<@${server.ownerId}>`, inline: true },
        )
        .setFooter({ text: "Use /start to start your server." });
      await interaction.editReply("✅ Minecraft server created successfully!");
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error("Error starting the Minecraft server:", error);
      await interaction.editReply({ embeds: [createErrorEmbed("An error occurred while creating the Minecraft server. Please try again later.")] });
    }
  },
};
