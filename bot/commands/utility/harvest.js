const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('harvest')
    .setDescription('Harvest your crops!')
    .addBooleanOption(option =>
      option
        .setName('all')
        .setDescription('Harvest all ready crops at once')
    ),

  async execute(interaction) {
    try {
      const discordId = interaction.user.id;
      const harvestAll = interaction.options.getBoolean('all') || false;

      // Get user data
      const { rows: userRows } = await db.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
      if (userRows.length === 0) {
        return interaction.reply({ 
          content: 'You need to start your farm first by using `/startfarm`!',
          flags: MessageFlags.Ephemeral
        });
      }

      const user = userRows[0];
      const currentTime = new Date();

      // Get user's plots with planted crops
      const { rows: plotRows } = await db.query(
        'SELECT * FROM plots WHERE user_id = $1 AND current_crops > 0',
        [user.id]
      );

      if (plotRows.length === 0) {
        return interaction.reply({ 
          content: 'You don\'t have any crops planted. Plant one using `/plant`!',
          flags: MessageFlags.Ephemeral
        });
      }

      // Filter plots that are ready for harvest
      const readyPlots = plotRows.filter(plot => {
        if (!plot.harvest_time) return false;
        return currentTime >= new Date(plot.harvest_time);
      });

      if (readyPlots.length === 0) {
        // Show progress of growing crops
        const growingInfo = plotRows.map(plot => {
          const harvestTime = new Date(plot.harvest_time);
          const remainingMs = harvestTime - currentTime;
          const minutes = Math.floor(remainingMs / 60000);
          const seconds = Math.floor((remainingMs % 60000) / 1000);
          const emoji = getCropEmoji(plot.plot_type);
          
          return `${emoji} **${plot.plot_type.charAt(0).toUpperCase() + plot.plot_type.slice(1)} Plot #${plot.id}**: ⏳ Ready in ${minutes}m ${seconds}s (${plot.current_crops}/${plot.capacity} planted)`;
        }).join('\n');

        return interaction.reply({
          content: `❌ None of your crops are ready to harvest yet!\n\n${growingInfo}`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (harvestAll) {
        // Harvest all ready crops
        await db.query('BEGIN');
        try {
          let totalEarned = 0;
          let harvestSummary = '';

          for (const plot of readyPlots) {
            // Calculate earnings based on crop type and number of crops
            const cropValues = {
              'wheat': 8,
              'corn': 18,
              'carrot': 30
            };
            const valuePerCrop = cropValues[plot.plot_type] || 10;
            const plotEarnings = plot.current_crops * valuePerCrop;
            totalEarned += plotEarnings;

            const emoji = getCropEmoji(plot.plot_type);
            harvestSummary += `${emoji} **${plot.plot_type.charAt(0).toUpperCase() + plot.plot_type.slice(1)} Plot #${plot.id}**: Harvested ${plot.current_crops}× ${plot.plot_type} for ${plotEarnings} coins\n`;
            
            // Reset plot
            await db.query(
              'UPDATE plots SET current_crops = 0, planted_at = NULL, harvest_time = NULL WHERE id = $1',
              [plot.id]
            );
          }

          // Add coins to user
          await db.query(
            'UPDATE users SET coins = coins + $1 WHERE id = $2',
            [totalEarned, user.id]
          );

          await db.query('COMMIT');

          return interaction.reply({
            content: `🌾 **Harvest Complete!**\nYou earned a total of ${totalEarned} coins!\n\n${harvestSummary}`,
          });
        } catch (error) {
          await db.query('ROLLBACK');
          console.error('Error during harvest all:', error);
          return interaction.reply({
            content: 'There was an error harvesting your crops. Please try again later.',
            flags: MessageFlags.Ephemeral
          });
        }
      } else {
        // Show menu to choose which plot to harvest
        const plotOptions = readyPlots.map(plot => {
          const emoji = getCropEmoji(plot.plot_type);
          const cropType = plot.plot_type.charAt(0).toUpperCase() + plot.plot_type.slice(1);
          
          // Calculate earnings
          const cropValues = {
            'wheat': 8,
            'corn': 18,
            'carrot': 30
          };
          const valuePerCrop = cropValues[plot.plot_type] || 10;
          const plotEarnings = plot.current_crops * valuePerCrop;
          
          return {
            label: `${cropType} Plot #${plot.id}`,
            value: plot.id.toString(),
            emoji: emoji,
            description: `Harvest ${plot.current_crops}× crops for ${plotEarnings} coins`
          };
        });

        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('select_plot_to_harvest')
            .setPlaceholder('Select a plot to harvest')
            .addOptions(plotOptions)
        );

        return interaction.reply({
          content: '🌾 Which plot would you like to harvest?',
          components: [row],
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (err) {
      console.error('Error in /harvest:', err);
      interaction.reply({ 
        content: 'Something went wrong while harvesting your crops.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  },
};

// Helper function to get emoji for crop type
function getCropEmoji(cropType) {
  const emojis = {
    'wheat': '🌾',
    'corn': '🌽',
    'carrot': '🥕',
    'empty': '🟫'
  };
  return emojis[cropType] || '🌱';
}
