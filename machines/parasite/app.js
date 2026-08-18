//MYSQL
const mysql_config = require('./config/mysql.json');
const mysql = require('mysql2');
const connection = mysql.createConnection(mysql_config);
const QUERY = 'SELECT mac_item FROM items_view WHERE mac_parent_item = ';
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
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);

mqtt_client.on('connect', function() {
	mqtt_client.subscribe('parasite/+');
});

/*
49|ma-para | { snr: 28.8,
49|ma-para |   rssi: -86,
49|ma-para |   sf: 10,
49|ma-para |   _lora: '01088c0ead030e',
49|ma-para |   device_type: 1,
49|ma-para |   temperature: 21.88,
49|ma-para |   humidity: 37.57,
49|ma-para |   co2_concentration: 782,
49|ma-para |   lqi: 28.8,
49|ma-para |   _date: '2018-09-19T22:11:30.000Z',
49|ma-para |   mac: 2588045324866,
49|ma-para |   _valid: true,
49|ma-para |   _useful: true,
49|ma-para |   _hour: '2018-09-19T22:00:00.000Z',
49|ma-para |   _minute: '2018-09-19T22:11:00.000Z',
49|ma-para |   _last: 
49|ma-para |    { _date: '2018-09-19T22:10:30.000Z',
49|ma-para |      snr: 28,
49|ma-para |      rssi: -88,
49|ma-para |      sf: 10,
49|ma-para |      device_type: 1,
49|ma-para |      temperature: 21.900000000000002,
49|ma-para |      humidity: 37.57,
49|ma-para |      co2_concentration: 779,
49|ma-para |      lqi: 28,
49|ma-para |      mac: 58209910 },
49|ma-para |   _id: '5ba2c992346218688ec47815' }

*/

mqtt_client.on('message', function(topic, buffer) {
	var data = JSON.parse(buffer.toString());
	var mac = data.mac;
	var q = QUERY + mac;
	console.log('MAC #' + mac);
	connection.query(q, function(error, rows, fields) {
		if (error) {
			console.log(error);
			return;
		}
		rows.forEach(function(r) {
			var message = JSON.parse(JSON.stringify(data));
			message.mac = r.mac_item;
			var date = moment(message._date, 'YYYY-MM-DDThh:mm:ss.SSSZ').valueOf();
			for (k in message) {
				if (k.indexOf('_') === 0 && ['_lora', '_sigfox'].indexOf(k) === -1) {
					delete message[k];
				}
			}
			message._date = date;
			message._parasite = true;
			console.log(message);
			mqtt_client.publish("data/"+message.mac, JSON.stringify(message));
		});
	});
});
