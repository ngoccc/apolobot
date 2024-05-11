const Case = require('../../models/Case');
const Guild = require('../../models/Guild');
const sendEmbedCaseAlert = require('../../utils/sendEmbedCaseAlert');
const sendApproveForm = require('../../utils/sendApproveForm');
const disableButton = require('../../components/disableButton');

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

      await interaction.reply({ content: 'Your apology request was received successfully! This will be sent to the corresponding user and awaiting response.' });
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
        msg: `${offender}, the moderator team has reviewed your case along with the involving user ${victim.displayName}. The user has agreed to give you a second chance to lift the mute by providing them an apology to recover from the incident.\n\
Here is the apology request from ${victim.displayName}: ${victimRequest}.\n\
If you proceed with an apology that is accepted by the user, your account mute will be instantly lifted. Otherwise, it will remain for the rest of the intended period.
Would you want to proceed?`,
        thread: offenderThread,
        target: offender,
        _case: _case,
        customId: "apologyResponse",
        role: "Offender",
      });

      // Disable the buttons
      await interaction.message.edit({
        components: [disableButton("Yes")],
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

      // Disable the buttons
      await interaction.message.edit({
        components: [disableButton("Yes")],
      });

      await interaction.reply({ content: 'Your apology response was received and will be reviewed accordingly.' });
    }
    else if (interaction.customId.includes('remarks')) {
      const extractedId = (interaction.customId.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.remarks = interaction.fields.getTextInputValue('remarks');
      await interaction.reply({ content: 'Your response were received successfully. Your perspective are valuable to improve the community!' });

      // remarks is always in the end so send embed update here
      const guild = await Guild.findOne({ guildId: interaction.guild.id });
      const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
      sendEmbedCaseAlert(alertChannel, _case);

      // TODO: Disable button (could be either yes or no -> need to embed it here!)
    }
  }
  else return;
};
