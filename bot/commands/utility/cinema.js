const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cinema')
		.setDescription('Replies with Absolute Cinema!'),
	async execute(interaction) {
		await interaction.reply('Absolute Cinema!');
	},
};