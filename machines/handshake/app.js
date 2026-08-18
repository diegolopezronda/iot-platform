//MYSQL
const request = require('request');
const mysql_config = require('./config/mysql.json');
const mysql = require('mysql2');
const connection = mysql.createConnection(mysql_config);
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const INTERVAL = 1 * MINUTE;

const QUERY = 'SELECT * FROM zones_view WHERE id_application IS NOT NULL';

function handshake() {
	connection.query(QUERY, function(error, rows, fields) {
		if (error) {
			console.error(error);
			return;
		}
		rows.forEach(function(r) {
			r.schema_application = JSON.parse(r.schema_application);
			r.metadata_zone = JSON.parse(r.metadata_zone);
			var a = r.metadata_zone._application;
			var s = r.schema_application.rest.server;
			sendHandshake(a.server+s.url, a.user, a.password,s.success);
		});
	});
}

function sendHandshake(url, user, password,success) {
	var options = {
		url: url,
		auth: {
			user: user,
			password: password
		}
	};
	request(options, function(err, res, body) {
		if (err) {
			console.dir(err);
			return;
		}
		console.dir('headers', res.headers);
		console.dir('status code', res.statusCode);
		console.dir(body);
		var parsed = JSON.parse(body);
		var connect = true;
		for(s in success){
			if(parsed[s] != success[s]){
				connect = false;
				break;
			}
		}
		if(connect === true){
			console.log("SUCCESS");
			return;
		}
		console.error("ERROR");
	});
}

setInterval(function() {
	handshake();
}, MINUTE);
