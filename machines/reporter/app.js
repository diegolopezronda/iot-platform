const RUNTIME = {
	mac: null,
	report: null,
	xml: null
};
//FTP
const ftp = require("ftp");
const fs = require("fs");
const ftp_client = new ftp();

ftp_client.on("error", function(e) {
	console.log("ERROR");
	RUNTIME.report.success = false;
	logEvent(RUNTIME.mac, RUNTIME.report);
});

ftp_client.on("ready", function() {
	console.log("READY");
	ftp_client.put(
		Buffer.from(RUNTIME.xml),
		Date.now().toString() +
			"_" +
			RUNTIME.mac.toString(16).toLowerCase() +
			"_" +
			".xml",
		function(err) {
			RUNTIME.report.success = true;
			if (err) {
				console.log(err);
				RUNTIME.report.success = false;
			}
			ftp_client.end();
			logEvent(RUNTIME.mac, RUNTIME.report);
		}
	);
});

ftp_client.on("end", function() {
	console.log("END");
});

ftp_client.on("close", function() {
	console.log("CLOSE");
});

//MongoDB
const mongodb_client = require("mongodb").MongoClient;
const mongodb_config = require("./config/mongodb");
const mongodb_url =
	"mongodb://" +
	mongodb_config.host +
	":" +
	mongodb_config.port +
	"/" +
	mongodb_config.database;
const EVENT_COLLECTION = "schedules";
//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config);
//XML
const xml = require("xml");
const moment = require("moment-timezone");
const DATA_DELIMITER = "_SENSUM_DATA";
const VALUE_DELIMITER = "$VALUE.";
const CONSTANT_DELIMITER = "$CONSTANT.";

mqtt_client.on("connect", function() {
	mqtt_client.subscribe("report/+");
	console.log("MQTT is waiting for a message...");
});

mqtt_client.on("message", function(topic, buffer) {
	var data_report = JSON.parse(buffer);
	if (data_report === null) return;
	var data = data_report.control;
	var mac = data.mac;
	var day = moment().tz("Pacific/Auckland");
	var day_start = day
		.clone()
		.startOf("day")
		.subtract(1, "day")
		.toDate();
	var day_end = day
		.clone()
		.endOf("day")
		.subtract(1, "day")
		.toDate();
	console.log(day_start);
	console.log(day_end);
	mongodb_client.connect(
		mongodb_url,
		function(error, client) {
			if (error) throw error;
			db = client.db("sensum");
			db.collection("data")
				.find(
					{
						mac: mac,
						_date: {
							$gte: day_start,
							$lte: day_end
						}
					},
					{
						sort: { _date: 1 }
					}
				)
				.toArray(function(error, docs) {
					RUNTIME.xml = parseXML(
						docs,
						data.message.format,
						data.message.params
					);
					RUNTIME.mac = mac;
					RUNTIME.report = JSON.parse(JSON.stringify(data_report.log));
					console.log(RUNTIME.xml);
					console.log("I'm here");
					ftp_client.connect(data.message.receiver);
					client.close();
				});
		}
	);
});

function logEvent(mac, log) {
	console.log(mac);
	console.log(log);
	log.label = "Hydrotel XML";
	log.description = "Hydrotel XML Report";
	mqtt_client.publish(
		"events/" + mac.toString(),
		JSON.stringify(log),
		{ qos: 2 },
		function(error) {
			if (error) console.error(error);
		}
	);
}

function parseXML(docs, template, params) {
	template.values = replaceContents(template.values, null, params);
	template.document = replaceContents(template.document, null, params);
	template.data = replaceContents(template.data, null, params);
	var output = JSON.parse(JSON.stringify(template.document));
	var lines = [];
	docs.forEach(function(r) {
		var values = {};
		for (var v in template.values) {
			var k = template.values[v];
			if (k === "_date") {
				var date = moment(r[k].getTime());
				var timestamp = date
					.clone()
					.tz("Pacific/Auckland")
					.format(template.timestamp);
				if (template.utc === true) {
					timestamp = date
						.clone()
						.utc()
						.format(template.timestamp);
				}
				values[v] = timestamp;
				continue;
			}
			values[v] = r[k];
			if (
				undefined === values[v] ||
				values[v] === null ||
				isNaN(values[v]) === true
			) {
				values[v] = 0;
			}
		}
		var data_format = JSON.parse(JSON.stringify(template.data));
		var data = replaceContents(data_format, values);
		lines.push(data);
	});
	output = insertData(output, lines);
	return xml(output, {
		declaration: true,
		indent: true
	});
}

function getClazz(alpha) {
	var beta = Object.prototype.toString
		.call(alpha)
		.toString()
		.replace(/\[object\s|\]/g, "")
		.toLowerCase();
	return beta;
}

function replaceContents(input, values, message) {
	if (undefined === values) values = null;
	if (Array.isArray(input) === true) {
		input.forEach(function(z, i) {
			input[i] = replaceContents(z, values, message);
		});
	} else {
		var k = getClazz(input);
		switch (k) {
			case "object":
				for (var i in input) {
					input[i] = replaceContents(input[i], values, message);
				}
				break;
			case "string":
				if (values === null) {
					if (input.indexOf(CONSTANT_DELIMITER) === 0) {
						input = message[input.replace(CONSTANT_DELIMITER, "")];
					}
				} else {
					if (input.indexOf(VALUE_DELIMITER) === 0) {
						input = values[input.replace(VALUE_DELIMITER, "")];
					}
				}
				break;
			default:
			//nothing
		}
	}
	return input;
}

function insertData(input, values) {
	if (Array.isArray(input) === true) {
		var index = null;
		input.forEach(function(z, i) {
			if (index != null) return;
			var t = getClazz(z);
			if (t === "object" && Object.keys(z).indexOf(DATA_DELIMITER) === 0) {
				index = i;
			} else {
				input[i] = insertData(z, values);
			}
		});
		if (index != null) {
			input.splice(index, 1);
			values.forEach(function(v, i) {
				input.splice(index, 0, v);
				++index;
			});
		}
	} else {
		var t = getClazz(input);
		switch (t) {
			case "object":
				for (var k in input) {
					input[k] = insertData(input[k], values);
				}
				break;
			default:
			//nothing
		}
	}
	return input;
}
