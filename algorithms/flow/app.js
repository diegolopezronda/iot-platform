//MongoDB
const ObjectID = require("mongodb").ObjectID;
const mongodb_client = require("mongodb").MongoClient;
const mongodb_config = require("./config/mongodb");
const mongodb_url =
	"mongodb://" +
	mongodb_config.host +
	":" +
	mongodb_config.port +
	"/" +
	mongodb_config.database;
//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config);
//CONSTS
const U = "undefined";
const TOPIC_TEMPLATE = ["topic", "algorithm", "object_id"];

mqtt_client.on("connect", function() {
	mqtt_client.subscribe("algorithm/flow/+");
});

mqtt_client.on("message", function(topic, buffer) {
	var message = JSON.parse(buffer.toString());
	var FIELD = message.field;
	var COUNT = "count_"+FIELD.substring(FIELD.indexOf("_")+1);
	console.log(FIELD);
	console.log(COUNT);
	var topic_keys = {};
	var topic_values = topic.split("/");
	TOPIC_TEMPLATE.forEach(function(t, i) {
		topic_keys[t] = topic_values[i];
	});
	topic_keys.object_id = new ObjectID(topic_keys.object_id);
	mongodb_client.connect(mongodb_url, function(error, db) {
		if (error) throw error;
		db
			.collection("data")
			.findOne({ _id: topic_keys.object_id }, function(error, doc) {
				delete doc[FIELD];
				var flow = 0;
				if (undefined != doc._last && doc._last != null) {
					var d1 = Math.round(doc._last._date.getTime() / 1000);
					var d2 = Math.round(doc._date.getTime() / 1000);
					if (d2 > d1) flow = (doc[COUNT] - doc._last[COUNT])*1000 / (d2 - d1);
				}
				doc[FIELD] = flow;
				var daily = {mac:doc.mac};
				daily[FIELD] = flow;
				mqtt_client.publish(
					"daily/" + doc.mac,
					JSON.stringify(daily),
					{ qos: 2 },
					function(error) {
						if (error) return console.error("DAILY");
						console.log("DAILY");
					}
				);
				console.log("SAVING");
				console.log(doc);
				UPDATE = {};
				UPDATE[FIELD] = flow;
				db.collection("data").update({
					_id:doc._id
				},{$set:UPDATE});
				var last = {};
				for (k in doc) {
					if (["_last"].indexOf(k) === 0) continue;
					last[k] = doc[k];
				}
				console.log(last);
				db
					.collection("items")
					.updateOne({ mac: doc.mac }, { $set: { _data: last } });
				db.close();
			});
	});
});
