const database = require("../config/database.json");
const config = process.env.develop
	? database.development.mysql
	: database.mysql;
const mysql = require("mysql2");
/***
 * Establishes MySQL connection with parameters from config file.
 ***/
const connection = mysql.createConnection(config);

module.exports = connection;
