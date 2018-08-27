const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const stylus = require('stylus');

const app = express();
require('dotenv').config({ path: '.env.' + app.get('env') });

const index = require('./routes/index');
const claims = require('./routes/claims');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: process.env.COOKIE_SECRET,
  cookie: { maxAge: 60000 }
}));
app.use(flash());
app.use(stylus.middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(__dirname + '/node_modules'));

app.use('/', index);
app.use('/claims', claims);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  console.error(err)

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // set nis error messages
  res.locals.errorBody = err.response ? err.response.body : err;
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
