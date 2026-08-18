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
	mqtt_client.subscribe('algorithm/total-moisture/+');
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
			.findOne({ _id: topic_keys.object_id }, function(error, doc) {
				delete doc.total_moisture;
				var total_moisture = 0;
				for (k in doc) {
					if (k.indexOf('_moisture') === -1) continue;
					total_moisture += doc[k];
				}
				doc.total_moisture = total_moisture;
				mqtt_client.publish('daily/'+data.mac,JSON.stringify({
					mac:data.mac,
					total_moisture:total_moisture
				}),{qos:2},function(error){
					if (error) return console.error('DAILY');
					console.log('DAILY');
				});
				console.log('SAVING');
				console.log(doc);
				db.collection('data').save(doc);
				var last = {};
				for (k in doc) {
					if (['_last'].indexOf(k) === 0) continue;
					last[k] = doc[k];
				}
				console.log(last);
				db
					.collection('items')
					.updateOne({ mac: doc.mac }, { $set: { _data: last } });
				db.close();
			});
	});
});
