// load all the things we need
var LocalStrategy = require('passport-local').Strategy;
var DeezerStrategy = require('passport-deezer').Strategy;
var YoutubeV3Strategy = require('passport-youtube-v3').Strategy;
var SpotifyStrategy = require('passport-spotify').Strategy;
//var SoundCloudStrategy = require('passport-soundcloud').Strategy;

// load up the user model
var mongoose = require('mongoose');
var User = require('../app/models/user');

module.exports = function(passport, lang, configAuth) {

  // =========================================================================
  // passport session setup ==================================================
  // =========================================================================
  // required for persistent login sessions
  // passport needs ability to serialize and unserialize users out of session

  // used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  // used to deserialize the user
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  // =========================================================================
  // LOCAL LOGIN =============================================================
  // =========================================================================
  passport.use('local-login', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with username
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, username, password, done) {
      if (username)
        username = username.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

      // asynchronous
      process.nextTick(function() {
        User.findOne({
          'local.username': username
        }, function(err, user) {
          // if there are any errors, return the error
          if (err)
            return done(err);

          // if no user is found, return the message
          if (!user)
            return done(null, false, req.flash('loginMessage', lang.passport.noUserFound));

          if (!user.validPassword(password))
            return done(null, false, req.flash('loginMessage', lang.passport.wrongPassword));

          // all is well, return user
          else
            return done(null, user);
        });
      });

    }));

  // =========================================================================
  // LOCAL SIGNUP ============================================================
  // =========================================================================
  passport.use('local-signup', new LocalStrategy({
      // by default, local strategy uses username and password, we will override with username
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, username, password, done) {
      if (username)
        username = username.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

      // asynchronous
      process.nextTick(function() {
        // if the user is not already logged in:
        if (!req.user) {
          User.findOne({
            'local.username': username
          }, function(err, user) {
            // if there are any errors, return the error
            if (err)
              return done(err);

            // check to see if theres already a user with that username
            if (user) {
              return done(null, false, req.flash('signupMessage', lang.passport.usernameAlreadyTaken));
            } else {

              // create the user
              var newUser = new User();

              newUser._id = mongoose.Types.ObjectId();
              newUser.local.username = username;
              newUser.local.password = newUser.generateHash(password);

              newUser.save(function(err) {
                if (err)
                  return done(err);

                return done(null, newUser);
              });
            }

          });
          // if the user is logged in but has no local account...
        } else if (!req.user.local.username) {
          // ...presumably they're trying to connect a local account
          // BUT let's check if the username used to connect a local account is being used by another user
          User.findOne({
            'local.username': username
          }, function(err, user) {
            if (err)
              return done(err);

            if (user) {
              return done(null, false, req.flash('loginMessage', lang.passport.usernameAlreadyTaken));
              // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
            } else {
              var user = req.user;
              user.local.username = username;
              user.local.password = user.generateHash(password);
              user.save(function(err) {
                if (err)
                  return done(err);

                return done(null, user);
              });
            }
          });
        } else {
          // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
          return done(null, req.user);
        }

      });

    }));

  // =========================================================================
  // SPOTIFY =================================================================
  // =========================================================================
  passport.use(new SpotifyStrategy(configAuth.spotifyAuth,
    function(req, token, refreshToken, profile, done) {

      // asynchronous
      process.nextTick(function() {

        // check if the user is already logged in
        if (!req.user) {

          User.findOne({
            'spotify.id': profile.id
          }, function(err, user) {
            if (err)
              return done(err);

            if (user) {

              // if there is a user id already but no token (user was linked at one point and then removed)
              if (!user.spotify.token) {
                user.spotify.token = token;
                user.spotify.username = profile.username;
                user.spotify.email = profile.emails[0].value;
                user.spotify.profileUrl = profile.profileUrl;

                user.save(function(err) {
                  if (err)
                    return done(err);

                  return done(null, user);
                });
              }
              return done(null, user);
            } else {
              var newUser = new User();

              newUser._id = mongoose.Types.ObjectId();
              newUser.spotify.id = profile.id;
              newUser.spotify.token = token;
              newUser.spotify.username = profile.username;
              newUser.spotify.email = profile.emails[0].value;
              newUser.spotify.profileUrl = profile.profileUrl;

              newUser.save(function(err) {
                if (err)
                  return done(err);

                return done(null, newUser);
              });
            }
          });
        } else {
          var user = req.user;

          user.spotify.id = profile.id;
          user.spotify.token = token;
          user.spotify.username = profile.username;
          user.spotify.email = profile.emails[0].value;
          user.spotify.profileUrl = profile.profileUrl;

          user.save(function(err) {
            if (err)
              return done(err);

            return done(null, user);
          });
        }
      });
    }
  ));

  // =========================================================================
  // DEEZER ==================================================================
  // =========================================================================
  passport.use(new DeezerStrategy(configAuth.deezerAuth,
    function(req, token, refreshToken, profile, done) {

      // asynchronous
      process.nextTick(function() {

        // check if the user is already logged in
        if (!req.user) {

          User.findOne({
            'deezer.id': profile.id
          }, function(err, user) {
            if (err)
              return done(err);

            if (user) {

              // if there is a user id already but no token (user was linked at one point and then removed)
              if (!user.deezer.token) {
                user.deezer.token = token;
                user.deezer.username = profile.displayName;
                user.deezer.email = profile.emails[0].value;
                user.deezer.profileUrl = profile._json.link;

                user.save(function(err) {
                  if (err)
                    return done(err);

                  return done(null, user);
                });
              }
              return done(null, user);
            } else {
              var newUser = new User();

              newUser._id = mongoose.Types.ObjectId();
              newUser.deezer.id = profile.id;
              newUser.deezer.token = token;
              newUser.deezer.username = profile.displayName;
              newUser.deezer.profileUrl = profile._json.link;
              newUser.deezer.email = profile.emails[0].value;

              newUser.save(function(err) {
                if (err)
                  return done(err);

                return done(null, newUser);
              });
            }
          });
        } else {
          var user = req.user;

          user.deezer.id = profile.id;
          user.deezer.token = token;
          user.deezer.username = profile.displayName;
          user.deezer.email = profile.emails[0].value;
          user.deezer.profileUrl = profile._json.link;

          user.save(function(err) {
            if (err)
              return done(err);

            return done(null, user);
          });
        }
      });
    }
  ));

  // =========================================================================
  // YOUTUBE =================================================================
  // =========================================================================
  passport.use(new YoutubeV3Strategy(configAuth.youtubeAuth,
    function(req, token, refreshToken, profile, done) {
      // asynchronous
      process.nextTick(function() {

        // check if the user is already logged in
        if (!req.user) {

          User.findOne({
            'youtube.id': profile.id
          }, function(err, user) {
            if (err)
              return done(err);

            if (user) {

              // if there is a user id already but no token (user was linked at one point and then removed)
              if (!user.youtube.token) {
                user.youtube.token = token;
                user.youtube.displayName = profile.displayName;

                user.save(function(err) {
                  if (err)
                    return done(err);

                  return done(null, user);
                });
              }

              return done(null, user);
            } else {
              var newUser = new User();

              newUser._id = mongoose.Types.ObjectId();
              newUser.youtube.id = profile.id;
              newUser.youtube.token = token;
              newUser.youtube.displayName = profile.displayName;

              newUser.save(function(err) {
                if (err)
                  return done(err);

                return done(null, newUser);
              });
            }
          });
        } else {
          var user = req.user;

          user.youtube.id = profile.id;
          user.youtube.token = token;
          user.youtube.displayName = profile.displayName;

          user.save(function(err) {
            if (err)
              return done(err);

            return done(null, user);
          });
        }
      });
    }
  ));
};
