const EToCalculator = require('./api/eto-calculator');
const moment = require('moment-timezone');
//MongoDB
const ObjectID = require('mongodb').ObjectID;
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
//CONSTS
const U = 'undefined';
const TOPIC_TEMPLATE = ['topic', 'algorithm', 'object_id'];

mqtt_client.on('connect', function() {
	mqtt_client.subscribe('algorithm/evotranspiration-simple/+');
});

mqtt_client.on('message', function(topic, buffer) {
	var message = JSON.parse(buffer.toString());
	var topic_keys = {};
	var topic_values = topic.split('/');
	TOPIC_TEMPLATE.forEach(function(t, i) {
		topic_keys[t] = topic_values[i];
	});
	topic_keys.object_id = new ObjectID(topic_keys.object_id);
	mongodb_client.connect(mongodb_url, function(error, db) {
		if (error) throw error;
		db
			.collection('data')
			.findOne({ _id: topic_keys.object_id }, function(error, data) {
				if (error) throw error;
				data.etc = data.et0*data.kc;
				mqtt_client.publish('daily/'+data.mac,JSON.stringify({
					mac:data.mac,
					etc:data.etc
				}),{qos:2},function(error){
					if (error) return console.error('DAILY');
					console.log('DAILY');
				});
				console.log('SAVING');
				console.log(data);
				db.collection('data').save(data);
				var last = {};
				for (k in data) {
					if (['_last'].indexOf(k) === 0) continue;
					last[k] = data[k];
				}
				console.log(last);
				db
				.collection('items')
				.updateOne({ mac: data.mac }, { $set: { _data: last } });
				db.close();
			})
		;
	});
});
