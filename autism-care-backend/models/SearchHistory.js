const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema({
  caretakerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  query: { type: String, required: false },
  type: { type: String, required: true },
  timestamps: { type: Date, default: Date.now },
  url: { type: String },
  title: { type: String },
  name: { type: String }, 

});

const SearchHistory = mongoose.model('SearchHistory', SearchHistorySchema);

module.exports = SearchHistory;
