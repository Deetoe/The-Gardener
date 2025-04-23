const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('viewfarm')
    .setDescription('View your farm status, plots, and crops!'),

  async execute(interaction) {
    try {
      const userId = interaction.user.id;

      const userRes = await db.query('SELECT * FROM users WHERE discord_id = $1', [userId]);
      if (userRes.rows.length === 0) {
        return interaction.reply({ 
          content: 'You need to start a farm first using `/startfarm`.',
          flags: MessageFlags.Ephemeral 
        });
      }

      const user = userRes.rows[0];
      const plotsRes = await db.query('SELECT * FROM plots WHERE user_id = $1 ORDER BY plot_type, id', [user.id]);
      const plots = plotsRes.rows;

      const cropEmojis = {
        'wheat': '🌾',
        'corn': '🌽',
        'carrot': '🥕',
        'empty': '🟫'
      };

      let farmInfo = `🏷️ **${user.farm_name || 'Unnamed Farm'}**\n`;
      farmInfo += `💰 Coins: ${user.coins}\n`;
      farmInfo += `🪴 Total Plots: ${plots.length}\n\n`;

      if (plots.length === 0) {
        farmInfo += 'You do not have any plots yet. Use `/manageplots` to buy one!';
      } else {
        // Group plots by type
        const plotsByType = {};
        plots.forEach(plot => {
          if (!plotsByType[plot.plot_type]) {
            plotsByType[plot.plot_type] = [];
          }
          plotsByType[plot.plot_type].push(plot);
        });

        const now = new Date();
        farmInfo += '**Your Specialized Plots:**\n';

        // Display all non-empty plots first
        for (const [type, plotsOfType] of Object.entries(plotsByType)) {
          if (type === 'empty') continue;
          
          const emoji = cropEmojis[type] || '🌱';
          farmInfo += `${emoji} **${type.charAt(0).toUpperCase() + type.slice(1)} Plots (${plotsOfType.length})**:\n`;
          
          // Sort plots by their ID (which is usually creation order)
          plotsOfType.sort((a, b) => a.id - b.id);
          
          // Assign plot indices within each type
          plotsOfType.forEach((plot, index) => {
            const plotIndex = index + 1; // Start indices at 1
            const plotStatus = `Level ${plot.level}, Capacity ${plot.capacity}`;
            
            if (plot.current_crops > 0 && plot.harvest_time) {
              // Has crops growing
              const harvestTime = new Date(plot.harvest_time);
              const remainingMs = harvestTime - now;
              
              if (remainingMs <= 0) {
                // Ready to harvest
                farmInfo += `  • ${type.charAt(0).toUpperCase() + type.slice(1)} ${plotIndex} (${plotStatus}): ✅ **${plot.current_crops}× ${type} ready to harvest!**\n`;
              } else {
                // Still growing
                const minutes = Math.floor(remainingMs / 60000);
                const seconds = Math.floor((remainingMs % 60000) / 1000);
                
                // Calculate progress bar
                const plantedAt = new Date(plot.planted_at);
                const totalGrowthTime = harvestTime - plantedAt;
                const elapsedTime = now - plantedAt;
                const progress = Math.min(Math.max(elapsedTime / totalGrowthTime, 0), 1);
                const progressBlocks = Math.floor(progress * 10);
                const progressBar = '▰'.repeat(progressBlocks) + '▱'.repeat(10 - progressBlocks);
                
                farmInfo += `  • ${type.charAt(0).toUpperCase() + type.slice(1)} ${plotIndex} (${plotStatus}): ${plot.current_crops}/${plot.capacity} planted - Ready in ${minutes}m ${seconds}s\n`;
                farmInfo += `    [${progressBar}] ${Math.floor(progress * 100)}%\n`;
              }
            } else {
              // Empty plot (no crops)
              farmInfo += `  • ${type.charAt(0).toUpperCase() + type.slice(1)} ${plotIndex} (${plotStatus}): Empty and ready for planting\n`;
            }
          });
          
          farmInfo += '\n';
        }
        
        // Show empty plots if any
        const emptyPlots = plotsByType['empty'] || [];
        if (emptyPlots.length > 0) {
          farmInfo += `🟫 **Empty Plots (${emptyPlots.length})**: `;
          emptyPlots.forEach((plot, index) => {
            const plotIndex = index + 1;
            farmInfo += `Empty ${plotIndex}${index < emptyPlots.length - 1 ? ', ' : ''}`;
          });
          farmInfo += '\n';
        }
      }

      interaction.reply({
        content: farmInfo,
        // Not using ephemeral as farm status is meant to be public
      });
    } catch (err) {
      console.error('Error in /viewfarm:', err);
      interaction.reply({ 
        content: 'Something went wrong while fetching your farm.', 
        flags: MessageFlags.Ephemeral 
      });
    }
  },
};
