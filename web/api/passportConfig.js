const auth = require("../config/database")["auth"];
const connection = require("./connection.js");
const accountManager = require("./accountManager.js");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
/***
 * Configures PassportJS.
 ***/
module.exports = function(passport) {
	/***
	 * Login. Selects from database user and password and
	 * return the result as callback.
	 ***/
	passport.use(
		new LocalStrategy(function(username, password, done) {
			accountManager.login(username, password, function(user, message) {
				return done(null, user, message);
			});
		})
	);
	/***
	 * Serializes user. Use Id from the current row of users table as session key.
	 ***/
	passport.serializeUser(function(user, done) {
		done(null, {
			id: user.id_user,
			url: user.url_project,
			as: user.as,
			domains: user.domains,
			system: Boolean(user.is_system_user)
		});
	});
	/***
	 * Deserializes user by using the ID.
	 ***/
	passport.deserializeUser(function(id, done) {
		if (id.system === true && (undefined === id.as || id.as === null)) {
			var query = "SELECT * FROM user WHERE id_user = " + id.id;
			connection.query(query, function(error, rows, fields) {
				var user = rows[0];
				delete user.password_user;
				user.is_system_user = Boolean(user.is_system_user);
				user.privileges_member = [];
				var query =
					"SELECT * FROM project WHERE url_project LIKE '%" + id.url + "'";
				connection.query(query, function(error, rows, fields) {
					var project = rows[0];
					for (p in project) {
						user[p] = project[p];
					}
					return done(null, user);
				});
			});
			return;
		}

		var user_line =
			id.system === true
				? "account_user = '" + id.as + "'"
				: "id_user = " + id.id;

		var account_query =
			"SELECT * FROM members_view " +
			"WHERE " +
			user_line +
			" AND " +
			"url_project LIKE '%" +
			id.url +
			"'";
		connection.query(account_query, function(error, rows, fields) {
			if (error != null)
				return done({ message: auth.errors.connection }, false);
			if (rows.length === 0)
				return done({ message: auth.errors.invalid_credentials }, false);
			var user = {};
			for (k in rows[0]) user[k] = rows[0][k];
			user.metadata_user = JSON.parse(user.metadata_user);
			user.is_system_user = Boolean(user.is_system_user);
			var arrays = [
				"items_member",
				"zones_member",
				"items_collaborator",
				"zones_collaborator"
			];
			arrays.forEach(function(a) {
				user[a] =
					undefined === user[a] || user[a] === null ? [] : JSON.parse(user[a]);
			});
			user.id_item = user.items_member;
			user.id_item = user.id_item.concat(user.items_collaborator);
			user.id_item.push(-1);
			user.id_zone = user.zones_member;
			user.id_zone = user.id_zone.concat(user.zones_collaborator);
			user.id_zone.push(-1);
			delete user.password_user;
			//PRIVILEGES
			var privileges_query = "SELECT * FROM privileges_view WHERE id_member = ";
			privileges_query += user.id_member.toString();
			connection.query(privileges_query, function(error, rows, fields) {
				if (error != null)
					return done({ message: auth.errors.connection }, false);
				user.privileges_member = [];
				user.levels = [];
				user.tables = {};
				rows.forEach(function(row, i) {
					//PARSING
					row.is_global_privilege = Boolean(row.is_global_privilege);
					row.is_creator_privilege = Boolean(row.is_creator_privilege);
					row.is_editor_privilege = Boolean(row.is_editor_privilege);
					row.is_destroyer_privilege = Boolean(row.is_destroyer_privilege);
					if (!(row.tables_level === null)) {
						row.tables_level = JSON.parse(row.tables_level);
						//adding table privileges.
						for (t in row.tables_level) {
							var table = row.tables_level[t];
							if (undefined === user.tables[t] || user.tables[t] === null) {
								user.tables[t] = {
									privileges: {},
									columns: {}
								};
							}
							user.tables[t].privileges.global =
								user.tables[t].privileges.global === true
									? true
									: row.is_global_privilege && table.global;
							user.tables[t].privileges.creator =
								user.tables[t].privileges.creator === true
									? true
									: row.is_creator_privilege && table.creator;
							user.tables[t].privileges.editor =
								user.tables[t].privileges.editor === true
									? true
									: row.is_editor_privilege && table.editor;
							user.tables[t].privileges.destroyer =
								user.tables[t].privileges.destroyer === true
									? true
									: row.is_destroyer_privilege && table.destroyer;
						}
					}
					user.levels.push(row.id_level);
					user.privileges_member.push(row);
				});
				user.domains = id.domains;
				return done(null, user);
			});
		});
	});
};
