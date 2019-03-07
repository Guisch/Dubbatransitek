//load all the thing we need
var ssyd = require('ssydtomp3');
var similarSongs = require('similar-songs');
var CronJob = require('cron').CronJob;
var queue = require('queue');
var mongoose = require('mongoose');
var simplewaveformjs = require('simplewaveformjs');
var downloadQueue = queue({
  autostart: true,
  concurrency: 1
});

var removeQueue = queue({
  autostart: true,
  concurrency: 1
});

// load up the playlist model
var Playlist = require('./models/playlist');
var Music = require('./models/music')

var fs = require('fs');
var path = require('path');

// The zip library needs to be instantiated:
var zip = require('systemzipjs');

module.exports = function(io, lang, similarSongsOption) {

  // -------------------------------------------------------------------------
  // Function
  // -------------------------------------------------------------------------

  // Get

  function getUrlType(url) {
    var site;

    if (url.indexOf('http') !== -1) {
      if (url.indexOf('youtu') !== -1) {
        if (url.indexOf('?list=') !== -1)
          site = 'youtube playlist';
        else if (url.indexOf('watch') !== -1)
          site = 'youtube';
        else
          site = 'unknown';
      } else if (url.indexOf('soundcloud.com') !== -1) {
        if (url.indexOf('/sets/') !== -1)
          site = 'soundcloud playlist';
        else
          site = 'soundcloud';
      } else if (url.indexOf('spotify.com') !== -1) {
        if (url.indexOf('playlist') !== -1)
          site = 'spotify playlist';
        else if (url.indexOf('track') !== -1)
          site = 'spotify'
      } else if (url.indexOf('deezer.com') !== -1) {
        if (url.indexOf('playlist') !== -1)
          site = 'deezer playlist';
        else if (url.indexOf('track') !== -1)
          site = 'deezer';
      } else
        site = 'unknown';
    } else {
      site = 'query';
    }
    return site;
  }

  function compare(a, b) {
    let comparison = 0;

    if (a.index > b.index) {
      comparison = 1;
    } else if (b.index > a.index) {
      comparison = -1;
    }

    return comparison;
  }

  function getSongs(name, callback) {
    Playlist.getPlaylist(name, function(res) {
      if (res && res.length != 0)
        callback(res.musics.sort(compare));
    });
  }

  // Add

  function addSongToPlaylist(file, infos, url, userId, playlistName, callback) {
    if (!infos)
      return callback(false, lang.playlist.errorAddingMusic);

    if (infos._id) {
      return Playlist.getPlaylist(playlistName, function(res) {
        return Playlist.addMusicToPlaylist(playlistName, infos._id, userId, res.musics.length, function(err) {
          if (err) {
            console.log(err);
            return callback(false, lang.playlist.errorAddingMusic);
          }

          return callback(true, lang.playlist.successfullyAddedMusic);
        });
      });
    }

    var music = new Music();

    if (infos.tags)
      music.tags = infos.tags;
    if (infos.title)
      music.title = infos.title;
    if (infos.artistName)
      music.artistName = infos.artistName;
    if (infos.deezerId)
      music.deezerId = infos.deezerId;
    if (infos.itunesId)
      music.itunesId = infos.ituneId;
    if (infos.spotifyId)
      music.spotifyId = infos.spotifyId;
    if (infos.itunesAlbumId)
      music.ituneAlbumId = infos.ituneAlbumId;
    if (infos.spotifyAlbumId)
      music.spotifyAlbumId = infos.spotifyAlbumId;
    if (infos.position)
      music.position = infos.trackPosition;
    if (infos.duration)
      music.duration = infos.duration / 1000;
    if (infos.deezerAlbum)
      music.deezerAlbum = infos.deezerAlbumId;
    if (infos.discNumber)
      music.discNumber = infos.discPosition;
    if (infos.album)
      music.album = infos.albumName;
    if (infos.releaseYear)
      music.releaseDate = infos.releaseYear;
    if (infos.nbTracks)
      music.nbTracks = infos.trackCount;
    if (infos.cover)
      music.cover = infos.cover;
    if (infos.genre)
      music.genre = infos.genre;

    music.author_id = userId;
    music.url = url;
    music.file = file;
    music._id = mongoose.Types.ObjectId();

    simplewaveformjs.getWaveform(file, function(wfRes) {
      if (wfRes && wfRes.length != 0)
        music.waveform = wfRes;

      music.save(function(err) {
        if (err) {
          console.log(err);
          return callback(false, lang.playlist.errorAddingMusic);
        }

        Playlist.getPlaylist(playlistName, function(res) {
          Playlist.addMusicToPlaylist(playlistName, music._id, userId, res.musics.length, function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorAddingMusic);
            }

            return callback(true, lang.playlist.successfullyAddedMusic);
          });
        });
      });
    });
  }

  function addSongFromYoutube(playlistName, url, userId, callback, progress) {
    ssyd.getYoutubeMusicInfos(url, function(err, res) {
      if (err || res === undefined)
        return callback(false, lang.playlist.errorAddingMusic);

      downloadSong(url, function(file, infos) {
        addSongToPlaylist(file, infos, url, userId, playlistName, callback);
      }, progress, res);
    });
  }

  function addSongFromDeezer(playlistName, url, userId, callback, progress) {
    ssyd.getDeezerMusicInfos(url, function(err, res) {
      if (err || res === undefined)
        return callback(false, lang.playlist.errorAddingMusic);

      downloadSong('https://www.youtube.com/watch?v=' + res.youtubeRes.id.videoId, function(file, infos, url) {
        addSongToPlaylist(file, infos, url, userId, playlistName, callback);
      }, progress, res);
    });
  }

  function addSongFromSoundcloud(playlistName, url, userId, callback, progress) {
    ssyd.getSoundcloudInfos(url, function(err, res) {
      if (err || res === undefined)
        return callback(false, lang.playlist.errorAddingMusic);

      downloadSong(url, function(file, infos) {
        addSongToPlaylist(file, infos, url, userId, playlistName, callback);
      }, progress, res);
    });
  }

  function addSongFromSpotify(playlistName, url, userId, callback, progress) {
    ssyd.getSpotifyMusicInfos(url, function(err, res) {
      if (err || res === undefined)
        return callback(false, lang.playlist.errorAddingMusic);

      downloadSong('https://www.youtube.com/watch?v=' + res.youtubeRes.id.videoId, function(file, infos, url) {
        addSongToPlaylist(file, infos, url, userId, playlistName, callback);
      }, progress, res);
    });
  }

  function addPlaylist(name, tag, url, userId, plCreated, callback, progress) {
    var newPlaylist = new Playlist();
    newPlaylist._id = mongoose.Types.ObjectId();
    newPlaylist.name = name;
    newPlaylist.tag = tag.replace(/ ,|, /g, ',').split(',');
    newPlaylist.author_id = userId;

    if (url) {
      switch (getUrlType(url)) {
        case 'youtube':
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();
            addSongFromYoutube(name, url, userId, callback, progress);
          });
          break;
        case 'soundcloud':
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();
            addSongFromSoundcloud(name, url, userId, callback, progress);
          });
          break;
        case 'deezer':
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();
            addSongFromDeezer(name, url, userId, callback, progress);
          });
          break;
        case 'spotify':
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();
            addSongFromSpotify(name, url, userId, callback, progress);
          });
          break;
        case 'soundcloud playlist':
          newPlaylist.importedPl = [url];
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();
            downloadSongsFromSoundcloud(url, function(file, infos, url) {
              addSongToPlaylist(file, infos, url, userId, name, callback);
            }, progress);
          });
          break;
        case 'youtube playlist':
          newPlaylist.importedPl = [url];
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();
            downloadSongsFromYoutube(url, function(file, infos, url) {
              addSongToPlaylist(file, infos, url, userId, name, callback);
            }, progress);
          });
          break;
        case 'spotify playlist':
          newPlaylist.importedPl = [url];
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();
            downloadSongsFromSpotify(url, function(file, infos, url) {
              addSongToPlaylist(file, infos, url, userId, name, callback);
            }, progress);
          });
          break;
        case 'deezer playlist':
          newPlaylist.importedPl = [url];
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();
            downloadSongsFromDeezer(url, function(file, infos, url) {
              addSongToPlaylist(file, infos, url, userId, name, callback);
            }, progress);
          });
          break;
        case 'query':
          newPlaylist.save(function(err) {
            if (err) {
              console.log(err);
              return callback(false, lang.playlist.errorCreatingPlaylist);
            }
            plCreated();

            addSongFromQuery(name, url, userId, callback, progress);
          });

          break;
        default:
          return callback(false);
      }

    } else {
      newPlaylist.save(function(err) {
        if (err) {
          console.log(err);
          return callback(false, lang.playlist.errorCreatingPlaylist);
        }

        return callback(true, lang.playlist.successfullyCreatedPlaylist);
      });
    }
  }

  function addSongFromQuery(playlistName, query, userId, callback, progress) {
    findAndDownload(query, function(file, infos, url) {
      if (!file || !infos)
        return callback(false, lang.playlist.errorAddingMusic);

      addSongToPlaylist(file, infos, url, userId, playlistName, callback);
    }, progress);
  }

  function forSimilar(foundedSongs, index, callback) {
    if (index >= foundedSongs.length)
      return callback(false, null);

    var urlYt = 'https://www.youtube.com/watch?v=' + foundedSongs[index].youtubeId;

    Music.isUrlAlreadyDownloaded(urlYt, function(itis) {
      if (itis)
        return forSimilar(foundedSongs, index + 1, callback);

      ssyd.getYoutubeMusicInfos(urlYt, function(err, res) {
        if (err)
          return forSimilar(foundedSongs, index + 1, callback);

        var searchParams = [{
          url: urlYt
        }];

        if (res.deezerRes && res.deezerRes.id)
          searchParams.push({
            deezerId: res.deezerRes.id
          });
        if (res.ituneRes && res.ituneRes.trackId)
          searchParams.push({
            itunesId: res.ituneRes.trackId
          });
        if (res.spotifyRes && res.spotifyRes.id)
          searchParams.push({
            itunesId: res.ituneRes.trackId
          });

        return Music.findOne({
          $or: searchParams
        }, function(err, res) {
          if (err || res === undefined || res == null || (res != null && res.length == 0))
            return callback(true, urlYt);

          return forSimilar(foundedSongs, index + 1, callback);
        });
      });
    });
  }

  function addSimilar(playlistName, userId, musicId, callback, progress) {
    Music.findOne({
      _id: musicId
    }, function(err, res) {
      if (err) return;

      if (!res) return callback(false, lang.playlist.needToListenFirst);

      similarSongs.find({
        title: res.title,
        artist: res.artistName,
        limit: 10, // defaults to 50
        lastfmAPIKey: similarSongsOption.lastFM.lastfmAPIKey,
        lastfmAPISecret: similarSongsOption.lastFM.lastfmAPISecret,
        youtubeAPIKey: similarSongsOption.youtube.youtubeAPIKey
      }, function(err, foundedSongs) {
        if (err || foundedSongs.length == 0)
          return callback(false, lang.playlist.unableToFindSimilarSong);

        forSimilar(foundedSongs, 0, function(success, url) {
          if (!success)
            return callback(false, lang.playlist.unableToFindSimilarSong);

          addSongFromYoutube(playlistName, url, userId, callback, progress);
        });
      });
    });
  }

  // Edit

  function editPlaylistOptions(playlistName, userId, syncImportedPlaylist, autoAddSimilarSong, callback) {
    if (typeof(syncImportedPlaylist, autoAddSimilarSong) == "boolean") {
      Playlist.findOne({
        name: playlistName
      }, function(err, result) {
        if (err || result == null)
          return callback(false, lang.playlist.unableToEditOptions);

        if (result.author_id != userId)
          return callback(false, lang.playlist.notOwner);

        Playlist.update({
          name: playlistName
        }, {
          syncImportedPlaylist: syncImportedPlaylist,
          autoAddSimilarSong: autoAddSimilarSong
        }, function(err) {
          if (err)
            return callback(false, lang.playlist.unableToEditOptions);

          return callback(true, lang.playlist.successfullyEditedOptions);
        });
      });
    } else
      return callback(false, lang.playlist.unableToEditOptions);
  }

  function changeIndexes(playlistName, userId, oldIndex, newIndex, callback) {
    if (Number.isInteger(oldIndex) && oldIndex > -1 && Number.isInteger(newIndex) && newIndex > -1) {
      Playlist.findOne({
        name: playlistName
      }, function(err, res) {
        if (err)
          return callback(false, lang.playlist.unableToEditOptions);

        if (res.author_id != userId)
          return callback(false, lang.playlist.notOwner);

        var musics = JSON.parse(JSON.stringify(res.musics));

        if (newIndex < oldIndex) {
          for (var i = 0; i < res.musics.length; i++) {
            if (res.musics[i].index == oldIndex)
              musics[i].index = newIndex;

            if (res.musics[i].index >= newIndex && res.musics[i].index < oldIndex)
              musics[i].index += 1;
          }
        }

        if (newIndex > oldIndex) {
          for (var i = 0; i < res.musics.length; i++) {
            if (res.musics[i].index == oldIndex)
              musics[i].index = newIndex;

            if (res.musics[i].index <= newIndex && res.musics[i].index > oldIndex)
              musics[i].index -= 1;
          }
        }

        Playlist.update({
          name: playlistName
        }, {
          musics: musics
        }, function(err) {
          if (err)
            return callback(false, lang.playlist.unableToEditOptions);

          return callback(true, lang.playlist.successfullyEditedOptions);
        });
      })
    } else
      return callback(false, lang.playlist.unableToEditOptions);
  }

  // Remove

  function removePlaylist(playlistName, userId, callback) {
    Playlist.findOne({
      name: playlistName
    }, function(err, result) {
      if (err)
        return callback(false, lang.playlist.errorDeletingPlaylist);

      if (result.author_id != userId)
        return callback(false, lang.playlist.notOwner);

      if (result.musics.length == 0) {
        Playlist.remove({
          name: playlistName
        }, function(err) {
          if (err) {
            console.log(err);
            return callback(false, lang.playlist.errorDeletingPlaylist);
          }

          callback(true, lang.playlist.successfullyDeletedPlaylist)
          return fs.unlink(path.join(__dirname, '../public/playlists', result.name.replace(/[^a-z0-9]/gi, '_') + '.zip'), function(err) {
            if (err)
              console.log(err);
          });
        });
      } else {
        result.musics.forEach(function(music, index) {
          removeQueue.push(function(next) {
            removeSong(playlistName, music.music_id, userId, function() {
              next();
            });
          });

          if (index == result.musics.length - 1) {
            removeQueue.push(function(next) {
              Playlist.remove({
                name: playlistName
              }, function(err) {
                next();
                if (err) {
                  console.log(err);
                  return callback(false, lang.playlist.errorDeletingPlaylist);
                }

                callback(true, lang.playlist.successfullyDeletedPlaylist);
                return fs.unlink(path.join(__dirname, '../public/playlists', result.name.replace(/[^a-z0-9]/gi, '_') + '.zip'), function(err) {
                  if (err)
                    console.log(err);
                });
              });
            });
          }
        });
      }
    });
  }

  function removeSong(playlistName, musicId, userId, callback) {
    //Search for the playlist where to delete song
    Playlist.findOne({
      name: playlistName
    }, function(err, res) {
      if (err)
        return callback ? callback(false, lang.playlist.errorDeletingPlaylist) : null;

      if (res.author_id != userId)
        return callback ? callback(false, lang.playlist.notOwner) : null;

      var musics = JSON.parse(JSON.stringify(res.musics));
      var fakeIndexToRemove;
      var i;

      for (i = 0; i < musics.length; i++) {
        if (res.musics[i].music_id == musicId.toString()) {
          fakeIndexToRemove = res.musics[i].index;
          break;
        }
      }

      if (i == musics.length)
        return callback ? callback(false, lang.playlist.errorDeletingMusic) : null;

      musics.splice(i, 1);

      for (i = 0; i < musics.length; i++) {
        if (musics[i].index > fakeIndexToRemove) {
          musics[i].index -= 1;
        }
      }

      //Remove song from this playlist
      Playlist.update({
        name: playlistName
      }, {
        musics: musics
      }, {
        safe: true
      }, function(err) {
        if (err)
          return callback ? callback(false, lang.playlist.errorDeletingMusic) : null;

        //Search if the song is used in another playlist
        Playlist.findOne({
          'musics.music_id': musicId
        }, function(err, res) {
          //If not, remove the file
          if (err) return callback ? callback(false, lang.playlist.errorDeletingMusic) : null;

          if (!res) {
            Music.findOne({
              _id: musicId
            }, function(err, res) {
              if (err) return callback ? callback(false, lang.playlist.errorDeletingMusic) : null;

              fs.unlink(res.file, function() {
                Music.remove({
                  _id: musicId
                }, function(err) {
                  if (err) return callback ? callback(false, lang.playlist.errorDeletingMusic) : null;

                  return callback ? callback(true, lang.playlist.successfullyDeletedMusic) : null;
                });
              });
            });
          } else
            //If yes, do nothing
            return callback ? callback(true, lang.playlist.successfullyDeletedMusic) : null;
        });
      })
    });
  }

  // Download

  function downloadSong(url, callback, progress, metaData) {
    Music.isUrlAlreadyDownloaded(url, function(itis, res) {
      if (itis === undefined) return callback();

      if (itis) return callback(res.file, res, url);

      if (!metaData.ituneRes && !metaData.deezerRes && !metaData.spotifyRes) {
        return downloadQueue.push(function(next) {
          console.log("Downloading", url);
          var dl = ssyd.downloadAndTag(url, './public/musics', metaData, function(err, filePath, info) {
            next();
            if (err)
              return callback();

            return callback(filePath, info, url);
          });

          progress(dl);
        });
      }

      var searchParams = [{
        url: url
      }];

      if (metaData.deezerRes && metaData.deezerRes.id)
        searchParams.push({
          deezerId: metaData.deezerRes.id
        });
      if (metaData.ituneRes && metaData.ituneRes.trackId)
        searchParams.push({
          itunesId: metaData.ituneRes.trackId
        });
      if (metaData.spotifyRes && metaData.spotifyRes.id)
        searchParams.push({
          spotifyId: metaData.spotifyRes.id
        });

      return Music.findOne({
        $or: searchParams
      }, function(err, res) {
        if (err) {
          console.log(err);
          return callback();
        }

        if (res) return callback(res.file, res, url);

        downloadQueue.push(function(next) {
          console.log("Downloading", url);
          var dl = ssyd.downloadAndTag(url, './public/musics', metaData, function(err, filePath, info) {
            next();
            if (err)
              return callback();

            return callback(filePath, info, url);
          });

          progress(dl);
        });
      });
    })
  }

  function downloadSongsFromYoutube(url, callback, progress) {
    ssyd.getYoutubePlaylist(url, function(err, res) {
      if (err || res === undefined) {
        console.log('Error when getting infos from playlist URL:', url, err);
        return callback();
      }

      res.forEach(function(elem, index) {
        setTimeout(function() {
          ssyd.getYoutubeMusicInfos(ssyd.sanitizeUrl('https://www.youtube.com/watch?v=' + elem.contentDetails.videoId), function(err, res) {
            if (err || res === undefined) {
              console.log('Error when getting infos from playlist URL:', url, err);
              return callback();
            }
            downloadSong(ssyd.sanitizeUrl('https://www.youtube.com/watch?v=' + res.youtubeRes.id.videoId), callback, progress, res);
          }, {
            items: [elem]
          });
        }, index * 100);
      });
    });
  }

  function downloadSongsFromSoundcloud(url, callback, progress) {
    ssyd.getSoundcloudPlaylist(url, function(err, res) {
      if (err || res === undefined) {
        console.log('Error when getting infos from playlist URL:', url, err);
        return callback();
      }

      res.forEach(function(elem, index) {
        setTimeout(function() {
          ssyd.getSoundcloudInfos(ssyd.sanitizeUrl(elem.permalink_url), function(err, res) {
            if (err || res === undefined) {
              console.log('Error when getting infos from playlist URL:', url, err);
              return callback();
            }
            downloadSong(ssyd.sanitizeUrl(res.soundcloudRes.permalink_url), callback, progress, res);
          }, elem);
        }, index * 100);
      });
    });
  }

  function downloadSongsFromDeezer(url, callback, progress) {
    ssyd.getDeezerPlaylist(url, function(err, res) {
      if (err || res === undefined) {
        console.log('Error when getting infos from playlist URL:', url, err);
        return callback();
      }

      for (var i = 0; i < res.length; i++) {
        ssyd.getDeezerMusicInfos(ssyd.sanitizeUrl(res[i].link), function(err, res) {
            if (err || res === undefined) {
              console.log('Error when getting infos from playlist URL:', url, err);
              return callback();
            }
            downloadSong(ssyd.sanitizeUrl('https://www.youtube.com/watch?v=' + res.youtubeRes.id.videoId), callback, progress, res);
        }, res[i]);
      }
    });
  }

  function downloadSongsFromSpotify(url, callback, progress) {
    ssyd.getSpotifyPlaylist(url, function(err, res) {
      if (err || res === undefined) {
        console.log('Error when getting infos from playlist URL:', url, err);
        return callback();
      }

      for (var i = 0; i < res.length; i++) {
        ssyd.getSpotifyMusicInfos(ssyd.sanitizeUrl(res[i].track.external_urls.spotify), function(err, res) {
            if (err || res === undefined) {
              console.log('Error when getting infos from playlist URL:', url, err);
              return callback();
            }
            downloadSong(ssyd.sanitizeUrl('https://www.youtube.com/watch?v=' + res.youtubeRes.id.videoId), callback, progress, res);
        }, res[i].track);
      }
    });
  }

  function downloadSongs(url, callback, progress) {
    switch (getUrlType(url)) {
      case 'soundcloud playlist':
        downloadSongsFromSoundcloud(url, callback, progress);
        break;
      case 'youtube playlist':
        downloadSongsFromYoutube(url, callback, progress);
        break;
      case 'spotify playlist':
        downloadSongsFromSpotify(url, callback, progress);
        break;
      case 'deezer playlist':
        downloadSongsFromDeezer(url, callback, progress);
        break;
      default:
        callback();
        break;
    }
  }

  function findAndDownload(query, callback, progress) {
    ssyd.findVideoFromQuery(query, function(err, res) {
      if (err || res === undefined) {
        console.log('Error when finding video from query:', query, err);
        return callback();
      }

      return downloadSong(res.youtubeRes.id.videoId, callback, progress, res);
    });
  }

  function downloadPlaylist(name, callback, socket) {
    Playlist.getPlaylist(name, function(res) {
      if (res === undefined || res == null || (res != null && res.length == 0))
        callback(false, lang.playlist.downloadFail);

      if (res.isZipped)
        return callback(true, lang.playlist.downloadReady);

      var files = [];

      for (var i = 0; i < res.musics.length; i++) {
        files.push(res.musics[i].music_id.file);
      }

      var zipped = zip.zipFiles(path.join(__dirname, '../public/playlists', name.replace(/[^a-z0-9]/gi, '_') + '.zip'), files);

      zipped.on('progess', function(i) {
        socket.emit('wait', lang.playlist.zipProgress.replace('%d', Math.round(i * 100 / res.musics.length)));
      });

      zipped.on('error', function(err) {
        console.log(err);
        return callback(false, lang.playlist.downloadFail);
      });

      zipped.on('end', function() {
        Playlist.update({
          name: name
        }, {
          isZipped: true
        }, function(err) {
          if (err) {
            console.log(err);
            return callback(false, lang.playlist.downloadFail);
          }

          callback(true, lang.playlist.downloadReady);
        });
      });
    });
  }

  // UI

  function progressMessages(dl, socket) {
    if (dl) {
      dl.on('progress', function(p) {
        socket.emit('wait', lang.playlist.download.replace('%d', Math.round(p)));
      });
      dl.on('fetching', function() {
        socket.emit('wait', lang.playlist.fetching);
      });
      dl.on('convert-start', function() {
        socket.emit('wait', lang.playlist.convert);
      });
      dl.on('convert-end', function() {
        socket.emit('wait', lang.playlist.convertEnd);
      });
      dl.on('dl-end', function() {
        socket.emit('wait', lang.playlist.downloadEnd);
      });
      dl.on('dl-start', function() {
        socket.emit('wait', lang.playlist.downloadStart);
      });
      dl.on('end', function() {
        socket.emit('wait', lang.playlist.end, true);
      });
      dl.on('error', function(error) {
        console.log('Error when downloading\n', error);
      })
    } else {
      socket.emit('wait', lang.playlist.end, true);
    }
  }

  function playlistCreationChecker(name, userID, callback) {
    if (name == null) {
      return callback(false, lang.playlist.noPlaylistName);
    }

    if (userID == null) {
      return callback(false, lang.playlist.sessionExpired);
    }

    Playlist.find({
      name: name
    }, function(err, pl) {
      if (err) {
        return callback(false, lang.playlist.errorDB);
      }

      if (pl.length) {
        return callback(false, lang.playlist.playlistNameAlreadyTaken);
      } else {
        callback(true);
      }
    });
  }
  // -------------------------------------------------------------------------
  // Not function
  // -------------------------------------------------------------------------
  io.on('connection', function(socket) {
    socket.on('getAllPlaylists', function() {
      Playlist.getAllPlaylists(function(res) {
        socket.emit('allPlaylists', res);
      })
    });

    socket.on('getMyPlaylists', function() {
      if (!socket.request.session.passport.user) {
        return socket.emit('fail', lang.playlist.sessionExpired);
      }

      Playlist.getUserPlaylists(socket.request.session.passport.user, function(res) {
        socket.emit('myPlaylists', res);
      });
    });

    socket.on('getSongs', function(name) {
      getSongs(name, function(infos) {
        if (infos)
          socket.emit('songs(' + name + ')', infos, undefined, undefined, socket.request.session.passport.user);
      });
    });

    socket.on('getPlaylistInfo', function(name) {
      Playlist.getPlaylistInfo(name, function(syncImportedPlaylist, autoAddSimilarSong) {
        socket.emit('playlistInfo(' + name + ')', syncImportedPlaylist, autoAddSimilarSong);
      });
    });

    socket.on('getWaveform', function(isWs1, id) {
      Music.getWaveform(id, socket.request.session.passport.user, function(res) {
        if (!res)
          return socket.emit('fail', lang.playlist.cantGetWaveform);

        socket.emit('waveform', isWs1, res);
      })
    });

    socket.on('downloadPlaylist', function(name) {
      socket.emit('wait', lang.playlist.waitUntilDownloadReady);
      downloadPlaylist(name, function(success, msg) {
        socket.emit('wait', lang.playlist.waitUntilDownloadReady, true);
        if (success) {
          socket.emit('success', msg);
          socket.emit('downloadReady');
        } else
          socket.emit('fail', msg);
      }, socket);
    });

    socket.on('addPlaylist', function(name, tag, url) {
      playlistCreationChecker(name, socket.request.session.passport.user, function(canCreate, msg1) {
        if (!canCreate) {
          return socket.emit('fail', msg1);
        }

        addPlaylist(name, tag, url ? ssyd.sanitizeUrl(url) : undefined, socket.request.session.passport.user, function() {
          Playlist.getUserPlaylists(socket.request.session.passport.user, function(res) {
            socket.emit('myPlaylists', res);
            socket.broadcast.emit('myPlaylists', res);
          });

          return socket.emit('success', lang.playlist.successfullyCreatedPlaylistWaitForSong);
        }, function(success, msg2) {
          if (!success)
            return socket.emit('fail', msg2);

          Playlist.getUserPlaylists(socket.request.session.passport.user, function(res) {
            socket.emit('myPlaylists', res);
            socket.broadcast.emit('myPlaylists', res);
          });

          getSongs(name, function(infos) {
            socket.broadcast.emit('songs(' + name + ')', infos);
          });

          return socket.emit('success', msg2);
        }, function(dl) {
          progressMessages(dl, socket);
        });
      });
    });

    socket.on('addSong', function(playlistName, uri) {
      if (!socket.request.session.passport.user) {
        return socket.emit('fail', lang.playlist.sessionExpired);
      }

      uri = uri.split(",");

      for (var i = 0; i < uri.length; i++) {
        url = ssyd.sanitizeUrl(uri[i]);

        function successSongFunction(success, msg) {
          if (!success)
            return socket.emit('fail', msg);

          getSongs(playlistName, function(infos) {
            socket.emit('songs(' + playlistName + ')', infos);
            socket.broadcast.emit('songs(' + playlistName + ')', infos);
          });

          return socket.emit('success', msg);
        }

        switch (getUrlType(url)) {
          case 'deezer':
            addSongFromDeezer(playlistName, url, socket.request.session.passport.user, successSongFunction, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          case 'spotify':
            addSongFromSpotify(playlistName, url, socket.request.session.passport.user, successSongFunction, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          case 'youtube':
            addSongFromYoutube(playlistName, url, socket.request.session.passport.user, successSongFunction, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          case 'soundcloud':
            addSongFromSoundcloud(playlistName, url, socket.request.session.passport.user, successSongFunction, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          case 'soundcloud playlist':
            Playlist.addImportedPl(playlistName, url);
            downloadSongsFromSoundcloud(url, function(file, infos, url) {
              addSongToPlaylist(file, infos, url, socket.request.session.passport.user, playlistName, successSongFunction);
            }, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          case 'youtube playlist':
            Playlist.addImportedPl(playlistName, url);
            downloadSongsFromYoutube(url, function(file, infos, url) {
              addSongToPlaylist(file, infos, url, socket.request.session.passport.user, playlistName, successSongFunction);
            }, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          case 'spotify playlist':
            Playlist.addImportedPl(playlistName, url);
            downloadSongsFromSpotify(url, function(file, infos, url) {
              addSongToPlaylist(file, infos, url, socket.request.session.passport.user, playlistName, successSongFunction);
            }, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          case 'deezer playlist':
            Playlist.addImportedPl(playlistName, url);
            downloadSongsFromDeezer(url, function(file, infos, url) {
              addSongToPlaylist(file, infos, url, socket.request.session.passport.user, playlistName, successSongFunction);
            }, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          case 'query':
            addSongFromQuery(playlistName, url, socket.request.session.passport.user, function(success, msg) {
              if (!success)
                return socket.emit('fail', msg);

              getSongs(playlistName, function(infos) {
                socket.emit('songs(' + playlistName + ')', infos);
                socket.broadcast.emit('songs(' + playlistName + ')', infos);
              });

              return socket.emit('success', msg);
            }, function(dl) {
              progressMessages(dl, socket);
            });
            break;
          default:
            return socket.emit('fail', lang.playlist.errorImportingPlaylist);
        }
      }
    });

    socket.on('addSimilar', function(playlistName, musicId) {
      if (!socket.request.session.passport.user) {
        return socket.emit('fail', lang.playlist.sessionExpired);
      }

      if (musicId == null) {
        return socket.emit('fail', lang.playlist.needToListenFirst);
      }

      addSimilar(playlistName, socket.request.session.passport.user, musicId, function(success, msg) {
        if (!success)
          return socket.emit('fail', msg);

        getSongs(playlistName, function(infos) {
          socket.emit('songs(' + playlistName + ')', infos);
          socket.broadcast.emit('songs(' + playlistName + ')', infos);
        });
        return socket.emit('success', msg);
      }, function(dl) {
        progressMessages(dl, socket);
      })
    });

    socket.on('removePlaylist', function(name) {
      if (!socket.request.session.passport.user)
        return socket.emit('fail', lang.playlist.sessionExpired);

      removePlaylist(name, socket.request.session.passport.user, function(success, msg) {
        if (success)
          socket.emit('success', msg);
        else
          socket.emit('fail', msg);
      });
    });

    socket.on('removeSong', function(playlistName, musicId, index) {
      if (!socket.request.session.passport.user)
        return socket.emit('fail', lang.playlist.sessionExpired);

      getSongs(playlistName, function(infos) {
        removeSong(playlistName, musicId, socket.request.session.passport.user, function(success, msg) {
          if (success) {
            for (var i = 0; i < infos.length; i++) {
              if (infos[i].music_id._id == musicId)
                break;
            }

            var songFile = infos[i].music_id.file.split('/').pop();
            removeQueue.push(function(next) {
              zip.removeFileFromZip(path.join(__dirname, '../public/playlists', playlistName.replace(/[^a-z0-9]/gi, '_') + '.zip'), songFile, next);
            });
            infos.splice(i, 1);

            socket.emit('success', msg);

            if (infos) {
              socket.emit('songs(' + playlistName + ')', infos, index);
              socket.broadcast.emit('songs(' + playlistName + ')', infos, index);
            }
          } else
            socket.emit('fail', msg);
        });
      });
    });

    socket.on('editPlaylistOptions', function(playlistName, syncImportedPlaylist, autoAddSimilarSong) {
      if (!socket.request.session.passport.user)
        return socket.emit('fail', lang.playlist.sessionExpired);

      editPlaylistOptions(playlistName, socket.request.session.passport.user, syncImportedPlaylist, autoAddSimilarSong, function(success, msg) {
        if (!success) {
          return socket.emit('fail', msg);
        }

        socket.emit('playlistInfo(' + playlistName + ')', syncImportedPlaylist, autoAddSimilarSong);
        socket.broadcast.emit('playlistInfo(' + playlistName + ')', syncImportedPlaylist, autoAddSimilarSong);
        socket.emit('success', msg);
      });
    });

    socket.on('changeIndexes', function(playlistName, oldIndex, newIndex) {
      if (!socket.request.session.passport.user)
        return socket.emit('fail', lang.playlist.sessionExpired);

      changeIndexes(playlistName, socket.request.session.passport.user, oldIndex, newIndex, function(success, msg) {
        if (!success) {
          socket.emit('fail', msg);
        } else {
          socket.emit('success', msg);
        }

        getSongs(playlistName, function(infos) {
          if (infos) {
            socket.emit('songs(' + playlistName + ')', infos);
            socket.broadcast.emit('songs(' + playlistName + ')', infos);
          }
        });
      });
    });

    socket.on('resetAllWf', function() {
      Music.find({
        //artistName: 'Amelie Lens'
      }).exec(function(err, res) {
        if (err || res === undefined || res.length == 0)
          return;

        var resetAllWfQueue = queue({
          autostart: true,
          concurrency: 1
        });

        res.forEach(function(elem, index) {
          resetAllWfQueue.push(function(next) {
            simplewaveformjs.getWaveform(elem.file, function(result) {
              Music.update({
                _id: elem._id
              }, {
                waveform: result
              }, function(err) {
                if (err)
                  return console.log('Error while updating', elem.file, err);
                console.log((index+1).toString() + '/' + res.length, 'Successfully generated waveform for', elem.file);
                next();
              });
            });
          });
        });
      });
    });
  });

  new CronJob('*/30 * * * *', function() {
    Playlist.getSyncedPlaylist(function(res) {
      if (res === undefined || res.length == 0)
        return;

      res.forEach(function(playlist) {
        if (playlist.syncImportedPlaylist == true) {
          playlist.importedPl.forEach(function(urlImportedPl) {
            downloadSongs(urlImportedPl, function(file, infos, url) {
              Playlist.isUrlAlreadyInPlaylist(playlist.name, url, function(itIs) {
                if (!itIs) {
                  addSongToPlaylist(file, infos, url, playlist.author_id, playlist.name, function(a) {
                    console.log('[ImportedURLSyncing] Song added to ' + playlist.name + ': ' + url);
                  });
                }
              });
            }, function(a) {

            });
          });
        }
      });
    });
  }, null, true, 'Europe/Paris');
};
