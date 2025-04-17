const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('harvest')
    .setDescription('Harvest your crops!'),
  
  async execute(interaction) {
    const discordId = interaction.user.id;

    // Get user data
    const { rows } = await db.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);

    if (rows.length === 0) {
      return interaction.reply('You need to start your farm first by using `/startfarm`!');
    }

    const user = rows[0];
    if (!user.planted_crop) {
      return interaction.reply('You don\'t have any crops planted. Plant one using `/plant`!');
    }

    // Calculate time passed since crop was planted
    const cropStartTime = new Date(user.crop_start_time); // Get the time the crop was planted
    const currentTime = new Date(); // Current time
    const timeDiff = currentTime - cropStartTime; // Time difference in milliseconds

    // Assume it takes 1 hour for a crop to grow (adjust as needed)
    const growthTime = 1000 * 60 * 60; // 1 hour in milliseconds

    if (timeDiff < growthTime) {
      // If the crop hasn't grown yet
      const remainingTime = growthTime - timeDiff; // Remaining time in milliseconds
      const minutesLeft = Math.ceil(remainingTime / (1000 * 60)); // Convert to minutes
      return interaction.reply(`Your crop is still growing! It will be ready in ${minutesLeft} minute(s).`);
    }

    // If the crop is ready to be harvested
    const crop = user.planted_crop;
    const coinsEarned = 10; // Coins earned from harvesting (adjust as needed)

    // Update user data: reset planted crop and add coins
    await db.query('UPDATE users SET planted_crop = NULL, crop_start_time = NULL, coins = coins + $1 WHERE discord_id = $2', [coinsEarned, discordId]);

    interaction.reply(`You harvested ${crop} and earned ${coinsEarned} coins!`);
  },
};