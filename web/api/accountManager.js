const connection = require("./connection.js");
const auth = require("../config/database").auth;

/***
 * Handles tasks related to user accounts.
 *
 * @param connection MySQL driver connected to database.
 * @param auth Information about table,fields and password encryption.
 ***/
function AccountManager(connection, auth) {
	/***
	 * MySQL driver connected to database.
	 ***/
	this.CONNECTION = connection;
	/***
	 * Information about table, fields and password encryption.
	 ***/
	this.AUTH = auth;
	/***
	 * Query statement for updating password.
	 ***/
	this.UPDATE_PASSWORD_QUERY =
		"UPDATE `" +
		this.AUTH.table +
		"` " +
		"SET " +
		this.AUTH.password +
		"  = " +
		this.AUTH.encrypt +
		"('?') " +
		"WHERE " +
		this.AUTH.username +
		" = '?' " +
		"AND " +
		this.AUTH.password +
		" = " +
		this.AUTH.encrypt +
		"('?')";
	/***
	 * Query statement for reseting password.
	 ***/
	this.RESET_PASSWORD_QUERY =
		"UPDATE `" +
		this.AUTH.table +
		"` " +
		"SET " +
		this.AUTH.password +
		"  = " +
		this.AUTH.encrypt +
		"('?') " +
		"WHERE id_user = '?' ";
	/***
	 * Query statement for login.
	 ***/
	this.LOGIN_QUERY =
		"SELECT * FROM user u " +
		"WHERE (" +
		"u." +
		this.AUTH.username +
		" = '?' " +
		"OR " +
		"u.email_user" +
		" = '?' " +
		") AND " +
		"u." +
		this.AUTH.password +
		" = " +
		this.AUTH.encrypt +
		"('?') ";
	("LIMIT 1");
	/***
	 *
	 ***/
	this.EXISTS_QUERY =
		"SELECT * FROM user WHERE " + "account_user = '?' OR email_user = '?'";
	this.PERMISSIONS = {
		view: null,
		add: "creator",
		edit: "editor",
		delete: "destroyer"
	};
}

AccountManager.prototype = {
	/***
	 * Validates user and password against database information. Then triggers a callback.
	 *
	 * @param username Account user name.
	 * @param password Account's Password.
	 * @param callback Function to execute after last operation.
	 *
	 ***/
	login: function(username, password, callback) {
		var _this = this;
		var query = this.LOGIN_QUERY.replace("?", username)
			.replace("?", username)
			.replace("?", password);
		_this.CONNECTION.query(query, function(error, rows, fields) {
			if (error != null)
				return callback(false, { message: _this.AUTH.errors.connection });
			if (rows.length == 0) {
				return callback(false, {
					message: _this.AUTH.errors.invalid_credentials
				});
			}
			var user = rows[0];
			if (user.is_verified_user === 0) {
				return callback(false, {
					message: "EMAIL_NOT_VERIFIED"
				});
			}
			delete user.password_user;
			return callback(user, { message: _this.AUTH.messages.login });
		});
	},
	/***
	 * First match current user and password with request's user and password, and
	 * then perfoms a MySQL UPDATE over the password in the current account row in
	 * the users table. Finally executes a callback.
	 *
	 * @param req Node request.
	 * @param res Node response.
	 * @param callback Function to execute after last operation.
	 *
	 ***/
	updatePassword: function(req, res, callback) {
		_this = this;
		var username = req.user[this.AUTH.username];
		var old_password = req.body.old_password;
		var new_password = req.body.new_password;
		var query = this.UPDATE_PASSWORD_QUERY;
		query = query.replace("?", new_password);
		query = query.replace("?", username);
		query = query.replace("?", old_password);
		connection.query(query, function(error, rows, fields) {
			if (error) return callback(false, _this.AUTH.errors.connection);
			if (rows.affectedRows == 0)
				return callback(false, _this.AUTH.errors.password_unmatch);
			return callback(true, _this.AUTH.messages.password_update);
		});
	},
	/***
	 * First match current user and password with request's user and password, and
	 * then perfoms a MySQL UPDATE over the password in the current account row in
	 * the users table. Finally executes a callback.
	 *
	 * @param req Node request.
	 * @param res Node response.
	 * @param callback Function to execute after last operation.
	 *
	 ***/
	resetPassword: function(req, res, callback) {
		_this = this;
		var user = req.body.user;
		var password = req.body.password;
		var query = this.RESET_PASSWORD_QUERY;
		query = query.replace("?", password);
		query = query.replace("?", user);
		connection.query(query, function(error, rows, fields) {
			if (error) return callback(false, _this.AUTH.errors.connection);
			if (rows.affectedRows == 0)
				return callback(false, _this.AUTH.errors.password_unmatch);
			return callback(true, _this.AUTH.messages.password_update);
		});
	},
	/***
	 *
	 */
	verifyDomainCredentials: function(user, hostname, callback) {
		delete user.password_user;
		if (user.is_system_user === 1) return callback(null);
		var _this = this;
		var query =
			"SELECT id_project,name_project,url_project FROM members_view WHERE " +
			"id_user = " +
			user.id_user +
			" AND " +
			"(" +
			"url_project LIKE '%" +
			hostname +
			"'" +
			" OR " +
			"url_parent_project LIKE '%" +
			hostname +
			"'" +
			") " +
			"ORDER BY url_project ASC;";
		_this.CONNECTION.query(query, function(error, rows, fields) {
			if (error != null)
				return callback(_this.AUTH.errors.connection, null, []);
			var len = rows.length;
			switch (len) {
				case 0:
					return callback(_this.AUTH.errors.wrong_domain, null, []);
				case 1:
					return callback(null, rows[0].url_project, []);
				default:
					var a = 0;
					rows.forEach(function(r, i) {
						if (r.url_project.indexOf(hostname) != -1) a = i;
					});
					return callback(null, rows[a].url_project, rows);
			}
		});
	},
	/***
	 *
	 */
	existsUser: function(user, callback) {
		var _this = this;
		exists_query = this.EXISTS_QUERY.replace(/\?/g, user);
		_this.CONNECTION.query(exists_query, function(error, rows, fields) {
			if (error != null) return callback(_this.AUTH.errors.connection);
			var row = rows.length > 0 ? rows[0] : null;
			return callback(row);
		});
	},
	grantPermission: function(req, entity, action) {
		var u = req.user;
		if (u.is_system_user === true) return true;
		var t = u.tables[entity];
		if (undefined === t) return false;
		if (action === "view") return true;
		var flag = this.PERMISSIONS[action];
		return t.privileges[flag] === true;
	},
	getConditions: function(req, entity) {
		var buffer = [];
		req.user.privileges_member.forEach(function(p) {
			var conditions = p.tables_level[entity];
			if (!(undefined === conditions || conditions === null)) {
				buffer.push(conditions.conditions);
			}
		});
		output = buffer.join(" AND ");
		if (undefined === output || output === null || output.length === 0) {
			output = "1";
		}
		if (output.indexOf(" AND ") === 0) output = output.substring(5);
		return output;
	}
};
module.exports = new AccountManager(connection, auth);
