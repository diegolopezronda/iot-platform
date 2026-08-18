//HTTP SERVER
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
//MQTT
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config);
//MONGODB
const mongodb_client = require("mongodb").MongoClient;
const mongodb_config = require("./config/mongodb");
const mongodb_url =
	"mongodb://" + mongodb_config.host + ":" + mongodb_config.port;
//MYSQL
const mysql = require("mysql");
const mysql_config = require("./config/mysql");
const mysql_client = mysql.createConnection(mysql_config);
const SERVERS_QUERY = "SELECT * FROM servers_view";
//MOMENT
const moment = require("moment");
const frameParser = require("./api/FrameParser");
const downlinkManager = require("./api/DownlinkManager");

function Receiver() {
	this.SERVERS = {};
	this.constructor();
}

Receiver.prototype = {
	constructor: function() {
		try {
			this.getServers();
		} catch (e) {
			console.error(e);
		}
	},
	exists: function(k) {
		return undefined != k && k != null;
	},
	base64ToHex: function(input) {
		var lib =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		var bin = "";
		var hex = "";
		var pad = "000000";
		input
			.replace(/=/g, "")
			.split("")
			.forEach(function(b) {
				var m = lib.indexOf(b).toString(2);
				bin += pad.substring(m.length) + m;
				while (bin.length >= 4) {
					hex += parseInt(bin.substring(0, 4), 2).toString(16);
					bin = bin.substring(4);
				}
			});
		return hex;
	},
	getServers: function() {
		var _this = this;
		mysql_client.query(SERVERS_QUERY, function(error, rows, fields) {
			if (error) {
				console.error(error);
				return;
			}
			rows.forEach(function(row) {
				for (r in row) {
					if (r.indexOf("schema_") === 0) {
						row[r] = JSON.parse(row[r]);
					}
				}
				row.is_secure_server = Boolean(row.is_secure_server);
				var protocol = row.code_protocol;
				var address = row.address_server;
				var network = row.code_network;
				if (_this.exists(_this.SERVERS[protocol]) === false) {
					_this.SERVERS[protocol] = {};
				}
				switch (protocol) {
					case "mqtt":
						address = row.schema_server.username + "@" + address;
						_this.SERVERS[protocol][address] = row;
						_this.addMQTTSubscription(_this.SERVERS[protocol][address]);
						break;
					default:
						_this.SERVERS[protocol][address] = row;
				}
			});
		});
	},
	addMQTTSubscription: function(server) {
		var _this = this;
		var header = server.is_secure_server === true ? "mqtts://" : "mqtt://";
		var address = server.schema_server.username + "@" + server.address_server;
		var network = server.code_network;
		server.schema_server.rejectUnauthorized = false;
		server._mqtt = mqtt.connect(
			header + server.address_server,
			server.schema_server
		);
		console.log(header + address);
		server._mqtt.on("connect", function() {
			console.log("Connected to: " + header + address);
			server._mqtt.subscribe(server.schema_server.topic);
		});
		server._mqtt.on("message", function(topic, buffer) {
			var data = {
				query: topic,
				body: JSON.parse(buffer.toString())
			};
			_this.processData("mqtt", address, data);
		});
		server._mqtt.on("error", function(error) {
			console.error(error);
		});
	},
	normalizeData: function(data, schema) {
		for (q in schema) {
			var type = schema[q];
			if (typeof type === "string") {
				switch (type) {
					case "string":
						data[q] = data[q].toString();
						continue;
					case "number":
						data[q] = Number(data[q]);
						continue;
					case "boolean":
						data[q] = Boolean(data[q]);
						continue;
					case "datarate":
						var info = data[q].split("SF")[1].split("BW");
						data[q] = {
							sf: Number(info[0]),
							bw: Number(info[1])
						};
				}
				continue;
			}
			data[q] = this.normalizeData(data[q], schema[q]);
		}
		return data;
	},
	processData: function(protocol, server, data, response) {
		var _this = this;
		console.log("");
		console.log("--START--");
		if (undefined === server || server === null) {
			if (protocol === "http") {
				server = data.get("x-real-ip");
				if (undefined === server || server === null) {
					server = data.socket.remoteAddress.replace("::ffff:", "");
				} else {
					server = server.replace("::ffff:", "");
				}
			}
		}
		console.log(protocol.toUpperCase());
		console.log(server);
		console.log(data.query);
		console.log(data.body);

		if (this.exists(this.SERVERS[protocol][server]) === false) {
			console.error(protocol + " | " + server);
			return response.json({ error: "NOT A SENSUM AFFILIATE" });
		}
		console.log(this.SERVERS[protocol][server].name_network);
		console.log(this.SERVERS[protocol][server].name_carrier);
		console.log("---------");
		var schema = JSON.parse(
			JSON.stringify(this.SERVERS[protocol][server].schema_network)
		);
		data.query = this.normalizeData(data.query, schema.query);
		data.body = this.normalizeData(data.body, schema.body);
		var keys = {};
		for (k in schema.keys) {
			var items = schema.keys[k].split(".");
			keys[k] = data;
			items.forEach(function(x, y) {
				keys[k] = keys[k][x];
			});
		}
		var base = this.SERVERS[protocol][server].base_carrier;
		keys.key = keys.key.replace(/^[0]*/g, "").toUpperCase();
		keys.time = moment(keys.time, schema.time_format).valueOf();
		switch (schema.data_encoding) {
			case "base64":
				keys.data = _this.base64ToHex(keys.data);
				break;
			default:
			//nothing
		}
		console.log(keys);
		this.findItem(this.SERVERS[protocol][server].id_carrier, keys.key, function(
			mac,
			asset
		) {
			console.log("---------");
			var output = frameParser.processQuery(
				mac,
				keys.data,
				_this.SERVERS[protocol][server].code_carrier,
				asset,
				keys.time,
				keys.snr,
				keys.rssi,
				keys.sf,
				keys.ack
			);
			if (undefined === output || output === null) {
				console.log("NULL-OUTPUT");
				if (_this.exists(response) === true) {
					response.json({ error: "NULL OUTPUT" });
				}
				return;
			}
			console.log(output.inserts);
			console.log(output.insert);
			var topic = "data/" + mac;
			if (_this.exists(output.delayed) === true) {
				mqtt_client.publish(topic, output.delayed);
			}

			if (output.inserts) {
				output.inserts.forEach(function(i) {
					mqtt_client.publish(topic, JSON.stringify(i));
				});
			} else {
				mqtt_client.publish(topic, JSON.stringify(output.insert));
			}

			if (_this.exists(response) === true) {
				response.json(output.downlink);
			}
			downlinkManager.processQuery(
				keys.key,
				mac,
				_this.SERVERS[protocol][server],
				asset,
				output.insert,
				data,
				keys,
				protocol === "mqtt" ? mqtt_client : response,
				mqtt_client
			);
			console.log("---END---");
		});
	},
	findItem: function(id_carrier, key, callback) {
		mongodb_client.connect(
			mongodb_url,
			{ useNewUrlParser: true },
			function(error, client) {
				if (error) {
					console.error("MONGO.CLIENT");
					return;
				}
				var db = client.db("sensum");
				db.collection("items").findOne(
					{ id_carrier: id_carrier, key_item: key },
					{ projection: { id_asset: 1, mac: 1, _id: 0 } },
					function(error, item) {
						if (error) {
							console.error("MONGO.COLLECTION");
							console.log("---END---");
							client.close();
							return;
						}
						if (item === null) {
							console.error("ITEM.NULL | " + key);
							console.log("---END---");
							client.close();
							return;
						}
						console.log(item);
						db.collection("assets").findOne(
							{ id_asset: item.id_asset },
							{},
							function(error, asset) {
								client.close();
								if (error) {
									console.error("MONGO.COLLECTION");
									console.log("---END---");
									return;
								}
								if (asset === null) {
									console.error("ASSET.NULL | " + key);
									console.log("---END---");
									return;
								}
								console.log(asset);
								callback(item.mac, asset);
							}
						);
					}
				);
			}
		);
	}
};

var receiver = new Receiver();

app.get("/", function(req, res) {
	receiver.processData("http", null, req, res);
});

app.post("/", function(req, res) {
	receiver.processData("http", null, req, res);
});

app.listen(3040, function() {
	console.log("HERMES!");
});
