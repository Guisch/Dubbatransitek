// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// load up the music model
var Music = require('./music');

// define the schema for our Playlist model
var playlistSchema = mongoose.Schema({
  _id: Schema.Types.ObjectId,
  name: String,
  author_id: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  contributor_id: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tag: [String],
  importedPl: [String],
  musics: [{
    music_id: {
      type: Schema.Types.ObjectId,
      ref: 'Music'
    },
    index: Number,
    contributor_id: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  syncImportedPlaylist: {
    type: Boolean,
    default: false
  },
  autoAddSimilarSong: {
    type: Boolean,
    default: false
  },
  creationDate: {
    type: Date,
    default: Date.now
  },
  isZipped: {
    type: Boolean,
    default: false
  }
});

playlistSchema.statics.getAllPlaylists = function(callback) {
  return this.model('Playlist').find({}, 'name + musics.music_id + musics.contributor_id + tag + author_id')
    .populate('author_id', 'local.username + spotify.username + deezer.username + youtube.displayName')
    .populate('musics.contributor_id', 'local.username + spotify.username + deezer.username + youtube.displayName')
    .populate('musics.music_id', 'cover').exec(function(err, res) {
      if (err)
        return;

      callback(res);
    });
}

playlistSchema.statics.getSyncedPlaylist = function(callback) {
  return this.model('Playlist').find({}, 'name + musics.music_id + author_id + syncImportedPlaylist + importedPl')
    .exec(function(err, res) {
      if (err)
        return;

      callback(res);
    });
}

playlistSchema.statics.getUserPlaylists = function(userId, callback) {
  return this.model('Playlist').find({
    author_id: userId
  }, 'name + musics.music_id').populate('musics.music_id', 'cover').exec(function(err, res) {
    if (err)
      return;

    callback(res);
  })
}

playlistSchema.statics.getPlaylist = function(playlistName, callback) {
  return this.model('Playlist').findOne({
      name: playlistName
    }).populate('author_id', 'local.username + spotify.username + deezer.username + youtube.displayName')
    .populate('musics.contributor_id', 'local.username + spotify.username + deezer.username + youtube.displayName')
    .populate('musics.music_id', 'cover + title + artistName + file + url + playCounter').exec(function(err, res) {
      if (err) return;

      callback(res);
    });
}

playlistSchema.statics.getPlaylistInfo = function(playlistName, callback) {
  return this.model('Playlist').findOne({
    name: playlistName
  }, function(err, result) {
    if (err)
      return;

    return callback(result.syncImportedPlaylist, result.autoAddSimilarSong);
  });
}

playlistSchema.statics.addMusicToPlaylist = function(playlistName, musicId, userId, index, callback) {
  return this.model('Playlist').update({
    name: playlistName
  }, {
    $addToSet: {
      musics: {
        music_id: musicId,
        contributor_id: userId,
        index: index
      }
    },
    isZipped: false
  }, callback);
}

playlistSchema.statics.addImportedPl = function(playlistName, url) {
  return this.model('Playlist').update({
    name: playlistName
  }, {
    $addToSet: {
      importedPl: url
    }
  }, function(err) {
    if (err) {
      console.log(err);
    }
  });
}

playlistSchema.statics.isUrlAlreadyInPlaylist = function(playlistName, url, callback) {
  return this.model('Playlist').findOne({
    name: playlistName
  }).populate('musics.music_id').exec(function(err, res) {
    if (err) return;

    for (var i = 0; i < res.musics.length; i++) {
      if (res.musics[i].music_id.url == url) {
        return callback(true);
      }
    }

    return callback(false);
  });
}

// create the model for playlist and expose it to our app
module.exports = mongoose.model('Playlist', playlistSchema);
