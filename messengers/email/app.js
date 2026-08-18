//MQTT
const fs = require('fs');
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);

const U = 'undefined';
//nodemailer
const nodemailer = require('nodemailer');
const nodemailer_config = require('./config/nodemailer');
var transport = nodemailer.createTransport(nodemailer_config);
/*
var transport = nodemailer.createTransport(
'smtp://no-reply:vDlq60*9@smtp.sensum.co.nz/?pool=true&tls={rejectUnauthorized:false}'
);
*/
	mqtt_client.on('connect', function() {
		mqtt_client.subscribe('email/+');
	});

	mqtt_client.on('message', function(topic, buffer) {
		var data = JSON.parse(buffer.toString());
		var topic_array = topic.split('/');
		var template = topic_array[1];
		fs.readFile(
			__dirname + '/config/mail_templates/' + template + '.html',
			function(error, html) {
				if (error) {
					return console.error('TEMPLATE ERROR.');
				}
				var options = {
					from: data.from + ' Helpdesk <no-reply@' + data.domain + '>',
					to: data.to,
					subject: data.subject,
					text: '',
					html: html.toString(),
				};
				for (p in data.params) {
					var regex = new RegExp('\\*\\|' + p.toUpperCase() + '\\|\\*', 'g');
					if (data.params[p] === null) {
						data.params[p] = '';
						console.log('MISSING PARAM: ' + p);
					}
					options.html = options.html.replace(regex, data.params[p].toString());
				}
				transport.sendMail(options, function(error, info) {
					if (error) {
						console.log(data);
						return console.error(error);
					}
					console.log('MAIL SENT TO'+data.to);
				});
			}
		);
	});

console.log('Attempting to connect to e-mail');
transport.verify(function(error, success) {
	if (error) {
		console.log(error);
	} else {
		console.log('Server is ready to take our messages');
	}
});

