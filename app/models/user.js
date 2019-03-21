// load the things we need
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt-nodejs');

// define the schema for our user model
var userSchema = mongoose.Schema({
  _id: Schema.Types.ObjectId,
  local: {
    username: String,
    password: String
  },
  spotify: {
    id: String,
    token: String,
    username: String,
    profileUrl: String,
    email: String
  },
  deezer: {
    id: String,
    token: String,
    username: String,
    profileUrl: String,
    email: String
  },
  youtube: {
    id: String,
    token: String,
    displayName: String
  }
});

// generating a hash
userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
