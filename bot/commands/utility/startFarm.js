const { CommandInteraction, SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startfarm')
    .setDescription('Start your farm and begin your adventure!')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('Name your farm')
        .setRequired(true)
    ),
  async execute(interaction) {
    try {
      const farmName = interaction.options.getString('name');

      // Check if user already exists
      const { rows } = await db.query('SELECT * FROM users WHERE discord_id = $1', [interaction.user.id]);

      if (rows.length === 0) {
        // Insert new user with named farm and RETURN the new user ID
        const startingCoins = 500; // Increased coins since they need to buy their first plot
        const newUserResult = await db.query(
          'INSERT INTO users (discord_id, coins, farm_name) VALUES ($1, $2, $3) RETURNING id',
          [interaction.user.id, startingCoins, farmName]
        );

        // No longer creating an initial plot - users must buy one

        return interaction.reply(`Welcome to **${farmName}**! 🌱 Your farm has been created with ${startingCoins} coins.

What's next:
1. Use \`/manageplots\` to buy your first plot
2. Use \`/plant\` to plant crops in your plot
3. Use \`/viewfarm\` to check your farm's status`);
      }

      // If user already exists, show their status
      const user = rows[0];
      const coins = user.coins;

      // Check their plots
      const plotsRes = await db.query('SELECT * FROM plots WHERE user_id = $1', [user.id]);
      const plotCount = plotsRes.rows.length;

      interaction.reply(`You already have a farm called **${user.farm_name || 'Unnamed Farm'}**.\nYou have ${coins} coins and ${plotCount} plots.`);
    } catch (error) {
      console.error('Error executing startFarm command:', error);
      interaction.reply('There was an error starting your farm. Please try again later.');
    }
  },
};
