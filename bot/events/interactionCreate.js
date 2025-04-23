const { Events, Collection, MessageFlags } = require('discord.js');
const path = require('node:path');
const db = require(path.join(__dirname, '../utils/db'));

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    const client = interaction.client;

    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
      }
    }

    // Helper function to get plot index and display name
    async function getPlotDisplayInfo(plotId, userId) {
      const plotRes = await db.query('SELECT * FROM plots WHERE id = $1', [plotId]);
      if (plotRes.rows.length === 0) return null;

      const plot = plotRes.rows[0];

      const typePlotsRes = await db.query(
        'SELECT * FROM plots WHERE user_id = $1 AND plot_type = $2 ORDER BY id',
        [userId, plot.plot_type]
      );

      const plotIndex = typePlotsRes.rows.findIndex(p => p.id === plot.id) + 1;
      const plotType = plot.plot_type.charAt(0).toUpperCase() + plot.plot_type.slice(1);
      const displayName = `${plotType} ${plotIndex}`;

      return { plot, displayName, plotIndex };
    }

    // Handle selecting a crop type for new plot
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_crop_type') {
      try {
        const selectedCropType = interaction.values[0];
        const discordId = interaction.user.id;

        const userRes = await db.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
        if (userRes.rows.length === 0) {
          return interaction.reply({ content: "You need to create a farm first!", flags: MessageFlags.Ephemeral });
        }

        const user = userRes.rows[0];

        const plotCosts = {
          'wheat': 100,
          'corn': 150,
          'carrot': 200,
          'empty': 50
        };

        const cost = plotCosts[selectedCropType] || 100;

        if (user.coins < cost) {
          return interaction.reply({
            content: `You don't have enough coins to buy a ${selectedCropType} plot. You need ${cost} coins but only have ${user.coins}.`,
            flags: MessageFlags.Ephemeral
          });
        }

        await db.query('BEGIN');
        try {
          await db.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [cost, user.id]);

          await db.query(
            'INSERT INTO plots (user_id, plot_type, capacity, level, current_crops) VALUES ($1, $2, $3, $4, $5)',
            [user.id, selectedCropType, 1, 1, 0]
          );

          await db.query('COMMIT');

          const cropEmojis = {
            'wheat': '🌾',
            'corn': '🌽',
            'carrot': '🥕'
          };
          const emoji = cropEmojis[selectedCropType] || '🌱';
          const plotType = selectedCropType.charAt(0).toUpperCase() + selectedCropType.slice(1);

          await interaction.reply({
            content: `${emoji} You've purchased a **${plotType} Plot** for ${cost} coins!
This plot can grow ${selectedCropType} crops. It currently has a capacity of 1.
Use \`/plant\` to plant crops in your new plot.`,
            flags: MessageFlags.Ephemeral
          });
        } catch (error) {
          await db.query('ROLLBACK');
          console.error('Error creating plot:', error);
          await interaction.reply({ content: 'There was an error creating your plot.', flags: MessageFlags.Ephemeral });
        }
      } catch (error) {
        console.error('Error handling crop type selection:', error);
        await interaction.reply({ content: 'There was an error processing your selection.', flags: MessageFlags.Ephemeral });
      }
    }

    // Handle selecting a plot for planting
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_plot_to_plant') {
      try {
        const selectedPlotId = interaction.values[0];
        const discordId = interaction.user.id;

        const userRes = await db.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);
        if (userRes.rows.length === 0) {
          return interaction.reply({ content: "You need to create a farm first!", flags: MessageFlags.Ephemeral });
        }

        const user = userRes.rows[0];
        const plotInfo = await getPlotDisplayInfo(selectedPlotId, user.id);
        if (!plotInfo) {
          return interaction.reply({ content: "Invalid plot selection or you don't own that plot.", flags: MessageFlags.Ephemeral });
        }

        const { plot, displayName } = plotInfo;

        if (plot.current_crops >= plot.capacity) {
          return interaction.reply({
            content: `This plot is already at full capacity (${plot.current_crops}/${plot.capacity}). Upgrade it or use another plot.`,
            flags: MessageFlags.Ephemeral
          });
        }

        const cropCosts = {
          'wheat': 5,
          'corn': 10,
          'carrot': 15
        };
        const cost = cropCosts[plot.plot_type] || 5;

        if (user.coins < cost) {
          return interaction.reply({
            content: `You don't have enough coins to plant ${plot.plot_type}. You need ${cost} coins but only have ${user.coins}.`,
            flags: MessageFlags.Ephemeral
          });
        }

        const growthTimes = {
          'wheat': 1,
          'corn': 1,
          'carrot': 1
        };
        const growthTimeMinutes = growthTimes[plot.plot_type] || 10;

        const currentTime = new Date();
        const harvestTime = new Date(currentTime.getTime() + growthTimeMinutes * 60000);

        await db.query('BEGIN');
        try {
          await db.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [cost, user.id]);

          await db.query(
            'UPDATE plots SET current_crops = current_crops + 1, planted_at = $1, harvest_time = $2 WHERE id = $3',
            [currentTime, harvestTime, plot.id]
          );

          await db.query('COMMIT');

          const cropEmojis = {
            'wheat': '🌾',
            'corn': '🌽',
            'carrot': '🥕'
          };
          const emoji = cropEmojis[plot.plot_type] || '🌱';
          const readableHarvestTime = harvestTime.toLocaleTimeString();

          const expectedReturn = {
            'wheat': 8,
            'corn': 18,
            'carrot': 30
          };
          const returnAmount = expectedReturn[plot.plot_type] || cost * 1.5;
          const profit = returnAmount - cost;

          await interaction.reply({
            content: `${emoji} You've planted **${plot.plot_type}** in your ${displayName}!
• Plot status: ${plot.current_crops + 1}/${plot.capacity} planted
• Cost: ${cost} coins
• Ready at: ${readableHarvestTime} (in ${growthTimeMinutes} minutes)
• Expected return: ${returnAmount} coins (+${profit} profit)

Use \`/viewfarm\` to check on your crops or \`/harvest\` when they're ready.`,
            flags: MessageFlags.Ephemeral
          });
        } catch (error) {
          await db.query('ROLLBACK');
          console.error('Error planting crop:', error);
          await interaction.reply({ content: 'There was an error planting your crop.', flags: MessageFlags.Ephemeral });
        }
      } catch (error) {
        console.error('Error handling plot selection for planting:', error);
        await interaction.reply({ content: 'There was an error processing your selection.', flags: MessageFlags.Ephemeral });
      }
    }

  }
};
