import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { docker } from "../lib/docker";
import { queries as q } from "../db/queries";

export const start = {
  name: "start",
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Starts an existing Minecraft server")
    .addStringOption((option) =>
      option
        .setName("server-name")
        .setDescription("Name of the server to start")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const serverName = interaction.options.getString("server-name")!;

    await interaction.reply(`⌛ Checking server "${serverName}"...`);

    try {
      const server = await q.getServerByName(serverName);
      if (!server) {
        await interaction.editReply(`❌ Server "${serverName}" not found. Use /create to create a new server.`);
        return;
      }

      const runningContainers = await docker.listContainers({ all: false });
      if (runningContainers.length > 0) {
        const runningNames = runningContainers.map(c => c.Names?.[0]?.replace(/^\//, '')).join(', ');
        await interaction.editReply(`L Another server is already running: ${runningNames}\nPlease stop it first with /stop`);
        return;
      }

      await interaction.editReply(
        `✅ Check server "${serverName}"\n` +
        `⌛ Starting Minecraft Server...`
      );

      const container = docker.getContainer(serverName);

      try {
        await container.inspect();
      } catch (error) {
        await interaction.editReply(`❌ Container "${serverName}" not found. The server may have been deleted.`);
        return;
      }

      await container.start();
      console.log(`Minecraft server "${serverName}" started.`);

      await interaction.editReply(
        `✅ Check server "${serverName}"\n` +
        `✅ Start Minecraft Server\n\n` +
        `Server Name: ${server.name}\n` +
        `Version: ${server.version}\n` +
        `Gamemode: ${server.gamemode}\n` +
        `Difficulty: ${server.difficulty}\n` +
        `Port: 25565`
      );

    } catch (error) {
      console.error("Error starting the Minecraft server:", error);
      await interaction.editReply("❌ Failed to start the Minecraft server.");
    }
  },
};
