module.exports = function(app, passport, lang) {
    // normal routes ===============================================================

    // show the home page (will also have our login links)
    app.get('/', function(req, res, next) {
        if (!req.isAuthenticated())
            return next();

        res.redirect('/myPlaylists');
    }, function(req, res) {
        res.render('pages/index.ejs', {
            lang: lang
        });
    });

    // PLAYLIST SECTION ========================
    app.get('/myPlaylists', isLoggedIn, function(req, res) {
        res.render('pages/myPlaylists.ejs', {
            lang: lang
        });
    });

    app.get('/allPlaylists', isLoggedIn, function(req, res) {
        res.render('pages/allPlaylists.ejs', {
            lang: lang
        });
    });

    app.get('/playlist/', isLoggedIn, function(req, res) {
        if (req.query.name)
            res.render('pages/playlist.ejs', {
                name: req.query.name,
                lang: lang,
                masterVol: req.session.masterVol
            });
        else
            res.redirect('/myPlaylists');
    });

    app.get('/music/', isLoggedIn, function(req, res) {
        if (req.query.id)
            res.render('pages/editMusic.ejs', {
                name: req.query.id,
                lang: lang,
                masterVol: req.session.masterVol
            });
        else
            res.redirect('/myPlaylists');
    });

    // PROFILE SECTION =========================
    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('pages/profile.ejs', {
            user: req.user,
            lang: lang
        });
    });

    // LOGOUT ==============================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });

    // =============================================================================
    // AUTHENTICATE (FIRST LOGIN) ==================================================
    // =============================================================================

    // locally --------------------------------
    // LOGIN ===============================
    // show the login form
    app.get('/login', function(req, res) {
        res.render('pages/login.ejs', {
            message: req.flash('loginMessage'),
            lang: lang
        });
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/login', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // SIGNUP =================================
    // show the signup form
    app.get('/signup', function(req, res) {
        res.render('pages/signup.ejs', {
            message: req.flash('signupMessage'),
            lang: lang
        });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/signup', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // spotify -------------------------------

    // send to spotify to do the authentication
    app.get('/auth/spotify', passport.authenticate('spotify'));

    // handle the callback after spotify has authenticated the user
    app.get('/auth/spotify/callback',
        passport.authenticate('spotify', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    // deezer --------------------------------

    // send to deezer to do the authentication
    app.get('/auth/deezer', passport.authenticate('deezer'));

    // handle the callback after deezer has authenticated the user
    app.get('/auth/deezer/callback',
        passport.authenticate('deezer', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));


    // youtube ---------------------------------

    // send to youtube to do the authentication
    app.get('/auth/youtube', passport.authenticate('youtube'));

    // the callback after youtube has authenticated the user
    app.get('/auth/youtube/callback',
        passport.authenticate('youtube', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    // =============================================================================
    // AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
    // =============================================================================

    // locally --------------------------------
    app.get('/connect/local', function(req, res) {
        res.render('pages/connect-local.ejs', {
            message: req.flash('loginMessage'),
            lang: lang
        });
    });

    app.post('/connect/local', passport.authenticate('local-signup', {
        successRedirect: '/profile', // redirect to the secure profile section
        failureRedirect: '/connect/local', // redirect back to the signup page if there is an error
        failureFlash: true // allow flash messages
    }));

    // spotify -------------------------------

    // send to spotify to do the authentication
    app.get('/connect/spotify', passport.authorize('spotify'));

    // handle the callback after spotify has authorized the user
    app.get('/connect/spotify/callback',
        passport.authorize('spotify', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    // deezer --------------------------------

    // send to deezer to do the authentication
    app.get('/connect/deezer', passport.authorize('deezer'));

    // handle the callback after deezer has authorized the user
    app.get('/connect/deezer/callback',
        passport.authorize('deezer', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));


    // youtube ---------------------------------

    // send to youtube to do the authentication
    app.get('/connect/youtube', passport.authorize('youtube'));

    // the callback after youtube has authorized the user
    app.get('/connect/youtube/callback',
        passport.authorize('youtube', {
            successRedirect: '/profile',
            failureRedirect: '/'
        }));

    // =============================================================================
    // UNLINK ACCOUNTS =============================================================
    // =============================================================================
    // used to unlink accounts. for social accounts, just remove the token
    // for local account, remove username and password
    // user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', isLoggedIn, function(req, res) {
        var user = req.user;
        user.local.username = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

    // spotify -------------------------------
    app.get('/unlink/spotify', isLoggedIn, function(req, res) {
        var user = req.user;
        user.spotify.token = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

    // deezer --------------------------------
    app.get('/unlink/deezer', isLoggedIn, function(req, res) {
        var user = req.user;
        user.deezer.token = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

    // youtube ---------------------------------
    app.get('/unlink/youtube', isLoggedIn, function(req, res) {
        var user = req.user;
        user.youtube.token = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });


};

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}
