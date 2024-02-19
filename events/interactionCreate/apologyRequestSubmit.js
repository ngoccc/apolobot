const Case = require('../../models/Case');
const Guild = require('../../models/Guild');
const sendEmbedCaseAlert = require('../../utils/sendEmbedCaseAlert');

module.exports = async (interaction) => {
  if (interaction.isModalSubmit()) {

    if (interaction.customId.includes('apologyRequest')) {
      const extractedId = (interaction.customId.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Victim Requested';
      _case.victimRequest = interaction.fields.getTextInputValue('apologyInput');
      await _case.save();

      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
      sendEmbedCaseAlert(alertChannel, _case);

      await interaction.reply({ content: 'Your apology request was received successfully!' });
    }
  }
  else return;
};
