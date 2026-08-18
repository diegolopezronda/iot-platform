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
	mqtt_client.subscribe('algorithm/daily-chill-hours/+');
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
						//First, group temperatures per hour. 
						var hours = {};						
						docs.forEach(function(d) {
							var timestamp = d._hour.getTime();
							if(
								undefined === hours[timestamp.toString()] ||
								hours[timestamp.toString()] === null
							){
								hours[timestamp.toString()] = [];
							}
							hours[timestamp.toString()].push(d.temperature);
						});	
						//Then, we give Cold Units, using UTAH model.
						var daily_chill_hours = 0;
						for(h in hours){
							//Calculate the average temperature per hour.
							var avg = 0;
							hours[h].forEach(function(t,i){
								avg += t;
							});
							avg = avg/hours[h].length;
							//Comparing and assigning points.
							if(avg < 0){
								daily_chill_hours += 0.0;
								continue;
							}
							if(avg >= 1 && avg <= 2){
								daily_chill_hours += 0.5;
								continue;
							}
							if(avg >= 3 && avg <= 9){
								daily_chill_hours += 1.0;
								continue;
							}
							if(avg >= 10 && avg <= 12){
								daily_chill_hours += 0.5;
								continue;
							}
							if(avg >= 13 && avg <= 15){
								daily_chill_hours += 0.0;
								continue;
							}
							if(avg >= 16 && avg <= 18){
								daily_chill_hours -= 0.5;
								continue;
							}
							if(avg > 19){
								daily_chill_hours -= 1.0;
								continue;
							}
						}
						data.daily_chill_hours = daily_chill_hours;
						mqtt_client.publish('daily/'+data.mac,JSON.stringify({
							mac:data.mac,
							daily_chill_hours:daily_chill_hours
						}),{qos:2},function(error){
							if (error) return console.error('DAILY');
							console.log('DAILY');
						});
						console.log('SAVING');
						db.collection('data').save(data);
						var last = {};
						for (k in data) {
							if (['_last'].indexOf(k) === 0) continue;
							last[k] = data[k];
						}
						db
							.collection('items')
							.updateOne({ mac: data.mac }, { $set: { _data: last } });
						db.close();
					});
			});
	});
});
