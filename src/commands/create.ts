import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { GAMEMODE, DIFFICULTY, SERVER_TYPE } from "../constants";
import { docker } from "../lib/docker";
import { Config } from "../config"
import { queries as q } from "../db/queries";
import type { Difficulty, Gamemode, ServerConfig, ServerType } from "../types/type";

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
      await interaction.editReply(`❌ You have reached the maximum number of servers (${Config.maxServerCount}). Please delete an existing server or change bot config settings before creating a new one.`);
      return;
    }
    const isNameAvailable = await q.isServerNameAvailable(serverConfig.name);
    if (!isNameAvailable) {
      await interaction.editReply(`❌ The server name "${serverConfig.name}" is already taken. Please choose a different name.`);
      return;
    }

    try {
      await docker.createContainer({
        name: interaction.options.getString("server-name")!,
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

      await interaction.editReply("✅ Minecraft server created successfully!\n" +
        `Server Name: ${server.name}\n` +
        `Version: ${server.version}\n` +
        `Gamemode: ${server.gamemode}\n` +
        `Difficulty: ${server.difficulty}\n` +
        `Description: ${server.description}\n`
      );

    } catch (error) {
      console.error("Error starting the Minecraft server:", error);
      await interaction.editReply("❌ Failed to start the Minecraft server.");
    }
  },
};
