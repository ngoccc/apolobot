const { Schema, model } = require('mongoose');

const guildSchema = new Schema({
  guildId: {
    type: String,
    required: true,
  },
  totalCase: {
    type: Number,
    default: 0,
  },
  alertChannelId: {
    type: String,
    required: true,
  },
});

module.exports = model('Guild', guildSchema);
