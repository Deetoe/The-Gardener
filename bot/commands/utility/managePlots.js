const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('manageplots')
    .setDescription('Manage your farm plots - buy or upgrade them!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    console.log(`ManagePlots command initiated by user ${userId}`);

    try {
      // Get user and their plots
      const userRes = await db.query('SELECT * FROM users WHERE discord_id = $1', [userId]);
      if (userRes.rows.length === 0) {
        return interaction.reply({ 
          content: 'You need to start a farm first using `/startfarm`.',
          flags: MessageFlags.Ephemeral 
        });
      }

      const user = userRes.rows[0];
      console.log(`User found: ID=${user.id}, coins=${user.coins}`);
      
      const plotsRes = await db.query('SELECT * FROM plots WHERE user_id = $1', [user.id]);
      const plots = plotsRes.rows;
      console.log(`Found ${plots.length} plots for user`);

      // Group plots by their type
      const plotsByType = {};
      plots.forEach(plot => {
        if (!plotsByType[plot.plot_type]) {
          plotsByType[plot.plot_type] = [];
        }
        plotsByType[plot.plot_type].push(plot);
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('buy_plot')
          .setLabel('➕ Buy Plot')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('upgrade_plot')
          .setLabel('🔧 Upgrade Plot')
          .setStyle(ButtonStyle.Primary)
      );

      // Create a summary of the user's plots
      let plotSummary = '';
      if (Object.keys(plotsByType).length === 0) {
        plotSummary = "You don't have any plots yet.";
      } else {
        for (const [type, plotsOfType] of Object.entries(plotsByType)) {
          if (type === 'empty') continue;
          const emoji = getCropEmoji(type);
          const totalCapacity = plotsOfType.reduce((sum, plot) => sum + plot.capacity, 0);
          const highestLevel = Math.max(...plotsOfType.map(plot => plot.level));
          plotSummary += `${emoji} **${type.charAt(0).toUpperCase() + type.slice(1)} Plot**: Level ${highestLevel}, Capacity: ${totalCapacity}\n`;
        }
        
        const emptyPlots = plotsByType['empty'] || [];
        if (emptyPlots.length > 0) {
          plotSummary += `🟫 **Empty Plots**: ${emptyPlots.length}\n`;
        }
      }

      await interaction.reply({
        content: `**Your Farm Plots**\n${plotSummary}\n\nWhat would you like to do?`,
        components: [row],
        flags: MessageFlags.Ephemeral
      });

      const msg = await interaction.fetchReply();
      console.log(`Initial managePlots reply sent, waiting for button click`);

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
      });

      collector.on('collect', async i => {
        console.log(`Button clicked: ${i.customId} by user ${i.user.id}`);
        
        if (i.user.id !== userId) return i.reply({ content: "This isn't your menu!", flags: MessageFlags.Ephemeral });

        if (i.customId === 'buy_plot') {
          console.log(`Buy plot button clicked, showing crop type selection`);
          // Show crop type selection when buying a new plot
          const cropSelectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_crop_type')
              .setPlaceholder('Select a crop type for your new plot')
              .addOptions([
                { label: 'Wheat Plot', value: 'wheat', emoji: '🌾', description: 'Fast growing, low yield' },
                { label: 'Corn Plot', value: 'corn', emoji: '🌽', description: 'Medium growing, medium yield' },
                { label: 'Carrot Plot', value: 'carrot', emoji: '🥕', description: 'Slow growing, high yield' }
              ])
          );

          await i.reply({ 
            content: 'What type of specialized plot would you like to buy?', 
            components: [cropSelectMenu], 
            flags: MessageFlags.Ephemeral 
          });
          
          console.log('Crop type selection menu sent');
        }

        if (i.customId === 'upgrade_plot') {
          console.log(`Upgrade plot button clicked`);
          
          if (plots.length === 0) {
            return i.reply({ content: "You don't have any plots to upgrade!", flags: MessageFlags.Ephemeral });
          }

          // Create select menu with plots grouped by type
          const plotOptions = [];
          
          // Group plots by type for better organization
          for (const [type, plotsOfType] of Object.entries(plotsByType)) {
            if (plotsOfType.length === 0) continue;
            
            // Sort plots by their ID (creation order)
            plotsOfType.sort((a, b) => a.id - b.id);
            
            // Add each plot with its index within its type
            plotsOfType.forEach((plot, index) => {
              const plotIndex = index + 1; // Start indices at 1
              const emoji = getCropEmoji(plot.plot_type);
              const plotType = plot.plot_type === 'empty' ? 'Empty' : 
                              plot.plot_type.charAt(0).toUpperCase() + plot.plot_type.slice(1);
              
              plotOptions.push({
                label: `${plotType} ${plotIndex} (Level ${plot.level}, Capacity ${plot.capacity})`,
                value: plot.id.toString(), // Still need the ID internally
                emoji: emoji,
                description: `Upgrade cost: ${plot.level * 50} coins`
              });
            });
          }
          
          console.log(`Created ${plotOptions.length} plot upgrade options`);
          
          const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('select_plot')
              .setPlaceholder('Select a plot to upgrade')
              .addOptions(plotOptions)
          );

          await i.reply({ 
            content: 'Choose a plot to upgrade:',
            components: [selectMenu],
            flags: MessageFlags.Ephemeral 
          });
          
          console.log('Plot upgrade selection menu sent');
        }
      });

      // Optional: handle timeouts
      collector.on('end', async collected => {
        console.log(`Menu collector ended, ${collected.size} interactions collected`);
        await interaction.editReply({ components: [] }).catch(() => {
          console.log('Could not edit reply, likely already expired or deleted');
        });
      });
    } catch (err) {
      console.error('Error in /manageplots:', err);
      interaction.reply({ content: 'Something went wrong while managing your plots.', flags: MessageFlags.Ephemeral });
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