const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletefarm')
    .setDescription('Deletes your farm. This action is permanent!'),
  async execute(interaction) {
    try {
      const { rows } = await db.query('SELECT * FROM users WHERE discord_id = $1', [interaction.user.id]);

      if (rows.length === 0) {
        return interaction.reply({ 
          content: "You don't have a farm to delete.", 
          flags: MessageFlags.Ephemeral 
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_delete')
          .setLabel('✅ Confirm')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('cancel_delete')
          .setLabel('❌ Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      const message = await interaction.reply({
        content: '⚠️ Are you **sure** you want to permanently delete your farm? This cannot be undone.',
        components: [row],
        flags: MessageFlags.Ephemeral
      });

      const filter = i =>
        i.user.id === interaction.user.id &&
        ['confirm_delete', 'cancel_delete'].includes(i.customId);

      const collector = message.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button,
        time: 15000 // 15 seconds
      });

      collector.on('collect', async i => {
        if (i.customId === 'confirm_delete') {
          await db.query('DELETE FROM users WHERE discord_id = $1', [interaction.user.id]);
          await i.update({
            content: '🪦 Your farm has been permanently deleted.',
            components: []
          });
        } else {
          await i.update({
            content: 'Farm deletion canceled.',
            components: []
          });
        }
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          await interaction.editReply({
            content: '⏳ Farm deletion timed out.',
            components: []
          });
        }
      });
    } catch (error) {
      console.error('Error executing deleteFarm command:', error);
      interaction.reply({ 
        content: 'There was an error deleting your farm. Please try again later.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  },
};
