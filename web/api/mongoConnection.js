const database = require("../config/database");
const DBMS = process.env.develop
	? database.development.mongodb
	: database.mongodb;
const MongoClient = require("mongodb").MongoClient;
/***
 * Connects to a MongoDB database, using file configuration.
 *
 * @param client MongoDB client driver.
 *	@param host Server URL..
 * @param port Server port.
 * @param database MongoDB database.
 *
 ***/
function MongoConnection(client, user, password, host, port, database) {
	/***
	 * MongoDB client.
	 ***/
	this.CLIENT = client;
	/***
	 * Connection URL.
	 ***/
	this.URL =
		"mongodb://" +
		user +
		":" +
		password +
		"@" +
		host +
		":" +
		port +
		"/" +
		database;
}
//PROTOTYPE
MongoConnection.prototype = {
	/***
	 * Connects to database, executes callback, and finally closes connection.
	 *
	 * @param callback business function to execute between connection openning and closing.
	 *
	 ***/
	connect: function(callback) {
		this.CLIENT.connect(
			this.URL,
			function(error, database) {
				callback(error, database);
			}
		);
	}
};
//NODEJS MODULE
module.exports = new MongoConnection(
	MongoClient,
	DBMS.user,
	DBMS.password,
	DBMS.host,
	DBMS.port,
	DBMS.database
);
