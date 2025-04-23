const { SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plant')
    .setDescription('Plant crops on your specialized plots!'),

  async execute(interaction) {
    try {
      const discordId = interaction.user.id;
      
      // Get user data
      const { rows: userRows } = await db.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
      
      if (userRows.length === 0) {
        return interaction.reply({ 
          content: 'You need to start a farm first using `/startfarm`!',
          flags: MessageFlags.Ephemeral
        });
      }

      const user = userRows[0];
      
      // Get all user's plots that are not empty type and have available capacity
      const { rows: plotRows } = await db.query(
        'SELECT * FROM plots WHERE user_id = $1 AND plot_type != $2 AND current_crops < capacity',
        [user.id, 'empty']
      );
      
      if (plotRows.length === 0) {
        return interaction.reply({ 
          content: 'You don\'t have any plots with available capacity. Use `/manageplots` to buy or upgrade plots!',
          flags: MessageFlags.Ephemeral
        });
      }

      // Create options for plot selection menu
      const plotOptions = plotRows.map(plot => {
        const emoji = getCropEmoji(plot.plot_type);
        const capacityText = plot.current_crops < plot.capacity 
          ? `${plot.current_crops}/${plot.capacity} planted` 
          : `FULL`;
        
        return {
          label: `${plot.plot_type.charAt(0).toUpperCase() + plot.plot_type.slice(1)} Plot #${plot.id}`,
          value: plot.id.toString(),
          emoji: emoji,
          description: `Level ${plot.level}, ${capacityText}`
        };
      });
      
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('select_plot_to_plant')
          .setPlaceholder('Select a plot to plant crops')
          .addOptions(plotOptions)
      );
      
      // Send the selection menu to the user
      await interaction.reply({
        content: '🌱 Which plot would you like to plant crops in?',
        components: [row],
        flags: MessageFlags.Ephemeral
      });
      
    } catch (error) {
      console.error('Error in plant command:', error);
      return interaction.reply({ 
        content: 'There was an error while trying to plant your crop. Please try again later.',
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
