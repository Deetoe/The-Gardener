const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
console.log('Token available:', !!process.env.DISCORD_TOKEN);
console.log('Client ID available:', !!process.env.CLIENT_ID);
console.log('Guild ID available:', !!process.env.GUILD_ID);

// Load environment variables from .env file
dotenv.config();

// Access environment variables
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

// Array to hold all command data
const commands = [];

// Grab all the command folders from the 'commands' directory
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  // Grab all the command files in each folder
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  // For each command file, add its data to the 'commands' array
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Ensure each command has 'data' (SlashCommandBuilder) and 'execute' function
    if ('data' in command && 'execute' in command) {
      commands.push(command.data.toJSON());
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}

// Construct the REST API instance and set the token
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

// Deploy the commands
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // Put method fully refreshes the commands for the specific guild
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), // Routes for guild-specific commands
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // Catch and log any errors
    console.error(error);
  }
})();