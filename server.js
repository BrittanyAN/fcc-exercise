const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Exercise Tracker
// Edits begin here

// Schema and model for user
var Schema = mongoose.Schema;

var exerciseSchema = new Schema({
    description: String,
    duration: Number,
    date: Date
  });
var userSchema = new Schema({
  username: {type: String, unique: true}, // Usernames must be unique
  exercise: [exerciseSchema]
}, {
  usePushEach: true
});
var User = mongoose.model('User', userSchema);
    
// Check and create new user
app.post('/api/exercise/new-user', function(req, res) {
  let name = req.body.username;
  
  User.findOne({username: name}, function(err, data) {
    if (data == null) {
      User.create({username: name}, function(err, doc) {
        res.json({username: name, _id: doc._id});
      });
    } else {
      res.send("Username already taken.");
    }
  });
});


// Update valid user with new exercise
app.post('/api/exercise/add', function(req, res) {
  let findId = req.body.userId;
  let desc = req.body.description;
  let dur = req.body.duration;
  let date = req.body.date == '' ? new Date() : new Date(req.body.date);

  User.findOne({_id: findId}, function(err, data) {

    if (data == null) {
      res.send("User ID not valid.");
    } else if (desc == null || dur == null) {
      res.send("Must submit valid exercise description and duration.");         
    } else {
      if (date == null) {
        date = new Date();
      }
      data.exercise.push({
        description: desc,
        duration: dur,
        date: date
      });
      data.save(function(err) {
        if (err) { console.log(err); }
        res.json({username: data.username, description: desc, duration: dur, _id: data._id, date: date.toDateString()});
      });
      
    }
  });
});

// Use query to find and display exercise info
app.get('/api/exercise/log', function(req, res) {
  let findId = req.query.userId;
  let findFrom = !req.query.from ? new Date(0) : new Date(req.query.from);
  let findTo = !req.query.to ? new Date() : new Date(req.query.to);
  let findLimit = !req.query.limit ? 10 : req.query.limit; // Sets maximum limit to 10 when a limit is not specified in query
  
  User.findById(findId).limit(findLimit).where('exercise.date').gte(findFrom).lte(findTo).exec(function(err, data) {
    if (err || data == null) {
      console.log(err);
      res.send("Invalid ID or range.");
    } else {
      let log = data.exercise.map((d) => {
        let newD = {};
        newD.description = d.description;
        newD.duration = d.duration;
        newD.date = d.date.toDateString();
        return newD;
      }) // Use to format log to display

      res.json({_id: findId, username: data.name, count: data.exercise.length, log: log});
    }
  });
  
})

// Edits end here


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

