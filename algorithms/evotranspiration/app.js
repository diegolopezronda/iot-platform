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
	mqtt_client.subscribe('algorithm/evotranspiration/+');
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
				var now = moment().tz(data.timezone);
				console.log(data);
				var start = now
					.clone()
					.startOf('day')
					.toDate();
				var end = now
					.clone()
					.endOf('day')
					.toDate();
				db
					.collection('data')
					.find({ mac: data.mac, _date: { $gte: start, $lte: end } })
					.toArray(function(error, docs) {
						if (error) throw error;
						var T_max = null;
						var T_min = null;
						var RH_max = null;
						var RH_min = null;
						var H = data.height;
						var Z = data.altitude;
						var J = now.dayOfYear();
						var LAT = data.latitude;
						var Rs = 0;
						var U = 0;
						var P = 0;
						var G = 0;
						var len = docs.length;
						docs.forEach(function(d) {
							if (d.temperature > T_max || T_max === null)
								T_max = d.temperature;
							if (d.temperature < T_min || T_min === null)
								T_min = d.temperature;
							if (d.humidity > RH_max || RH_max === null) RH_max = d.humidity;
							if (d.humidity < RH_min || RH_min === null) RH_min = d.humidity;
							Rs += d.solar_irradance;
							U += d.wind_speed;
							P += d.pressure;
							G += d.soil_heat_flux_density;
						});
						Rs = Rs / len;
						U = U / len;
						U = U * (1000 / 3600);
						P = P / len;
						G = G / len;
						var U2 = H === 2 ? U : EToCalculator.U2(U, H);
						var ETo = EToCalculator.calculate(
							T_max,
							T_min,
							RH_max,
							RH_min,
							Rs,
							U2,
							P,
							Z,
							J,
							LAT
						);
						data.evotranspiration = ETo;
						mqtt_client.publish('daily/'+data.mac,JSON.stringify({
							mac:data.mac,
							evotranspiration:evotranspiration
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
					});
			});
	});
});
