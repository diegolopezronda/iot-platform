//MongoDB
const mongodb_client = require('mongodb').MongoClient;
const mongodb_config = require('./config/mongodb');
const mongodb_url =
	'mongodb://' +
	mongodb_config.host +
	':' +
	mongodb_config.port +
	'/' +
	mongodb_config.database;
const COLLECTION = 'comments';
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);

mqtt_client.on('connect', function() {
	mqtt_client.subscribe('comment/sent/+');
	mqtt_client.subscribe('comment/saved/+/+');
});

mqtt_client.on('message', function(topic, buffer) {
	var data = JSON.parse(buffer.toString());
	var topic_array = topic.split('/');
	console.log(topic_array);
	topic_array.shift();
	var request = topic_array[0];
	console.log(request);
	topic_array.shift();
	var mac = Number(topic_array[0]);
	switch (request) {
		case 'sent':
			console.log(data);
			data.old = false;
			mqtt_client.publish(
				'comment/published/' + data.mac,
				JSON.stringify(data)
			);
			var INSERT = data;
			mongodb_client.connect(mongodb_url, function(error, db) {
				if (error) return console.error(error);
				db.collection(COLLECTION).insert(INSERT, function(error, info) {
					db.close();
					if (error) return console.error(error);
					console.log('SAVED');
				});
			});
			return;
		case 'saved':
			topic_array.shift();
			var account = topic_array[0];
			console.log(account);
			var LIMIT = 10;
			var QUERY = { mac: data.mac };
			mongodb_client.connect(mongodb_url, function(error, db) {
				if (error) return console.error(error);
				db
					.collection(COLLECTION)
					.find(QUERY, { sort: [['_id', 'desc']], limit: LIMIT })
					.toArray(function(error, docs) {
						db.close();
						if (error) return console.error(error);
						var n = docs.length - 1;
						console.log(docs);
						for (var a = n; a > -1; a--) {
							var d = docs[a];
							d.old = true;
							mqtt_client.publish(
								'comment/published/' + d.mac + '/' + account,
								JSON.stringify(d)
							);
						}
					});
			});
			return;
		default:
		//Do Nothing
	}
});
