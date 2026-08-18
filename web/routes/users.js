/***
 * This file routes POST methods.
 * The list include login, logout, deserialize session,
 * upload profile picture, and any POST request related
 * with user session.
 ***/
const express = require("express");
const router = express.Router();
const routeHandler = require("../api/routeHandler");
const fs = require("fs");
const passport = require("passport");
const formidable = require("formidable");
const accountManager = require("../api/accountManager");
const mongo = require("../api/mongoConnection");
var ObjectID = require("mongodb").ObjectID;
const mailTransporter = require("../api/mailTransporter");
const DOT = ".";
const PICTURE_PATH = __dirname + "/../public/img/";
const PICTURE_SUCCESS = "UPDATE_PICTURE_SUCCESS";
/***
 * MONITOR
 ***/
const MQTT = require("mqtt");
const mqtt_config = require("../config/mqtt");
var mqtt_client = MQTT.connect(mqtt_config);
function notifyMonitor(req, error) {
	var message = JSON.stringify({
		user: req.user,
		error: error,
		query: req.query,
		params: req.params,
		url: req.originalUrl
	});
	mqtt_client.publish("sensum/monitor/error/web", message);
}
/***
 * Verify given username and password credentials.
 * Serializes the user, saving current session.
 * Informs to client about success, fail and error.
 ***/
