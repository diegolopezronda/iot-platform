//MongoDB
const moment = require('moment-timezone');
const mongodb_client = require('mongodb').MongoClient;
const mongodb_config = require('./config/mongodb');
const mongodb_url =
	'mongodb://' +
	mongodb_config.host +
	':' +
	mongodb_config.port +
	'/' +
	mongodb_config.database;
const EVENT_COLLECTION = 'events';
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);
//DAILY
mqtt_client.on('connect', function() {
	mqtt_client.subscribe('behaviours');
});

mqtt_client.on('message', function(topic, buffer) {
	var message = JSON.parse(buffer);
	console.log(message);
	mongodb_client.connect(mongodb_url, function(error, db) {
		db.collection('behaviours').insert(message, function(error, info) {
			if (error) {
				db.close();
				console.error('PSYSCHO.UPDATE');
				return;
			}
			console.log('PSYCHO.UPDATE');
			db.close();
		});
	});
});
