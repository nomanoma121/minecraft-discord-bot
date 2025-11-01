import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
import { queries as q } from "../db/queries";

export const stop = {
  name: "stop",
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops a running Minecraft server")
    .addStringOption((option) =>
      option
        .setName("server-name")
        .setDescription("Name of the server to stop")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const serverName = interaction.options.getString("server-name")!;

    await interaction.reply(`⌛ Checking server "${serverName}"...`);

    try {
      const server = await q.getServerByName(serverName);
      if (!server) {
        await interaction.editReply({ embeds: [createErrorEmbed(`No server found with the name "${serverName}".`)] });
        return;
      }

      const container = docker.getContainer(server.id);
      let containerInfo;

      try {
        containerInfo = await container.inspect();
      } catch (error) {
        await interaction.editReply({ embeds: [createErrorEmbed(`Server "${serverName}" not found. The server may have been deleted.`)] });
        return;
      }

      const isRunning = containerInfo.State.Running;
      if (!isRunning) {
        await interaction.editReply({ embeds: [createErrorEmbed(`Server "${serverName}" is already stopped.`)] });
        return;
      }

      await interaction.editReply(
        `✅ Check server "${serverName}"\n` +
        `⌛ Stopping Minecraft Server...`
      );

      await container.stop();
      console.log(`Minecraft server "${serverName}" stopped.`);

      await interaction.editReply(
        `✅ Check server "${serverName}"\n` +
        `✅ Stop Minecraft Server\n\n`
      );

      const embed = new EmbedBuilder()
        .setTitle(`Minecraft Server "${serverName}" Stopped`)
        .setColor(0xFF0000)
        .setDescription(`The Minecraft server "${serverName}" has been stopped successfully.`)
        .addFields(
          { name: "Server Name", value: server.name, inline: true },
          { name: "Version", value: server.version, inline: true },
          { name: "Owner", value: `<@${server.ownerId}>`, inline: true },
        )
        .setFooter({ text: "Use /start to start your server again." });

      await interaction.followUp({ embeds: [embed] });

    } catch (error) {
      console.error("Error stopping the Minecraft server:", error);
      await interaction.editReply({ embeds: [createErrorEmbed("An error occurred while stopping the Minecraft server. Please try again later.")] });
    }
  },
};
