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
const EVENT_COLLECTION = 'schedules';
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);
//TIME
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const INTERVAL_DURATION = MINUTE;
const DB_SUCCESS = 'Connected to database, fetching events...';
const DB_ERROR = 'Error trying to connect database.';
const COLLECTION_SUCCESS = 'Events fetched, triggering...';
const COLLECTION_ERROR = 'Error trying to connect collection.';
const WEEK_DAYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday'
];

class SchedulerApp {
	constructor(mqtt_client, mongodb_client, mongodb_url) {
		var _this = this;
		this.MQTT_CLIENT = mqtt_client;
		this.mongodb_client = mongodb_client;
		this.mongodb_url = mongodb_url;
		console.log('Eureka');
		do {
			var now = new Date().getSeconds();
		} while (now !== 0);
		_this.triggerEvents();
		setInterval(function() {
			_this.triggerEvents();
		}, MINUTE);
	}
	triggerEvents() {
		var _this = this;
		this.mongodb_client.connect(
			_this.mongodb_url,
			function(error, db) {
				var CURRENT_DATE = new Date();
				CURRENT_DATE.setMilliseconds(0);
				CURRENT_DATE.setSeconds(0);
				var CURRENT_TIME = CURRENT_DATE.getTime();
				console.log(CURRENT_DATE.toISOString());
				var query = {
					$or: [
						{
							start_date_event: CURRENT_DATE
						},
						{
							is_repeat_event: true,
							start_date_event: { $lt: CURRENT_DATE },
							$or: [
								{ is_forever_event: true },
								{ end_date_event: { $gte: CURRENT_DATE } }
							]
						}
					]
				};
				query.$or[1][
					'is_' + WEEK_DAYS[CURRENT_DATE.getDay()] + 'day_event'
				] = true;
				if (error) return console.error(DB_ERROR);
				db.collection(EVENT_COLLECTION)
					.find(query)
					.toArray(function(error, docs) {
						db.close();
						if (error) return console.error(COLLECTION_ERROR);
						docs.forEach(function(d, i) {
							if (d.is_repeat_event === true) {
								var DIFF = CURRENT_TIME - d.start_date_event.getTime();
								var MOD = DIFF % d.interval_event;
								if (MOD !== 0) return;
							}
							var CONTROL = JSON.parse(JSON.stringify(d.control_event));
							var MAC = CONTROL.mac;
							var MESSAGE = {
								control_schema: {
									control: CONTROL.name,
									key: CONTROL.key,
									label: CONTROL.label,
									description: CONTROL.description,
									ip: 'sensum.co.nz',
									originator: 0,
									hash: CONTROL.hash,
									is_report: false
								},
								data: CONTROL.message
							};
							if (CONTROL.report === true) {
								var log = JSON.parse(JSON.stringify(MESSAGE));
								log.control_schema.is_report = true;
								var REPORT = JSON.stringify({
									control: CONTROL,
									log: log
								});
								mqtt_client.publish(
									'report/' + MAC,
									REPORT,
									{ qos: 1 },
									function(error) {
										if (error) console.error(error);
									}
								);
								console.log('Reporting ' + MAC + '...');
							} else {
								mqtt_client.publish(
									'control/' + MAC,
									JSON.stringify(MESSAGE),
									{ qos: 1 },
									function(error) {
										if (error) console.error(error);
									}
								);
								console.log('Controlling ' + MAC + '...');
							}
						});
					});
			}
		);
	}
}

var schedulerApp = new SchedulerApp(mqtt_client, mongodb_client, mongodb_url);

module.exports = schedulerApp;
