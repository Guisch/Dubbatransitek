// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// define the schema for our Playlist model
var musicSchema = mongoose.Schema({
  _id: Schema.Types.ObjectId,
  author_id: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  url: String,
  file: String,
  title: String,
  artistName: String,
  deezerId: Number,
  itunesId: Number,
  itunesAlbumId: Number,
  spotifyId: String,
  spotifyAlbumId: String,
  position: Number,
  duration: Number,
  deezerAlbum: Number,
  discNumber: Number,
  album: String,
  releaseDate: Date,
  nbTracks: Number,
  genreId: Number,
  cover: String,
  genre: String,
  trackWebpage: String,
  artistWebpage: String,
  tags: [String],
  creationDate: {
    type: Date,
    default: Date.now
  },
  waveform: [Number],
  playCounter: Object
});

musicSchema.statics.isUrlAlreadyDownloaded = function(url, callback) {
  return this.model('Music').findOne({
    url: url
  }, function(err, res) {
    if (err)
      return callback();

    if (res === undefined || res == null)
      return callback(false);

    return callback(true, res);
  });
}

musicSchema.statics.getWaveform = function(id, userId, callback) {
  return this.model('Music').findOne({
    _id: id
  }, function(err, res) {
    if (err)
      return callback();

    var newPlayCounter = res.playCounter;

    if (res.playCounter === undefined || res.playCounter === null) {
      newPlayCounter = {};
    }

    if (newPlayCounter[userId] === undefined)
      newPlayCounter[userId] = 1;
    else
      newPlayCounter[userId]++;

    mongoose.model('Music').update({
        _id: id
    }, {
        playCounter: newPlayCounter
    }, function(err2, res2) {
        if(err2)
            console.log("Error while updating playCounter", err2);
    });

    return callback(res.waveform);
  })
}

// create the model for playlist and expose it to our app
module.exports = mongoose.model('Music', musicSchema);
