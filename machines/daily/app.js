//DAILY
const TIMEZONES_QUERY = 
	"SELECT id_timezone,name_timezone FROM timezone ORDER BY id_timezone ASC;"
;
const RUNTIME = {
};
const STATS = ["lst", "fst", "cnt", "max", "min", "sum", "avg"];
//MySQL
const mysql_config = require("./config/mysql");
const mysql = require("mysql2");
const mysql_connection = mysql.createConnection(mysql_config);
//MongoDB
const moment = require("moment-timezone");
const mongodb_client = require("mongodb").MongoClient;
const mongodb_config = require("./config/mongodb");
const mongodb_url =
	"mongodb://" +
	mongodb_config.host +
	":" +
	mongodb_config.port +
	"/" +
	mongodb_config.database;
const EVENT_COLLECTION = "events";
//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config);

mqtt_client.on("connect", function() {
	mysql_connection.query(TIMEZONES_QUERY,function(error,rows,fields){
		RUNTIME.timezones = rows;
		mqtt_client.subscribe("daily/+");
	});
});

mqtt_client.on("message", function(topic, buffer) {
	var message = JSON.parse(buffer);
	console.log(message);
	var KPI = [];
	for (kpi in message) {
		if (typeof message[kpi] != "number" && typeof message[kpi] != "boolean")
			continue;
		if (kpi === "mac") continue;
		if (kpi === "latitude") continue;
		if (kpi === "longitude") continue;
		if (kpi.indexOf("_") === 0) continue;
		KPI.push(kpi);
	}
	if (KPI.length === 0) return;
	mongodb_client.connect(mongodb_url, function(error, db) {
		if (error) throw error;
		db
			.collection("items")
			.findOne(
				{ mac: message.mac },
				{ _id: 0, name_timezone: 1, mac: 1 ,id_timezone:1},
				function(error, item) {
					if (error) {
						db.close();
						console.error("ITEMS.ERROR");
						return;
					}
					if (item === null) {
						db.close();
						console.error("ITEMS.NULL");
						return;
				}
					var name_timezone = 
						RUNTIME.timezones[item.id_timezone-1].name_timezone
					;
					console.log(name_timezone);
					var day = new Date(
						moment()
							.tz(name_timezone)
							.startOf("day")
							.toDate()
					);
					var id = {
						mac: item.mac,
						day: day
					};
					db
						.collection("daily_data")
						.findOne({ id: id }, function(error, daily) {
							if (error) {
								db.close();
								console.error("DAILY.FIND");
								return;
							}
							var insert = {
								id: id
							};
							if (undefined === daily || daily === null) {
								daily = {};
							}

							KPI.forEach(function(kpi) {
								var old = daily[kpi];
								insert[kpi] = {};
								if (undefined === old || old === null) {
									old = {};
								}
								var neo = Number(message[kpi]);
								if (undefined === neo || neo === null) {
									neo = 0;
								}
								STATS.forEach(function(s) {
									switch (s) {
										case "lst":
											if (undefined === old[s] || old[s] === null) old[s] = 0;
											insert[kpi][s] = neo;
											break;
										case "fst":
											if (undefined === old[s] || old[s] === null) old[s] = neo;
											insert[kpi][s] = old[s];
											break;
										case "cnt":
											if (undefined === old[s] || old[s] === null) old[s] = 0;
											++old[s];
											insert[kpi][s] = old[s];
											break;
										case "max":
											if (undefined === old[s] || old[s] === null) old[s] = neo;
											insert[kpi][s] = Math.max(neo, old[s]);
											break;
										case "min":
											if (undefined === old[s] || old[s] === null) old[s] = neo;
											insert[kpi][s] = Math.min(neo, old[s]);
											break;
										case "sum":
											if (undefined === old[s] || old[s] === null) old[s] = 0;
											insert[kpi][s] = old[s] + neo;
											break;
										case "avg":
											if (undefined === old[s] || old[s] === null) old[s] = 0;
											insert[kpi][s] = insert[kpi].sum / insert[kpi].cnt;
											break;
										default:
									}
								});
							});
							db.collection("daily_data").findOne(
								{
									"id.mac": id.mac,
									"id.day": { $lt: id.day }
								},
								{
									sort: { "id.day": -1 },
									project: { _last: 0 }
								},
								function(error, doc) {
									if (error) {
										db.close();
										console.error("DAILY.UPDATE");
										return;
									}
									if(doc != null) delete doc._last;
									insert._last = doc;
									db
										.collection("daily_data")
										.update(
											{ id: id },
											{ $set: insert },
											{ upsert: true },
											function(error, info) {
												if (error) {
													db.close();
													console.error("DAILY.UPDATE");
													return;
												}
												console.log("DAILY.UPDATE");
												db.close();
											}
										);
								}
							);
						});
				}
			);
	});
});
