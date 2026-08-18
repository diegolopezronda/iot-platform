//MYSQL
const request = require('request');
const mysql_config = require('./config/mysql.json');
const mysql = require('mysql2');
const connection = mysql.createConnection(mysql_config);
const QUERY = 'SELECT * FROM webservices_view WHERE mac_item = ';
//TIME
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const INTERVAL = 1 * MINUTE;
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);

mqtt_client.on('connect', function() {
	mqtt_client.subscribe('web-services/+');
	console.log('MQTT is waiting for a message...');
});

mqtt_client.on('message', function(topic, buffer) {
	try {
		var data = JSON.parse(buffer.toString());
		var mac = data.mac;
		var q = QUERY + mac;
		console.log("MAC #"+mac);
		connection.query(q, function(error, rows, fields) {
			if (error) {
				console.log(error);
				return;
			}
			rows.forEach(function(r) {
				r.schema_application = JSON.parse(r.schema_application);
				r.schema_stock = JSON.parse(r.schema_stock);
				r.metadata_zone = JSON.parse(r.metadata_zone);
				r.schema_asset = JSON.parse(r.schema_asset);
				r.schema_item = JSON.parse(r.schema_item);
				for(v in r.schema_item.virtuals){
					r.schema_asset.attributes[v] = JSON.parse(JSON.stringify(r.schema_item.virtuals[v]));
				}
				var rest = JSON.parse(JSON.stringify(r.schema_application.rest.set));
				var remotes = JSON.parse(JSON.stringify(r.schema_stock.remote));
				for(var a in r.schema_asset.attributes){
					if (
						undefined === remotes[a] ||
						remotes[a] === null ||
						undefined === remotes[a].item ||
						remotes[a].item === null ||
						undefined === remotes[a].attribute ||
						remotes[a].attribute === null
					) {
						continue;
					}
					var info = JSON.parse(JSON.stringify(r.metadata_zone._application));
					info.item = remotes[a].item;
					info.attribute = remotes[a].attribute;
					info.value = data[a];
					console.log(info);
					updateWebService(JSON.parse(JSON.stringify(rest)), info);
				}
			});
		});
	} catch (e) {}
});

function updateWebService(rest, info) {
	info.base = 'Real';
	var query = rest.url;
	for (k in info) {
		var re = new RegExp(':' + k, 'gi');
		query = query.replace(re, info[k]);
		for (b in rest.body) {
			rest.body[b] = rest.body[b].replace(re, info[k]);
		}
	}
	var body = JSON.stringify(rest.body);
	var info_request = {
		method: rest.method.toLowerCase(),
		url: info.server + '/' + encodeURI(query),
		auth: {
			user: info.user,
			password: info.password
		},
		body: body
	};
	console.log(info_request);
  request(info_request, function(error, resp, body) {                              
    if (error) {                                                                   
      console.log(error);
			return;                                           
    }
		console.log(body.toString());                                                                              
  }); 
}
