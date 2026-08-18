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
	mqtt_client.subscribe('virtual-data/+');
});

mqtt_client.on('message', function(topic, buffer) {
	var message = JSON.parse(buffer);
	console.log("MAC | "+message.mac);
	mongodb_client.connect(
		mongodb_url,
		function(error, db) {
			if (error) throw error;
			db.collection('items')
				.find({
					'schema_item.external_array': { $elemMatch: { item: message.mac } }
				})
				.toArray(function(error, docs) {
					db.close();
					if (error) {
						console.error('ITEMS.ERROR');
						return;
					}
					console.log(docs.length);
					docs.forEach(function(d, i) {
						console.log(d);
						var external_message = {};
						external_message.mac = d.mac;
						external_message._date = Date.now();
						if(undefined === d._data || d._data === null) d._data = {};
						for (x in d.schema_item.external) {
							var c = d.schema_item.external[x];
							if (c.item === message.mac) {
								external_message[x] = message[c.attribute];
								continue;
							}
							if(undefined === d._data[x]) d._data[x] = null;
							external_message[x] = d._data[x];
						}
						external_message.rssi = 0;
						external_message.snr = 20;
						external_message.sf = 10;
						mqtt_client.publish("data/"+d.mac, JSON.stringify(external_message));
					});
				});
		}
	);
});
