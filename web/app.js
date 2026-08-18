var MQTT = require('mqtt');
var mqtt_config = require('./config/mqtt');
var mqtt_client = MQTT.connect(mqtt_config);
var multipart = require('connect-multiparty');
var expressLayouts = require('express-ejs-layouts');
var express = require('express');
var session = require('express-session');
var path = require('path');
//var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var index = require('./routes/index');
var users = require('./routes/users');
var mongodb = require('./routes/mongodb');
var mysql = require('./routes/mysql');
var mqtt = require('./routes/mqtt');
var services = require('./routes/services');
var passport = require('passport');
var passportConfig = require('./api/passportConfig');
var app = express();
app.use(multipart());
// view engine setup
app.use('/login', expressLayouts);
app.use('/dashboard', expressLayouts);
app.use('/api', expressLayouts);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'index');
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Router use
app.use(
	session({ secret: 'qwueyirtertoo', resave: false, saveUninitialized: false })
);
passportConfig(passport);
app.use(passport.initialize());
app.use(passport.session());
app.use('/', index);
app.use('/', users);
app.use('/mendelssohn/', mongodb);
app.use('/mozart/', mysql);
app.use('/bach/', mqtt);
app.use('/sallieri/',services);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
});
// error handler
app.use(function(err, req, res, next) {
	var message = JSON.stringify({
		user: req.user,
		error: err,
		query: req.query,
		params: req.params,
		url:req.originalUrl
	});
	mqtt_client.publish('sensum/monitor/error/web', message);
	console.error('APP.JS HAS CAUGHT AN ERROR.');
	console.error(err);
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};
	// render the error page
	req.logout();
	res.json({ error: 'FATAL_ERROR' });
	//res.status(err.status || 200);
	//res.render('error');
});
//Export
module.exports = app;