router.post("/login", function(req, res) {
	var as = req.body.as;
	try {
		passport.authenticate("local", function(err, user, info) {
			if (err) return res.json({ user: null, error: info.message });
			if (!user) return res.json({ user: null, error: info.message });
			var url = process.env.domain || req.hostname;
			accountManager.verifyDomainCredentials(user, url, function(
				error,
				url_project,
				domains
			) {
				if (error) return res.json({ user: user, error: error });
				user.url_project = url_project || url;
				user.as = as;
				user.domains = domains;
				req.login(user, function(err) {
					if (err.length > 0)
						return res.json({ user: null, error: info.message });
					return res.json({ user: user });
				});
			});
		})(req, res);
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
router.post("/context", routeHandler.authenticate, function(req, res) {
	var user = JSON.parse(JSON.stringify(req.user));
	var url = req.body.context;
	req.logout();
	accountManager.verifyDomainCredentials(user, url, function(
		error,
		url_project,
		domains
	) {
		if (error) return res.json({ user: user, error: error });
		user.url_project = url_project || url;
		user.as = null;
		var n = user.domains.length;
		domains.forEach(function(d) {
			for (var a = 0; a < n; a++) {
				if (user.domains[a].id_project === d.id_project) return;
			}
			user.domains.push(d);
		});
		req.login(user, function(err) {
			if (err.length > 0) return res.json({ user: null, error: info.message });
			return res.json({ user: user });
		});
	});
});
/***
 * Retiveve the deserialized user.
 ***/
router.post("/session", routeHandler.authenticate, function(req, res) {
	try {
		var user = req.user;
		var data = {};
		for (k in user) {
			if (k.indexOf(DOT) != -1) {
				var q = k.split(DOT);
				data[q[0]] = {};
				data[q[0]][q[1]] = user[k];
				continue;
			}
			data[k] = user[k];
		}
		data.ip_user = req.get("x-real-ip");
		if (undefined === data.ip_user || data.ip_user === null) {
			data.ip_user = req.socket.remoteAddress.replace("::ffff:", "");
		} else {
			data.ip_user = data.ip_user.replace("::ffff:", "");
		}
		return res.json(data);
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Stores a given picture of the current user in the standard directory.
 * Informs to client about success,fail and error.
 ***/
router.post("/picture", routeHandler.authenticate, function(req, res) {
	var old_path = req.files.file.path;
	var new_path =
		PICTURE_PATH +
		"database/" +
		req.body.entity +
		"/" +
		req.body.item +
		"." +
		req.body.extension;
	fs.rename(old_path, new_path, function(error) {
		if (error) {
			res.json({ error: error });
			return;
		}
		res.json({ success: true });
	});
});
/***
 * Verifies current password against given password.
 * Updates credentials of current user with a new password.
 * Informs to client about success and fail.
 ***/
router.post("/password/update", routeHandler.authenticate, function(req, res) {
	try {
		accountManager.updatePassword(req, res, function(success, message) {
			return res.json({ success: success, message: message });
		});
		return;
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Updates credentials of current user with a new password.
 * Informs to client about success and fail.
 * TODO Check responses
 ***/
router.post("/password/reset", function(req, res) {
	//try {
	accountManager.resetPassword(req, res, function(success, message) {
		if (success === false) return res.json({ error: "CONNECTION_ERROR" });
		return res.json({ message: message });
	});
	/*
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: 'FATAL_ERROR' });
	}
*/
});
/***
 * First verifies if a given user exists in database.
 * If user exists stores random hash with a one day TTL called token.
 * The token is sent to user e-mail, with an URL for reseting password.
 ***/
router.post("/password/request", function(req, res) {
	try {
		var USER = req.body.username;
		var COMPANY = req.body.company;
		var USER_EXISTS_MESSAGE = { message: "FORGOT_PASSWORD_SUCCESS" };
		accountManager.existsUser(USER, function(user) {
			if (user === null) return res.json(USER_EXISTS_MESSAGE);
			mongo.connect(function(error, db) {
				if (error) {
					if (error)
						return res.json({
							error: "CONNECTION_ERROR",
							mongo_db_error: error
						});
				}
				db.collection("passwords").insertOne(
					{ date: new Date(), user: user.id_user },
					function(error, info) {
						db.close();
						if (error)
							return res.json({
								error: "CONNECTION_ERROR",
								mongo_db_error: error
							});
						fs.readFile(
							__dirname + "/../config/mail_templates/password_request.html",
							function(error, html) {
								if (error) {
									return res.json({
										error: "CONNECTION_ERROR"
									});
								}
								var token =
									"http://" +
									req.hostname +
									"/login/password/reset/" +
									info.insertedId;
								var logo =
									"http://" +
									req.hostname +
									"/img/database/project/" +
									COMPANY.id_project +
									".png";
								var background =
									"http://" +
									req.hostname +
									"/img/database/project/splash/" +
									COMPANY.id_project +
									".jpg";
								var options = {
									from:
										COMPANY.name_project +
										" Helpdesk <no-reply@" +
										req.hostname +
										">",
									to: user.email_user,
									subject: "Password reset request",
									text:
										user.first_name_user +
										" reset your password in " +
										token +
										"."
								};
								options.html = html
									.toString()
									.replace(/\*\|FIRST_NAME_USER\|\*/g, user.first_name_user)
									.replace(/\*\|PASSWORD_RESET_LINK\|\*/g, token)
									.replace(/\*\|CURRENT_YEAR\|\*/g, new Date().getFullYear())
									.replace(/\*\|COMPANY_NAME\|\*/g, COMPANY.name_company)
									.replace(/\*\|LOGO\|\*/g, logo)
									.replace(/\*\|BACKGROUND_URL\|\*/g, background);
								mailTransporter.sendMail(options, function(error, info) {
									if (error) {
										return res.json({
											error: "CONNECTION_ERROR"
										});
									}
									return res.json(USER_EXISTS_MESSAGE);
								});
							}
						);
					}
				);
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 *
 ***/
router.post("/password/token", function(req, res) {
	try {
		var TOKEN = req.body.token;
		if (TOKEN.length !== 24) return res.json({ error: "INVALID_TOKEN_ERROR" });
		mongo.connect(function(error, db) {
			if (error) return res.json({ error: "CONNECTION_ERROR" });
			db.collection("passwords").findOneAndDelete(
				{
					_id: new ObjectID(TOKEN)
				},
				function(error, result) {
					db.close();
					if (error) return res.json({ error: "CONNECTION_ERROR" });
					if (result.value === null)
						return res.json({ error: "EXPIRED_TOKEN_ERROR" });
					res.json(result.value);
				}
			);
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Destroys current session.
 ***/
router.post("/logout", routeHandler.authenticate, function(req, res) {
	try {
		req.logout();
		res.end();
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Performs MySQL INSERT
 ***/
router.post("/accounts/new", function(req, res, next) {
	var ENTITY = "user";
	var FIELDS = {
		password_user: {
			wrapper: "MD5(*)"
		},
		hash_user: {
			wrapper: "MD5(*)"
		},
		account_user: {
			wrapper: "LOWER(*)"
		},
		email_user: {
			wrapper: "LOWER(*)"
		}
	};
	var ROW = req.body.row;
	var KEYS = Object.keys(ROW).join(",");
	var VALUES = "";
	for (k in ROW) {
		var value = ROW[k];
		if (typeof value === "undefined" || value === null) {
			VALUES += "," + "null";
			continue;
		}
		value = typeof value.value !== "undefined" ? value.value : value;
		value = typeof value === "undefined" ? null : value;
		value = typeof value === "string" ? "'" + value + "'" : value;
		if (typeof FIELDS !== "undefined" && FIELDS && FIELDS[k]) {
			if (FIELDS[k].wrapper) {
				var wrapper = FIELDS[k].wrapper;
				value = wrapper.replace("*", value);
			}
		}
		VALUES += "," + value;
	}
	VALUES = VALUES.substring(1);
	var QUERY = "INSERT INTO ? (?) VALUES (?);";
	QUERY = QUERY.replace("?", ENTITY);
	QUERY = QUERY.replace("?", KEYS);
	QUERY = QUERY.replace("?", VALUES);
	id_project = req.body.id_project;
	accountManager.CONNECTION.query(QUERY, function(
		mysql_error,
		mysql_rows,
		mysql_fields
	) {
		if (mysql_error) return res.json({ error: mysql_error });
		var id_user = mysql_rows.insertId;
		query =
			"INSERT INTO member (id_user,id_project,hash_member) VALUES (?,?,MD5(CONCAT(NOW(),'meowth')))";
		params = [id_user, id_project];
		params.forEach(function(p) {
			query = query.replace("?", p);
		});
		accountManager.CONNECTION.query(query, function(error, rows, fields) {
			if (error) {
				return res.json({
					error: error,
					rows: rows,
					fields: fields
				});
			}
			var user_select =
				"SELECT hash_user FROM user WHERE account_user ='" +
				ROW.account_user +
				"'";
			accountManager.CONNECTION.query(user_select, function(
				uerror,
				urows,
				ufields
			) {
				var date = new Date();
				var year = date.getFullYear().toString();
				var message = JSON.stringify({
					from: "Sensum",
					domain: "sensum.co.nz",
					to: ROW.email_user,
					subject: "ID Sensum created",
					params: {
						name_company: "Sensum",
						account_user: ROW.account_user,
						hash_user: urows[0].hash_user,
						date: year
					}
				});
				mqtt_client.publish("email/signup-hash", message, { qos: 2 });
				return res.json({
					error: uerror,
					rows: urows,
					hash: urows[0].hash_user,
					fields: ufields
				});
			});
		});
	});
});
router.post("/accounts/email-verify/", function(req, res, next) {
	var HASH = req.body.hash;
	var query =
		"UPDATE user SET is_verified_user = 1 WHERE hash_user = '" + HASH + "'";
	accountManager.CONNECTION.query(query, function(error, rows, fields) {
		return res.json({
			error: error,
			rows: rows,
			fields: fields
		});
	});
});
/***
 * Performs MySQL UPDATE
 ***/
router.post("/accounts/update/", routeHandler.authenticate, function(
	req,
	res,
	next
) {
	var ENTITY = req.body.entity;
	var FIELDS = {
		password_user: {
			wrapper: "MD5(*)"
		},
		account_user: {
			wrapper: "LOWER(*)"
		},
		email_user: {
			wrapper: "LOWER(*)"
		}
	};
	var PRIMARY = req.body.primary;
	var ID = req.user.id_user;
	var ROW = req.body.row;
	var VALUES = "";
	for (k in ROW) {
		VALUES += ",";
		VALUES += k;
		VALUES += " = ";
		var value = ROW[k];
		if (typeof value === "undefined" || value === null) {
			VALUES += "null";
			continue;
		}
		value = typeof value.value !== "undefined" ? value.value : value;
		value = typeof value === "undefined" ? null : value;
		value = typeof value === "string" ? "'" + value + "'" : value;
		if (typeof FIELDS !== "undefined" && FIELDS && FIELDS[k]) {
			if (FIELDS[k].wrapper) {
				var wrapper = FIELDS[k].wrapper;
				value = wrapper.replace("*", value);
			}
		}
		VALUES += value;
	}
	VALUES = VALUES.substring(1);
	var QUERY = "UPDATE ? SET $ WHERE ? = ? LIMIT 1;";
	QUERY = QUERY.replace("?", ENTITY);
	QUERY = QUERY.replace("?", PRIMARY);
	QUERY = QUERY.replace("?", ID);
	QUERY = QUERY.replace("$", VALUES);
	accountManager.CONNECTION.query(QUERY, function(error, rows, fields) {
		return res.json({
			error: error,
			rows: rows,
			fields: fields
		});
	});
});

router.post("/accounts/search", function(req, res, next) {
	var match = req.body.match;
	var id_project = req.body.id_project;
	var blacklist = req.body.blacklist;
	var blacklist_query = "";
	if (blacklist.length > 0) {
		blacklist_query = "AND " + "id_user NOT IN (" + blacklist.join(",") + ") ";
	}
	var columns = [
		"id_user",
		"first_name_user",
		"last_name_user",
		"email_user",
		"account_user"
	];
	var query =
		"SELECT " +
		columns.join(",") +
		" " +
		"FROM user " +
		"WHERE " +
		"id_user NOT IN " +
		"(SELECT id_user FROM member WHERE id_project = " +
		id_project +
		") " +
		blacklist_query +
		"AND " +
		"(" +
		"account_user LIKE '%" +
		match +
		"%' OR " +
		"first_name_user LIKE '%" +
		match +
		"%' OR " +
		"last_name_user LIKE '%" +
		match +
		"%' " +
		") " +
		"LIMIT 5";
	accountManager.CONNECTION.query(query, function(error, rows, fields) {
		return res.json({
			error: error,
			rows: rows,
			fields: fields
		});
	});
});

router.post("/accounts/invite/anonymous", routeHandler.authenticate, function(
	req,
	res
) {
	var message = req.body.message;
	mqtt_client.publish("email/invitation", JSON.stringify(message), { qos: 2 });
	return res.json({ successs: true });
});

router.post("/accounts/invite/", routeHandler.authenticate, function(req, res) {
	var id_project = Number(req.body.id_project);
	var guests = req.body.guests;
	var project = req.body.project;
	var manager = req.body.manager;
	var guests_info = req.body.guests_info;
	var insert_query =
		"INSERT INTO member (id_user,id_project,hash_member) VALUES ";
	var inserts = "";
	guests.forEach(function(id_user) {
		inserts +=
			",(" + id_user + " , " + id_project + ",MD5(CONCAT(NOW(),'meowth')))";
	});
	inserts = inserts.substring(1);
	insert_query += inserts;
	insert_query += " ON DUPLICATE KEY UPDATE id_user = id_user";
	accountManager.CONNECTION.query(insert_query, function(error, rows, fields) {
		if (error) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		}
		guests_info.forEach(function(g) {
			var message = {
				from: "Sensum",
				domain: "sensum.co.nz",
				params: {
					first_name_user: g.first_name_user,
					last_name_user: g.last_name_user,
					account_user: g.account_user
				},
				subject: "Project Access granted"
			};
			message.params.date = new Date().getFullYear().toString();
			message.params.name_company = "Sensum";
			message.params.name_project = project.name_project;
			message.params.url_project = project.url_project.replace(
				/(http:\/\/|https:\/\/)/g,
				""
			);
			message.to = g.email_user;
			message.params.first_name_manager = manager.first_name_user;
			message.params.last_name_manager = manager.last_name_user;
			mqtt_client.publish("email/access_granted", JSON.stringify(message), 0);
		});
		var select =
			"SELECT * FROM member WHERE id_user IN (" +
			guests.join(",") +
			") AND id_project = " +
			id_project;
		accountManager.CONNECTION.query(select, function(error, rows, fields) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		});
	});
});
router.post("/accounts/join/", function(req, res) {
	var id_user = req.body.id_user;
	var id_project = req.body.id_project;
	var member_query =
		"INSERT INTO member (id_user,id_project,hash_member) VALUES ";
	member_query +=
		"(" + id_user + " , " + id_project + ",MD5(CONCAT(NOW(),'meowth')))";
	accountManager.CONNECTION.query(member_query, function(error, rows, fields) {
		if (error) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		}
		var id_member = rows.insertId;
		var levels = [4, 5, 6, 7, 8, 9];
		var privileges_query =
			"INSERT INTO privilege (id_member,id_level,is_creator_privilege,is_editor_privilege,is_destroyer_privilege,is_global_privilege) VALUES ";
		var inserts = "";
		levels.forEach(function(id_level) {
			inserts += ",(" + [id_member, id_level, 1, 1, 1, 0].join(",") + ")";
		});
		inserts = inserts.substring(1);
		privileges_query += inserts;
		accountManager.CONNECTION.query(privileges_query, function(
			error,
			rows,
			fields
		) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		});
	});
});

module.exports = router;
