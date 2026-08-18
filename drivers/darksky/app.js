//C
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const INTERVAL = 1 * HOUR;
//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config);
const TOPIC = "data/";
//MYSQL
const mysql = require("mysql2");
const mysql_config = require("./config/mysql");
const mysql_client = mysql.createConnection(mysql_config);
const query =
	"SELECT mac_item,latitude_item,longitude_item " +
	"FROM items_view " +
	"WHERE " +
	"id_asset = 40";
//Forecast
const forecast = require("forecast");
const forecast_config = require("./config/forecast");
const forecast_client = new forecast(forecast_config);
function getForecasts() {
	mysql_client.query(query, function(error, rows, fields) {
		if (error) return console.error(error);
		rows.forEach(function(r) {
			currentForecast(r);
		});
	});
}
function currentForecast(r) {
	forecast_client.get([r.latitude_item, r.longitude_item], function(
		error,
		weather
	) {
		if (error) return console.error(error);
		var insert = {};
		for (k in weather.currently) {
			var j = lowerSpace(k);
			insert[j] = weather.currently[k];
		}
		insert.today_summary = weather.hourly.summary;
		insert.today = weather.hourly.data;
		insert.today_frost = 0;
		weather.hourly.data.forEach(function(t) {
			if (t.temperature < 0) {
				++insert.today_frost;
			}
		});
		insert.weekly_summary = weather.daily.summary;
		insert.weekly = weather.daily.data;
		insert.weekly_frost = 0;
		weather.daily.data.forEach(function(t) {
			if (t.minTemperature < 0) {
				++insert.weekly_frost;
			}
		});
		//insert._date = insert.time;
		delete insert.time;
		insert.mac = r.mac_item;
		console.log(insert);
		mqtt_client.publish(TOPIC + insert.mac.toString(), JSON.stringify(insert), {
			qos: 2
		});
	});
}
function lowerSpace(k) {
	var output = "";
	k.split("").forEach(function(a, i) {
		var b = a.toLowerCase();
		var hyphen = b.charCodeAt(0) === a.charCodeAt(0) || i === 0 ? "" : "_";
		output += hyphen + b;
	});
	return output;
}
//Run
mqtt_client.on("connect", function() {
	getForecasts();
	var interval = setInterval(function() {
		getForecasts();
	}, INTERVAL);
});
