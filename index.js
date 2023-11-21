require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const { CommandHandler } = require('djs-commander');
const path = require('path');
const { TOKEN } = process.env;

const client = new Client({ intents: [ IntentsBitField.Flags.Guilds ] });

new CommandHandler({
  client,
  commandsPath: path.join(__dirname, 'commands'),
  eventsPath: path.join(__dirname, 'events'),
  validationsPath: path.join(__dirname, 'validations'),
  // testServer: '1148950990452686900',
});

client.login(TOKEN);
