const { SlashCommandBuilder } = require('@discordjs/builders');
const db = require('../../utils/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plant')
    .setDescription('Plant a crop on your farm!')
    .addStringOption(option =>
      option.setName('crop')
        .setDescription('The crop you want to plant')
        .setRequired(true)
        .addChoices(
          { name: 'Wheat', value: 'wheat' },
          { name: 'Carrot', value: 'carrot' },
          { name: 'Corn', value: 'corn' }
        )),
  async execute(interaction) {
    const crop = interaction.options.getString('crop');
    const discordId = interaction.user.id;

    // Get user data
    const { rows } = await db.query('SELECT * FROM users WHERE discord_id = $1', [discordId]);

    if (rows.length === 0) {
      await db.query('INSERT INTO users (discord_id, coins) VALUES ($1, $2)', [discordId, 0]);
      return interaction.reply('Welcome to your farm! You can now plant crops!');
    }

    // Check if user already has a planted crop
    const user = rows[0];
    if (user.planted_crop) {
      return interaction.reply(`You already have a crop planted: ${user.planted_crop}. Wait for it to grow or collect it!`);
    }

    // Plant the crop and record the time it was planted
    const currentTime = new Date();
    await db.query('UPDATE users SET planted_crop = $1, crop_start_time = $2 WHERE discord_id = $3', [crop, currentTime, discordId]);

    interaction.reply(`You have planted ${crop}! It will be ready to harvest soon.`);
  },
};