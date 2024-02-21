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

module.exports = async (interaction) => {
  if (interaction.isModalSubmit()) {
    if (interaction.customId.includes('apologyRequest')) {
      const extractedId = (interaction.customId.match(/^[^-]+-(.+)$/) || [])[1];
      let _case = await Case.findOne({ _id: extractedId });
      _case.processStep = 'Victim Requested';
      _case.victimRequest = interaction.fields.getTextInputValue('apologyInput');
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
      console.log(`test-offenderId: ${offenderId}`);
      console.log(`test-victimId: ${victimId}`);
      const offender = await interaction.guild.members.fetch(offenderId);
      const victim = await interaction.guild.members.fetch(victimId);
      const offenderThread = await interaction.client.channels.fetch(offenderThreadId);

      const filter = (interaction) => interaction.user.id === offender.id;
      // TODO: Make this an util?
      // Send initial prompt
      const yes = new ButtonBuilder()
                      .setCustomId(`yes-${_case.id}`)
                      .setLabel('Yes')
                      .setStyle(ButtonStyle.Success);
      const no = new ButtonBuilder()
                      .setCustomId(`no-${_case.id}`)
                      .setLabel('No')
                      .setStyle(ButtonStyle.Danger);
      const row = new ActionRowBuilder()
                      .addComponents(yes, no);

      const promptMessage = await offenderThread.send({
        content: `${offender}, the moderator team has reviewed your case along with the involving user ${victim.displayName}. The user has agreed to give you a second chance to lift the mute by providing them an apology to recover from the incident.\nHere is the apology request from ${victim.displayName}: ${victimRequest}.\nWould you want to proceed?`,
        components: [row],
      });

      const collector = offenderThread.createMessageComponentCollector({ filter });

      collector.on('collect', async (interaction) => {
        const response = interaction.customId;
        if (response.includes('yes')) {
          // Send apology request
          // Create the modal
          const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
          const modal = new ModalBuilder()
            .setCustomId(`apologyResponse-${extractedId}`)
            .setTitle('Apology Response');

          // Add components to modal
          // Create the text input components
          const apologyResponse = new TextInputBuilder()
            .setCustomId('apologyResponse')
              // The label is the prompt the user sees for this input
            .setLabel("Enter your response here.")
              // Short means only a single line of text
            .setStyle(TextInputStyle.Paragraph)
          // .setMaxLength(1000)
          // .setMinLength(10) // TODO: specify these number
            .setRequired(true);

          // An action row only holds one text input,
          // so you need one action row per text input.
          const apologyActionRow = new ActionRowBuilder().addComponents(apologyResponse);

          // Add inputs to the modal
          modal.addComponents(apologyActionRow);

          // Show the modal to the user
          await interaction.showModal(modal);
        } else if (response.includes('no')) {
          // Send a thank you message
          // TODO: remarks?
          const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
          let _case = await Case.findOne({ _id: extractedId });
          _case.processStep = 'Case Closed - Failed to Apologize';
          _case.approvalStatus = 'Offender Declined';
          await _case.save();

          const guild = await Guild.findOne({ guildId: interaction.guild.id });
          const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
          sendEmbedCaseAlert(alertChannel, _case);

          await interaction.reply('Thank you for your response.', { ephemeral: true });
        }
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
