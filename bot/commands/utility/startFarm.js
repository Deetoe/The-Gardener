const { CommandInteraction, SlashCommandBuilder } = require('discord.js');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startfarm')
    .setDescription('Start your farm and begin your adventure!'),
  async execute(interaction) {
    try {
      // Query to check if the user exists
      const { rows } = await db.query('SELECT * FROM users WHERE discord_id = $1', [interaction.user.id]);

      // If the user doesn't exist, insert them into the database
      if (rows.length === 0) {
        await db.query(
          'INSERT INTO users (discord_id, coins) VALUES ($1, $2)',
          [interaction.user.id, 0] // Default to 0 coins
        );
        return interaction.reply('Welcome to your farm! You now have 0 coins.');
      }

      // User exists, fetch their data (e.g., planted crop, coins, etc.)
      const user = rows[0];
      const coins = user.coins;
      const plantedCrop = user.planted_crop || 'None'; // Fallback to "None" if no crop is planted
      const cropsCollected = user.crops_collected ? user.crops_collected : []; // Fallback to an empty array if no crops collected

      // Respond with the user's current status
      interaction.reply(`You have ${coins} coins. Your planted crop: ${plantedCrop}. Crops collected: ${cropsCollected.length}`);
    } catch (error) {
      console.error('Error executing startFarm command:', error);
      interaction.reply('There was an error starting your farm. Please try again later.');
    }
  },
};