// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var app = express();
var port = process.env.PORT || 8880;
var server = require('http').Server(app);
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var fs = require('fs');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var lang = require('./lang/fr_FR');

var configDB = require('./config/database');

// load the auth variables
var configAuth = require('./config/auth');

process.setMaxListeners(0);

// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database
if (!fs.existsSync('./public/musics'))
  fs.mkdirSync('./public/musics');
if (!fs.existsSync('./public/playlists'))
  fs.mkdirSync('./public/playlists');

require('./config/passport')(passport, lang, configAuth); // pass passport for configuration

// Set up the Session middleware using a MongoDB session store
var sessionMiddleware = session({
  name: "dubbatransitek",
  secret: "uhhhmdonuts",
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  resave: true,
  saveUninitialized: true
})

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({
  extended: true
}));

app.set('view engine', 'ejs'); // set up ejs for templating

// required for passport
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session
app.use('/public', express.static('public'));
var io = require('socket.io')(server).use(function(socket, next) {
  // Wrap the express middleware
  sessionMiddleware(socket.request, {}, next);
})

// routes ======================================================================
require('./app/routes')(app, passport, lang); // load our routes and pass in our app and fully configured passport
require('./app/core')(io, lang, configAuth); // playlist things

// launch ======================================================================
server.listen(port);
console.log('La magie opère sur le port ' + port);
