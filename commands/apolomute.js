const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const Case = require('../models/Case');
const Guild = require('../models/Guild');
const sendEmbedCaseAlert = require('../utils/sendEmbedCaseAlert');

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
              .setName('duration')
              .setDescription('Mute duration (30m, 1h, 1 day).')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('reason')
              .setDescription('The reason for muting with apology option.')
              .setRequired(true)
          )
          .addAttachmentOption(option =>
            option
              .setName('proof')
              .setDescription('Proof (e.g image, screenshot) for the given case.')
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers)
          .setDMPermission(false),

  run: async ({ interaction }) => {
    // Get the user to ban
		const offender = interaction.options.getMember('offender');
		const victim = interaction.options.getMember('victim');
    const mod = interaction.member;

    const duration = interaction.options.getString('duration'); // 1d, 1 day, 1s 5s, 5m
    const reason = interaction.options.getString('reason');
    const proof = interaction.options.getAttachment('proof');

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

    // Create a new case in the database
    let guild = await Guild.findOne({ guildId: interaction.guild.id });
    let _case = new Case({
      guildId: interaction.guild.id,
      localCaseId: guild.totalCase + 1,
      modId: mod.id,
      duration: duration,
      reason: reason,
      proof: proof,
      createdOn: new Date(),
      offenderId: offender.id,
      victimId: victim.id,
      processStep: 'Waiting for Victim Request',
    });
    await _case.save();

    guild.totalCase += 1;
    await guild.save();


    // alert new case
    const alertChannel = await interaction.client.channels.fetch(guild.alertChannelId)
      .catch(console.error);

    sendEmbedCaseAlert(alertChannel, _case);

    // Mute the offender in all channels (assuming you have the necessary permissions)
    try {
      interaction.guild.channels.cache
        .filter(
          (channel) =>
            ![
              'GUILD_DIRECTORY',
              'GUILD_NEWS_THREAD',
              'GUILD_PRIVATE_THREAD',
              'GUILD_PUBLIC_THREAD',
            ].includes(channel.type),
        )
        .forEach(async (channel) => {
          if (channel.type === 0 || channel.type === 2) {
            await channel.permissionOverwrites.create(offender.id, { SendMessages: false });
          }
        });
    } catch (error) {
      console.log(`Error: ${error}`);
			return interaction.editReply({ content: 'An error occurred while trying to mute offender', ephemeral: true });
    }

    // Create a private thread for the offender and the bot
    let offenderThread;
    try {
      offenderThread = await interaction.channel.threads.create({
        name: `case-offender-${offender.user.username}-${victim.user.username}`,
        type: ChannelType.PrivateThread,
        // autoArchiveDuration: msDuration,
        reason: 'apolobot-testing', // TODO: fix this
        invitable: false,
      });
    } catch (error) {
      console.log(`Error: ${error}`);
			return interaction.editReply({ content: 'An error occurred while trying to create a private thread for offender', ephemeral: true });
    }

    // Add the victim to the thread
    await offenderThread.members.add(offender);

    // Send a message to the offender in the private thread
    offenderThread.send(`You have been muted in all channels except this private thread. Please wait for further instructions.`);
    _case.offenderThread = offenderThread.id;
    await _case.save();

    // TODO: add reason and other info here.
    interaction.editReply({ content: `${offender} has been muted from the server`, ephemeral: true });

    // Send a private thread to victim
    // Create a private thread
    let victimThread;
    try {
      victimThread = await interaction.channel.threads.create({
        name: `case-victim-${offender.user.username}-${victim.user.username}`,
        type: ChannelType.PrivateThread,
        // autoArchiveDuration: msDuration,
        reason: 'apolobot-testing', // TODO: fix this
        invitable: false,
      });
    } catch (error) {
      console.log(`Error: ${error}`);
			return interaction.editReply({ content: 'An error occurred while trying to create a private thread for victim', ephemeral: true });
    }

    // Add the victim to the thread
    await victimThread.members.add(victim);

    _case.processStep = 'Waiting for Victim Request';
    _case.victimThread = victimThread.id;
    await _case.save();

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

    const promptMessage = await victimThread.send({
      content: `${victim}, ${mod} has observed inappropriate behavior from ${offender.name}, and took action by muting the user. Do you want to give them a second chance by requesting an apology?`,
      components: [row],
    });

    // Set up button collector
    const filter = (interaction) => interaction.user.id === victim.id;
    const collector = victimThread.createMessageComponentCollector({ filter });

    collector.on('collect', async (interaction) => {
      const response = interaction.customId;
      if (response.includes('yes')) {
        // Send apology form
        // Create the modal
        const extractedId = (response.match(/^[^-]+-(.+)$/) || [])[1];
        const modal = new ModalBuilder()
          .setCustomId(`apologyRequest-${extractedId}`)
          .setTitle('Apology Request');

        // Add components to modal
        // Create the text input components
        const apologyInput = new TextInputBuilder()
          .setCustomId('apologyInput')
            // The label is the prompt the user sees for this input
          .setLabel("Enter your request here.")
            // Short means only a single line of text
          .setStyle(TextInputStyle.Paragraph)
         // .setMaxLength(1000)
         // .setMinLength(10) // TODO: specify these number
          .setRequired(true);

        // An action row only holds one text input,
        // so you need one action row per text input.
        const apologyActionRow = new ActionRowBuilder().addComponents(apologyInput);

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
        _case.approvalStatus = 'Victim Declined';
        await _case.save();

        await interaction.reply('Thank you for your response.', { ephemeral: true });
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        // Handle if the user took too long to respond
        victimThread.send('You took too long to respond. The thread is now closed.');
        victimThread.delete();
      }
    });
  },

  devOnly: true,
};
