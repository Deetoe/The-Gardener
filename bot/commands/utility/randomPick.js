const { SlashCommandBuilder } = require('discord.js');
const { cooldown } = require('./ping');

module.exports = {
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('randompick')
        .setDescription('Pick a random value from a list of options')
        .addStringOption(option =>
            option.setName('values')
                .setDescription('Comma-separated list of values (e.g., apple, banana, cherry)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const valuesString = interaction.options.getString('values');
        const values = valuesString
            .split(',')
            .map(val => val.trim())
            .filter(val => val.length > 0);

        if (values.length === 0) {
            return interaction.reply('❌ Please provide at least one value.');
        }

        const randomValue = values[Math.floor(Math.random() * values.length)];
        return interaction.reply(`🎲 I picked: **${randomValue}**`);
    },
};