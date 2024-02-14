const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');

module.exports = {
  data: new SlashCommandBuilder()
          .setName('apolomute')
          .setDescription("Mute with Apology option.")
          .addUserOption(option =>
            option
              .setName('offender')
              .setDescription('The user to mute with apology option.')
              .setRequired(true)
          )
          .addUserOption(option =>
            option
              .setName('victim')
              .setDescription('The user to receive the apology.')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('reason')
              .setDescription('The reason for muting with apology option.')
          )
          .addStringOption(option =>
            option
              .setName('duration')
              .setDescription('Mute duration (30m, 1h, 1 day).')
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
          .setDMPermission(false),
  run: async ({ interaction }) => {
    // Get the user to ban
		const offender = interaction.options.getMember('offender');
		const victim = interaction.options.getMember('victim');
    const mod = interaction.member;

    const duration = interaction.options.getString('duration'); // 1d, 1 day, 1s 5s, 5m

    await interaction.deferReply();

    // TODO: Check conditions of user
    // 1. user (offender/victim) doesn't exist in server
    // 2. user is bot
    // 3. user's roles

    const msDuration = ms(duration);
    if (isNaN(msDuration)) {
      await interaction.editReply('Please provide a valid mute duration.');
      return;
    }

    if (msDuration < 5000 || msDuration > 2.419e9) {
      await interaction.editReply('Timeout duration cannot be less than 5 seconds or more than 28 days.');
      return;
    }

    if (!interaction.inGuild()) {
      interaction.reply({
        content: 'You can only run this command inside a server.',
        ephemeral: true,
      });
      return;

    };

    // Mute the offender
		try {
			await offender.timeout(msDuration);
			return interaction.editReply({ content: `${offender} has been muted from the server`, ephemeral: true });
		} catch (error) {
			console.error(error);
			return interaction.editReply({ content: 'An error occurred while trying to mute the offender', ephemeral: true });
		}

  },
  devOnly: true,
};
