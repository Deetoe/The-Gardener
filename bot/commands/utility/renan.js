const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	cooldown: 3,
	data: new SlashCommandBuilder()
		.setName('renan')
		.setDescription('Summon the god almighty!'),
	async execute(interaction) {
		const renanId = '475487320590778370'; 
		await interaction.reply(`Renan check <@${renanId}> 👀`);
	},
};