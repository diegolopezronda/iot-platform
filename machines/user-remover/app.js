//MYSQL
const mysql_config = require('./config/mysql.json');
const mysql = require('mysql2');
const connection = mysql.createConnection(mysql_config);
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const INTERVAL = 1 * MINUTE;
const query =
	'DELETE FROM user ' +
	'WHERE is_verified_user = 0 AND DATE_ADD(date_user,INTERVAL 1 DAY) < NOW() ';

function App() {
	this.constructor();
}

App.prototype = {
	constructor: function() {
		var _this = this;
		var interval = setInterval(function() {
			_this.removeNonVerifiedUsers();
		}, INTERVAL);
	},
	removeNonVerifiedUsers: function() {
		connection.query(query, function(error, rows, fields) {
			if (error) console.error(error);
		});
	}
};

var app = new App();
