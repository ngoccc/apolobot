const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const Case = require('../../models/Case');
const Guild = require('../../models/Guild');
const sendEmbedCaseAlert = require('../../utils/sendEmbedCaseAlert');
const sendApproveForm = require('../../utils/sendApproveForm');

module.exports = async (interaction) => {
  if (interaction.isModalSubmit()) {
    if (interaction.customId.includes('apologyRequest')) {
      const extractedId = (interaction.customId.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Victim Requested';
      _case.victimRequest = interaction.fields.getTextInputValue('apologyRequest');
      await _case.save();

      // Send request to mod
      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
      sendEmbedCaseAlert(alertChannel, _case);

      await interaction.reply({ content: 'Your apology request was received successfully!' });
      // Send request to offender thread
      const { offenderId,
              victimId,
              victimRequest,
              offenderThreadId,
            } = _case;
      const offender = await interaction.guild.members.fetch(offenderId);
      const victim = await interaction.guild.members.fetch(victimId);
      const offenderThread = await interaction.client.channels.fetch(offenderThreadId);

      sendApproveForm({
        type: 'yn',
        msg: `${offender}, the moderator team has reviewed your case along with the involving user ${victim.displayName}. The user has agreed to give you a second chance to lift the mute by providing them an apology to recover from the incident.\nHere is the apology request from ${victim.displayName}: ${victimRequest}.\nWould you want to proceed?`,
        thread: offenderThread,
        target: offender,
        _case: _case,
        customId: "apologyResponse",
        role: "offender",
      });
    }
    else if (interaction.customId.includes('apologyResponse')) {
      const extractedId = (interaction.customId.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Offender Responded';
      _case.offenderResponse = interaction.fields.getTextInputValue('apologyResponse');
      await _case.save();

      // Send request to mod
      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
      sendEmbedCaseAlert(alertChannel, _case);

      await interaction.reply({ content: 'Your apology response was received successfully!' });
    }
  }
  else return;
};
