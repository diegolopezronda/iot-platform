/***
 * This files routes MySQL SELECT, SELECT by ID, UPDATE, INSERT, and
 * DELETE queries. Every request in this file is a POST request.
 ***/
var express = require("express");
var router = express.Router();
var routeHandler = require("../api/routeHandler");
var entityManager = require("../api/entityManager");
const accountManager = require("../api/accountManager");
var mysql = require("../api/connection");
var mongo = require("../api/mongoConnection");
var database = require("../config/database");
const moment = require("moment");
const timezone = require("moment-timezone");
const MQTT = require("mqtt");
const mqtt_config = require("../config/mqtt");
const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
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

function getCapabilities(id_project, callback) {
	var query =
		entityManager.SCHEMA.capabilities_view.select +
		" WHERE (a.id_project IS NULL OR a.id_project = ?) ";
	var params = [id_project];
	params.forEach(function(p) {
		query = query.replace("?", p);
	});
	mysql.query(query, function(error, rows, fields) {
		if (error) {
			return callback([]);
		}
		rows = rows.filter(function(r) {
			try {
				r.schema_level = JSON.parse(r.schema_level);
			} catch (e) {
				r.schema_level = null;
			}
			return true;
		});
		return callback(rows);
	});
}

function getLinks(req, id_project, callback) {
	if (
		req.isAuthenticated() === false ||
		(req.user.is_system_user === false && req.user.levels.length === 0)
	) {
		return callback([]);
	}
	var query =
		entityManager.SCHEMA.link.select.replace("FROM", ",name_level FROM") +
		" WHERE (a.id_project IS NULL OR a.id_project = ?) ";
	var params = [id_project];
	if (req.user.is_system_user === false) {
		query += " AND a.id_level IN (?)";
		params.push(req.user.levels.join(","));
	}
	params.forEach(function(p) {
		query = query.replace("?", p);
	});
	mysql.query(query, function(error, rows, fields) {
		if (error) {
			return callback([]);
		}
		return callback(rows);
	});
}

function getRoutes(req, id_project, callback) {
	if (
		req.isAuthenticated() === false ||
		(req.user.is_system_user === false && req.user.levels.length === 0)
	) {
		return callback([]);
	}
	var query =
		entityManager.SCHEMA.route.select +
		" WHERE (a.id_project IS NULL OR a.id_project = ?) ";
	var params = [id_project];
	if (req.user.is_system_user === false) {
		query += " AND a.id_level IN (?)";
		params.push(req.user.levels.join(","));
	}
	params.forEach(function(p) {
		query = query.replace("?", p);
	});
	query += "ORDER BY id_project ASC;";
	mysql.query(query, function(error, rows, fields) {
		if (error) {
			return callback([]);
		}
		return callback(rows);
	});
}

function getModules(id_project, member_modules, callback) {
	var modules = [1, 15];
	if (
		!(
			undefined === member_modules ||
			member_modules === null ||
			member_modules.length === 0
		)
	) {
		modules = modules.concat(member_modules);
	}
	var query = entityManager.SCHEMA.module.select + " WHERE a.id_module IN (?)";
	var params = [modules.join(",")];
	params.forEach(function(p) {
		query = query.replace("?", p);
	});
	mysql.query(query, function(error, rows, fields) {
		if (error) {
			return callback([]);
		}
		return callback(rows);
	});
}

function getProjectManagers(id_project, callback) {
	var query =
		"SELECT first_name_user,email_user " +
		"FROM privileges_view " +
		"WHERE " +
		"id_level = 2 AND is_editor_privilege = 1 AND is_creator_privilege = 1 AND " +
		"id_project = " +
		id_project;
	mysql.query(query, function(error, rows, fields) {
		if (error) {
			return callback([]);
		}
		return callback(rows);
	});
}

router.post("/angular/", function(req, res) {
	var url = req.isAuthenticated()
		? req.user.url_project
		: process.env.domain || req.hostname;
	var query =
		entityManager.SCHEMA.project.select + " WHERE a.url_project LIKE '%?'";
	var params = [url];
	params.forEach(function(p) {
		query = query.replace("?", p);
	});
	mysql.query(query, function(error, rows, fields) {
		if (error) return res.json({ error: "CONNECTION_ERROR" });
		if (rows.length === 0) return res.json({ error: "NO_ROWS" });
		var project = rows[0];
		project.is_public_project = Boolean(project.is_public_project);
		try {
			project.schema_project = JSON.parse(project.schema_project);
		} catch (e) {
			project.schema_project = {};
		}
		var id_project = project.id_project;
		var query = "";
		getRoutes(req, id_project, function(routes) {
			var module_list = [];
			routes.forEach(function(r) {
				var m = r.id_module;
				if (module_list.indexOf(m) === -1) {
					module_list.push(m);
				}
			});
			getModules(id_project, module_list, function(modules) {
				getLinks(req, id_project, function(links) {
					var output_links = {};
					links.forEach(function(l) {
						var n = l.name_level.toLowerCase();
						if (undefined === output_links[n] || output_links[n] === null) {
							output_links[n] = [];
						}
						l.name_link = JSON.parse(l.name_link);
						output_links[n].push(l);
					});
					getProjectManagers(id_project, function(managers) {
						getCapabilities(id_project, function(capabilities) {
							return res.json({
								schema: entityManager.SCHEMA,
								user: req.user,
								links: output_links,
								routes: routes,
								modules: modules,
								project: project,
								managers: managers,
								capabilities: capabilities,
								is_auth: req.isAuthenticated()
							});
						});
					});
				});
			});
		});
	});
});

function getQuery(req, entity) {
	var u = req.user;
	var query = "";
	var schema = entityManager.SCHEMA[entity];
	if (
		u.is_system_user === false &&
		u.tables[entity].privileges.global === false
	) {
		query = schema.owner_select
			.replace(/\$ID_PROJECT/g, u.id_project)
			.replace(/\$ID_MEMBER/g, u.id_member)
			.replace(/\$ID_USER/g, u.id_user)
			.replace(/\$ID_ITEM/g, u.id_item.join(","))
			.replace(/\$ID_ZONE/g, u.id_zone.join(","));
	} else {
		query = schema.project_select.replace(/\$ID_PROJECT/g, u.id_project);
	}
	return query;
}

function getConditions(req, entity) {
	var u = req.user;
	var query = "";
	var schema = entityManager.SCHEMA[entity];
	if (
		u.is_system_user === false &&
		u.tables[entity].privileges.global === false
	) {
		query = schema.conditions
			.replace("$ID_PROJECT", u.id_project)
			.replace("$ID_MEMBER", u.id_member)
			.replace("$ID_USER", u.id_user)
			.replace("$ID_ITEM", u.id_item.join(","))
			.replace("$ID_ZONE", u.id_zone.join(","));
	} else {
		query = schema.project_conditions.replace("$ID_PROJECT", u.id_project);
	}
	if (query.length === 0) query = "1";
	return query;
}

router.post("/list/", routeHandler.authenticate, function(req, res) {
	try {
		var ENTITY = req.body.entity;
		//PRIVILEGES
		if (accountManager.grantPermission(req, ENTITY, "view") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var limit = req.body.limit;
		var page = req.body.page;
		var offset = req.body.offset;
		var filter = req.body.filter;
		var is_system = req.user.is_system_user;
		//FRAME
		var CROSS_PROJECT = req.body.cross_project;
		var ID = req.body.id;
		var ADAPTERS = req.body.adapters;
		var config = entityManager.manageFromLocal(ENTITY, ADAPTERS);
		var bundle = {
			table: ENTITY,
			primary: config.primary,
			comment: config.comment,
			config: {},
			error: null,
			rows: [],
			fields: config.fields
		};
		for (c in config) {
			if (["select", "id_select", "fields"].indexOf(c) === -1) {
				bundle.config[c] = config[c];
			}
		}
		//LIMIT
		var query = "";
		if (
			is_system === false &&
			req.user.tables[ENTITY].privileges.global === false
		) {
			query = config.owner_select
				.replace(/\$ID_PROJECT/g, req.user.id_project)
				.replace(/\$ID_MEMBER/g, req.user.id_member)
				.replace(/\$ID_USER/g, req.user.id_user)
				.replace(/\$ID_ITEM/g, req.user.id_item.join(","))
				.replace(/\$ID_ZONE/g, req.user.id_zone.join(","));
		} else {
			if (ENTITY === "project") {
				query = config.select;
			} else {
				query = config.project_select.replace(
					/\$ID_PROJECT/g,
					req.user.id_project
				);
				//CROSS-PROJECT
				if (CROSS_PROJECT) {
					query = config.cross_select.replace(
						/\$ID_PROJECT/g,
						req.user.id_project
					);
				}
			}
		}

		//ID
		if (ID) {
			if (query.indexOf("WHERE") === -1) {
				query += " WHERE a." + bundle.primary + " = " + ID;
			} else {
				query += " AND a." + bundle.primary + " = " + ID;
			}
		}

		//FILTER
		var key = req.body.key;
		var value = req.body.value;
		if (undefined != key && key != null && undefined != value) {
			if (query.indexOf("WHERE") === -1) {
				query += " WHERE a." + key + " = " + value;
			} else {
				query += " AND a." + key + " = " + value;
			}
		}

		if (undefined != filter && filter != null) {
			var filters = [];
			for (f in filter) {
				var filter_line = "";
				var fv = filter[f];
				if (typeof fv === "string")
					filter_line = "a." + f + " LIKE '%" + fv + "%'";
				if (typeof fv === "number") filter_line = "a." + f + " = " + fv;
				filters.push(filter_line);
			}
			if (query.indexOf("WHERE") === -1) {
				query += " WHERE " + filters.join(" AND ");
			} else {
				query += " AND " + filters.join(" AND ");
			}
		}

		if (isNaN(limit) === false) {
			if (isNaN(page) === false) {
				query += " LIMIT " + limit;
				query += " OFFSET " + page * limit;
			} else if (isNaN(offset) === false) {
				query += " LIMIT " + limit;
				query += " OFFSET " + offset;
			}
		}
		//EXEC
		mysql.query(query, function(error, rows, fields) {
			bundle.error = error;
			bundle.rows = [];
			if (error) return res.json(bundle);
			rows.forEach(function(r) {
				var row = {};
				for (k in r) {
					row[k] = r[k];
				}
				for (k in r) {
					if (k.indexOf(".") != -1) {
						continue;
					}
					var field = bundle.fields[k];
					if (["i18n", "json"].indexOf(field.type) != -1) {
						row[k] =
							row[k] === null || row[k].length === 0
								? row[k]
								: JSON.parse(row[k]);
						continue;
					}
					if (["i18n", "json"].indexOf(field.foreign_field_type) != -1) {
						var fk = field.foreign_alias;
						try {
							row[fk] = row[fk] === null ? row[fk] : JSON.parse(row[fk]);
						} catch (json_error) {
							row[fk] = row[fk];
						}
						continue;
					}
				}
				bundle.rows.push(row);
			});
			return res.json(bundle);
		});
	} catch (error) {
		//notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Obtains table configuration.
 ***/
router.post("/entity/", routeHandler.authenticate, function(req, res) {
	try {
		var entity = req.body.entity;
		if (accountManager.grantPermission(req, entity, "view") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var adapters = req.body.adapters;
		var config = entityManager.manageFromLocal(entity, adapters);
		return res.json(config);
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Obtains a key-value pair from entity for echa of its rows.
 ***/
router.post("/bind/", routeHandler.authenticate, function(req, res) {
	try {
		var BODY = req.body;
		var entity = BODY.foreign_table;
		var key = BODY.foreign_display_field;
		var value = BODY.foreign_field;
		//var concat = [key,"' (#'",value,"')'"].join(",");
		var concat = [key].join(",");
		var query =
			"SELECT " +
			"CONCAT(" +
			concat +
			")" +
			" AS 'key' , " +
			value +
			" AS 'value', " +
			concat +
			", " +
			value +
			" FROM `" +
			entity +
			"` AS a ";
		if (entity === "project" && req.user.is_system_user != true) {
			var conditions = getConditions(req, entity);
			query += "WHERE " + conditions;
		}
		query += " ORDER BY " + key + " ASC;";
		mysql.query(query, function(error, rows, fields) {
			return res.json({ error: error, rows: rows, fields: fields });
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Performs MySQL INSERT
 ***/
router.post("/insert/", routeHandler.authenticate, function(req, res, next) {
	try {
		var ENTITY = req.body.entity;
		if (accountManager.grantPermission(req, ENTITY, "add") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var FIELDS = req.body.fields;
		var MONGO = req.body.mongo;
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
		mysql.query(QUERY, function(mysql_error, mysql_rows, mysql_fields) {
			if (!mysql_error && MONGO) {
				ROW["id_" + ENTITY] = mysql_rows.insertId;
				var FILTER = {};
				FILTER[MONGO.field] = ROW[MONGO.column];
				MONGO_ROW = {};
				for (k in ROW) {
					if (typeof FIELDS !== "undefined" && FIELDS && FIELDS[k]) {
						if (FIELDS[k].type == "date") {
							MONGO_ROW[k] = new Date(
								Date.parse(ROW[k].replace(" ", "T") + ".000Z")
							);
							continue;
						}
						if (FIELDS[k].type == "json") {
							MONGO_ROW[k] = JSON.parse(ROW[k]);
							continue;
						}
						if (FIELDS[k].type == "checkbox") {
							MONGO_ROW[k] = Boolean(ROW[k].value);
							continue;
						}
					}
					if (ROW[k] != null && undefined != ROW[k].key) {
						MONGO_ROW[k] = ROW[k].value;
						MONGO_ROW[FIELDS[k].foreign_display_field] = ROW[k].key.replace(
							" (#" + ROW[k].value + ")",
							""
						);
						continue;
					}
					MONGO_ROW[k] = ROW[k];
				}
				mongo.connect(function(error, db) {
					db.collection(MONGO.collection).update(
						FILTER,
						{ $set: MONGO_ROW },
						{ upsert: true, multi: false },
						function(error, info) {
							db.close();
							return res.json({
								error: error,
								rows: mysql_rows,
								fields: mysql_fields
							});
						}
					);
				});
			} else {
				return res.json({
					error: mysql_error,
					rows: mysql_rows,
					fields: mysql_fields
				});
			}
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Performs MySQL UPDATE
 ***/
router.post("/update/", routeHandler.authenticate, function(req, res, next) {
	try {
		var MONGO = req.body.mongo;
		var ENTITY = req.body.entity;
		if (accountManager.grantPermission(req, ENTITY, "edit") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var FIELDS = req.body.fields;
		var PRIMARY = req.body.primary;
		var ID = req.body.id;
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
		mysql.query(QUERY, function(mysql_error, mysql_rows, mysql_fields) {
			if (!mysql_error && MONGO) {
				var FILTER = {};
				FILTER[MONGO.field] = ROW[MONGO.column];
				MONGO_ROW = {};
				for (k in ROW) {
					if (typeof FIELDS !== "undefined" && FIELDS && FIELDS[k]) {
						if (FIELDS[k].type == "date") {
							MONGO_ROW[k] = new Date(
								Date.parse(ROW[k].replace(" ", "T") + ".000Z")
							);
							continue;
						}
						if (FIELDS[k].type == "json") {
							MONGO_ROW[k] = JSON.parse(ROW[k]);
							continue;
						}
						if (FIELDS[k].type == "checkbox") {
							MONGO_ROW[k] = Boolean(ROW[k].value);
							continue;
						}
					}
					if (
						ROW[k] != null &&
						undefined != ROW[k].value &&
						undefined != ROW[k].key
					) {
						MONGO_ROW[k] = ROW[k].value;
						MONGO_ROW[FIELDS[k].foreign_display_field] = ROW[k].key.replace(
							" (#" + ROW[k].value + ")",
							""
						);
						continue;
					}
					MONGO_ROW[k] = ROW[k];
				}
				mongo.connect(function(error, db) {
					db.collection(MONGO.collection).update(
						FILTER,
						{ $set: MONGO_ROW },
						{ upsert: true, multi: false },
						function(error, info) {
							db.close();
							return res.json({
								error: error,
								rows: mysql_rows,
								fields: mysql_fields
							});
						}
					);
				});
			} else {
				return res.json({
					error: mysql_error,
					rows: mysql_rows,
					fields: mysql_fields
				});
			}
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Performs MySQL DELETE
 ***/
router.post("/delete/", routeHandler.authenticate, function(req, res, next) {
	try {
		var ENTITY = req.body.entity;
		if (accountManager.grantPermission(req, ENTITY, "delete") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var MONGO = req.body.mongo;
		var PRIMARY = req.body.primary;
		var ID = req.body.id;
		var QUERY = "DELETE FROM ? WHERE ? = ? LIMIT 1";
		QUERY = QUERY.replace("?", ENTITY);
		QUERY = QUERY.replace("?", PRIMARY);
		QUERY = QUERY.replace("?", ID);
		mysql.query(QUERY, function(mysql_error, mysql_rows, mysql_fields) {
			if (!mysql_error && MONGO) {
				var FILTER = {};
				FILTER[MONGO.field] = MONGO.value;
				mongo.connect(function(error, db) {
					db.collection(MONGO.collection).remove(FILTER, function(error, info) {
						db.close();
						return res.json({
							error: error,
							rows: mysql_rows,
							fields: mysql_fields
						});
					});
				});
			} else {
				return res.json({
					error: mysql_error,
					rows: mysql_rows,
					fields: mysql_fields
				});
			}
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 *Performs a SELECT and just retieve the results.
 ***/
router.post("/select/", routeHandler.authenticate, function(req, res) {
	try {
		var entity = req.body.entity;
		if (accountManager.grantPermission(req, entity, "view") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var query = "";
		var schema = entityManager.SCHEMA[entity];
		if (undefined === schema || schema === null) {
			query = "SELECT * FROM `" + entity + "` AS a ";
		} else {
			query = schema.select;
		}
		var conditions = getConditions(req, entity);
		query += " WHERE " + conditions;
		mysql.query(query, function(error, rows, fields) {
			return res.json({ rows: rows });
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 *Performs a SELECT and just retieve the results.
 ***/
router.post("/superselect/", routeHandler.authenticate, function(req, res) {
	try {
		if (req.user.is_system_user === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var entity = req.body.entity;
		var query = "";
		var schema = entityManager.SCHEMA[entity];
		if (undefined === schema || schema === null) {
			query = "SELECT * FROM `" + entity + "` AS a ";
		} else {
			query = schema.select;
		}
		mysql.query(query, function(error, rows, fields) {
			return res.json({ rows: rows });
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Performs special SELECT for users.
 ***/
router.post("/uselect/", routeHandler.authenticate, function(req, res) {
	try {
		if (accountManager.grantPermission(req, "user", "view") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var query = "SELECT id_user, account_user FROM `user`";
		mysql.query(query, function(error, rows, fields) {
			filterResults(req, rows, function(rows) {
				return res.json({ rows: rows });
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Performs MySQLSELECT filtering.
 ***/
router.post("/where/", routeHandler.authenticate, function(req, res) {
	try {
		var entity = req.body.entity;
		if (accountManager.grantPermission(req, entity, "view") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var and = "";
		var key = req.body.key;
		var value = req.body.value;
		var limit = req.body.limit;
		var page = req.body.page;
		var offset = req.body.offset;
		switch (key) {
			case "id_project":
				if (req.user.is_system_user === true) break;
				and = " AND " + getConditions(req, entity);
				break;
			case "parent_project":
				value = req.user.id_project;
				break;
			default:
				and = " AND " + getConditions(req, entity);
		}
		var is_number = req.body.is_number;
		var where = "";
		if (typeof value === "number") {
			where = "= " + value;
		} else if (typeof value === "string") {
			if (value.indexOf("%") === -1) {
				where = " = '" + value + "'";
			} else {
				where = " LIKE '" + value + "'";
			}
		} else {
			if (undefined === is_number || is_number === null) {
				is_number = true;
			}
			if (is_number) {
				where = "IN (" + value.join(",") + ")";
			} else {
				where = "IN ('" + value.join("','") + "')";
			}
		}
		var query =
			"SELECT * FROM `" + entity + "` AS a WHERE " + key + " " + where + " ";
		query += and;
		if (isNaN(limit) === false) {
			if (isNaN(page) === false) {
				query += " LIMIT " + limit;
				query += " OFFSET " + page * limit;
			} else if (isNaN(offset) === false) {
				query += " LIMIT " + limit;
				query += " OFFSET " + offset;
			}
		}
		mysql.query(query, function(error, rows, fields) {
			return res.json({ error: error, rows: rows, fields: fields });
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * Verifies if a value is unique.
 ***/
router.post("/isunique/", routeHandler.authenticate, function(req, res) {
	try {
		var entity = req.body.entity;
		var key = req.body.key;
		var value = req.body.value;
		if (req.query.string) value = "'" + value + "'";
		var query =
			"SELECT (count(*) = 0) AS 'is_unique' FROM `" +
			entity +
			"` WHERE " +
			key +
			" = " +
			value +
			";";
		mysql.query(query, function(error, rows, fields) {
			return res.json({ is_unique: rows[0].is_unique });
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 *
 */
router.post("/events/", routeHandler.authenticate, function(req, res) {
	try {
		if (accountManager.grantPermission(req, "event", "view") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var ID = Number(req.body.id);
		var TIMEZONE = "Pacific/Auckland";
		var START = Number(req.body.start);
		var END = Number(req.body.end);
		var EVENT_DURATION = Number(req.body.event_duration);
		var EVENT_MAGNITUDE = req.body.event_magnitude;
		var QUERY = "SELECT * FROM event WHERE ";
		if (isNaN(ID) === false) {
			QUERY += "id_item = " + ID + " AND ";
		}
		QUERY += getConditions(req, "event");
		mysql.query(QUERY, function(error, rows, fields) {
			var output = { error: error, rows: rows, fields: fields, events: [] };
			if (error) return res.json(error);
			rows.forEach(function(e) {
				var control = JSON.parse(e.control_event);
				var event_start = Date.parse(e.start_date_event);
				var event_end = Date.parse(e.end_date_event);
				var evt = {
					id: e.id_event,
					title: control.label,
					start: moment(event_start),
					end: moment(event_start).add(EVENT_DURATION, EVENT_MAGNITUDE),
					allDay: false,
					backgroundColor: control.background,
					borderColor: control.border
				};
				if (END < event_start) return;
				//NO-REPEAT
				if (e.is_repeat_event === 0) {
					if (event_start < START) return;
					output.events.push(evt);
					return;
				}
				var first_day_start = timezone.tz(event_start, TIMEZONE);
				var first_day_end = first_day_start.clone().endOf("day");
				var second_day_start = first_day_start
					.clone()
					.startOf("day")
					.add(1, "day");
				var last_day_start = timezone.tz(event_end, TIMEZONE).startOf("day");
				var last_day_end = timezone.tz(event_end, TIMEZONE);
				var suffix = " (each ?-? interval, repeating ?)";
				var magnitude = "millisecond";
				var interval = e.interval_event;
				if (e.interval_event % DAY === 0) {
					interval = "day";
					magnitude = e.interval_event / DAY;
				} else if (e.interval_event % HOUR === 0) {
					interval = "hour";
					magnitude = e.interval_event / HOUR;
				} else if (e.interval_event % MINUTE === 0) {
					interval = "minute";
					magnitude = e.interval_event / MINUTE;
				} else if (e.interval_event % SECOND === 0) {
					interval = "second";
					magnitude = e.interval_event / SECOND;
				}
				suffix = suffix.replace("?", interval);
				suffix = suffix.replace("?", magnitude);

				if (e.is_forever_event === 0) {
					if (event_end < START) return;
					suffix = suffix.replace(
						"?",
						"until " + last_day_end.format("YYYY-MM-DD [at] HH:mm")
					);
					if (second_day_start.diff(last_day_end) > 0) {
						output.events.push({
							id: e.id_event,
							title: control.label + suffix,
							start: moment(event_start),
							end: moment(event_end),
							allDay: false,
							backgroundColor: control.background,
							borderColor: control.border
						});
						return;
					}
				} else {
					suffix = suffix.replace("?", "forever");
				}
				output.events.push({
					id: e.id_event,
					title: control.label + suffix,
					start: moment(event_start),
					end: first_day_end,
					allDay: false,
					backgroundColor: control.background,
					borderColor: control.border
				});
				var week = [
					Boolean(e.is_sunday_event),
					Boolean(e.is_monday_event),
					Boolean(e.is_tuesday_event),
					Boolean(e.is_wednesday_event),
					Boolean(e.is_thursday_event),
					Boolean(e.is_friday_event),
					Boolean(e.is_saturday_event)
				];
				var last =
					e.is_forever_event === 1 || END < event_end ? END : event_end;
				last_day_start = timezone.tz(last, TIMEZONE).startOf("day");
				last_day_end = timezone.tz(last, TIMEZONE);
				var days = last_day_end.diff(second_day_start, "days");
				for (k = 0; k < days; k++) {
					var current_start = second_day_start.clone().add(k, "day");
					var weekday = Number(current_start.format("d"));
					if (!week[weekday]) continue;
					output.events.push({
						id: e.id_event,
						title: control.label + suffix,
						start: current_start,
						end: current_start.clone().endOf("day"),
						allDay: true,
						backgroundColor: control.background,
						borderColor: control.border
					});
				}
				if (!week[Number(last_day_start.format("d"))]) return;
				output.events.push({
					id: e.id_event,
					title: control.label + suffix,
					start: last_day_start,
					end: last_day_end,
					allDay: false,
					backgroundColor: control.background,
					borderColor: control.border
				});
			});
			return res.json(output);
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});

router.post("/feedback", routeHandler.authenticate, function(req, res) {
	try {
		var query = "INSERT INTO feedback (id_user,message_feedback) VALUES (?)";
		query = query.replace(
			"?",
			req.body.id_user + ",'" + req.body.message_feedback + "'"
		);
		mysql.query(query, function(error, rows, fields) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
router.post("/subscriptions/get/", routeHandler.authenticate, function(
	req,
	res
) {
	try {
		var query =
			"SELECT mac_item,is_email_subscriptor,is_sms_subscriptor FROM subscriptors_view WHERE id_user = " +
			req.user.id_user;
		mysql.query(query, function(error, rows, fields) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
router.post("/subscriptions/set/", routeHandler.authenticate, function(
	req,
	res
) {
	try {
		delete req.body.id_user;
		var key_list = ["id_user"];
		var value_list = [req.user.id_user];
		var update = "";
		for (b in req.body) {
			var v = Number(req.body[b]);
			key_list.push(b);
			value_list.push(v);
			update += "," + b + "=" + v;
		}
		update = update.substring(1);
		var keys = "(" + key_list.join(",") + ")";
		var values = "(" + value_list.join(",") + ")";
		var query =
			"INSERT INTO subscriptor " +
			keys +
			" VALUES " +
			values +
			" ON DUPLICATE KEY UPDATE " +
			update;
		mysql.query(query, function(error, rows, fields) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		res.json({ error: "FATAL_ERROR" });
	}
});

router.post("/privileges/set/", routeHandler.authenticate, function(req, res) {
	try {
		if (accountManager.grantPermission(req, "privilege", "delete") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		if (accountManager.grantPermission(req, "privilege", "add") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var id_member = Number(req.body.id_member);
		var privileges = req.body.privileges;
		var delete_query =
			"DELETE FROM privilege " + "WHERE id_member = " + id_member;
		var insert_query =
			"INSERT INTO privilege (" +
			"id_member," +
			"id_level," +
			"is_creator_privilege," +
			"is_editor_privilege," +
			"is_destroyer_privilege," +
			"is_global_privilege" +
			") VALUES ";
		var inserts = "";
		privileges.forEach(function(p) {
			inserts +=
				"(" +
				id_member.toString() +
				"," +
				p.id_level.toString() +
				"," +
				Number(p.is_creator_privilege).toString() +
				"," +
				Number(p.is_editor_privilege).toString() +
				"," +
				Number(p.is_destroyer_privilege).toString() +
				"," +
				Number(p.is_global_privilege).toString() +
				"),";
		});
		inserts = inserts.substring(0, inserts.length - 1);
		insert_query += inserts;
		mysql.query(delete_query, function(error, rows, fields) {
			if (error || privileges.length === 0) {
				return res.json({
					error: error,
					rows: rows,
					fields: fields
				});
			}
			mysql.query(insert_query, function(error, rows, fields) {
				return res.json({
					error: error,
					rows: rows,
					fields: fields
				});
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		res.json({ error: "FATAL_ERROR" });
	}
});

router.post("/collaborators/set/", routeHandler.authenticate, function(
	req,
	res
) {
	try {
		if (
			accountManager.grantPermission(req, "collaborator", "delete") === false
		) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		if (accountManager.grantPermission(req, "collaborator", "add") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var id_project = Number(req.body.id_project);
		var id_user = Number(req.body.id_user);
		var zones = req.body.zones;
		var delete_query =
			"DELETE FROM collaborator " +
			"WHERE id_user = " +
			id_user +
			" AND id_zone IN (SELECT id_zone FROM zones_view WHERE id_project = " +
			id_project +
			" )";
		var insert_query = "INSERT INTO collaborator (id_user,id_zone) VALUES ";
		var inserts = "";
		zones.forEach(function(z) {
			inserts += "(" + id_user.toString() + "," + z.toString() + "),";
		});
		inserts = inserts.substring(0, inserts.length - 1);
		insert_query += inserts;
		mysql.query(delete_query, function(error, rows, fields) {
			if (error || zones.length === 0) {
				return res.json({
					error: error,
					rows: rows,
					fields: fields
				});
			}
			mysql.query(insert_query, function(error, rows, fields) {
				return res.json({
					error: error,
					rows: rows,
					fields: fields
				});
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		res.json({ error: "FATAL_ERROR" });
	}
});

router.post("/collaborators/get/", routeHandler.authenticate, function(
	req,
	res
) {
	try {
		if (accountManager.grantPermission(req, "collaborator", "view") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var query =
			"SELECT id_zone FROM collaborator WHERE id_user = " + req.body.id_user;
		mysql.query(query, function(error, rows, fields) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		res.json({ error: "FATAL_ERROR" });
	}
});
router.post("/popups/", routeHandler.authenticate, function(req, res) {
	try {
		var meta = req.user.metadata_user;
		if (undefined === meta || meta === null) meta = {};
		if (undefined === meta.popups || meta.popups === null) meta.popups = {};
		meta.popups[req.body.popup] = true;
		var input = "'" + JSON.stringify(meta) + "'";
		var query =
			"UPDATE user " +
			"SET metadata_user = " +
			input +
			" " +
			"WHERE id_user=" +
			req.user.id_user;
		mysql.query(query, function(error, rows, fields) {
			return res.json({
				error: error,
				rows: rows,
				fields: fields
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		res.json({ error: "FATAL_ERROR" });
	}
});

router.post("/stocks/set/", routeHandler.authenticate, function(req, res) {
	try {
		if (accountManager.grantPermission(req, "stock", "delete") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		if (accountManager.grantPermission(req, "stock", "add") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var id_zone = Number(req.body.id_zone);
		var items = req.body.items;
		var delete_query = "DELETE FROM stock WHERE id_zone = " + id_zone;
		var insert_query =
			"INSERT INTO stock (id_zone,id_item,is_metadata_stock,schema_stock) VALUES ";
		var inserts = "";
		items.forEach(function(d) {
			inserts += ",(" + id_zone.toString() + "," + d.join(",") + ")";
		});
		inserts = inserts.substring(1);
		insert_query += inserts;
		mysql.query(delete_query, function(error, rows, fields) {
			if (error || items.length === 0) {
				return res.json({
					error: error,
					rows: rows,
					fields: fields
				});
			}
			mysql.query(insert_query, function(error, rows, fields) {
				return res.json({
					error: error,
					rows: rows,
					fields: fields
				});
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		res.json({ error: "FATAL_ERROR" });
	}
});

router.post("/items/batch/", routeHandler.authenticate, function(req, res) {
	try {
		var ROWS = req.body.rows;
		var KEYS = {
			name_item: false,
			schema_item: false,
			latitude_item: true,
			longitude_item: true,
			id_asset: true,
			id_member: true,
			id_carrier: true,
			id_timezone: true
		};
		var QUERY =
			"INSERT INTO item (" + Object.keys(KEYS).join(",") + ") VALUES ";
		var INSERT = "";
		ROWS.forEach(function(r) {
			INSERT += ",(";
			var values = [];
			for (k in KEYS) {
				var is_number = KEYS[k];
				if (is_number) {
					values.push(r[k]);
					continue;
				}
				values.push("'" + r[k] + "'");
			}
			INSERT += values.join(",");
			INSERT += ")";
		});
		INSERT = INSERT.substring(1);
		QUERY += INSERT;
		mysql.query(QUERY, function(error, rows, fields) {
			if (error) {
				res.json({ error: error });
				return;
			}
			var SELECT =
				"SELECT * FROM item WHERE id_item >= " +
				rows.insertId +
				" ORDER BY id_item ASC LIMIT " +
				rows.affectedRows;
			mysql.query(SELECT, function(error, rows, fields) {
				rows.forEach(function(r, i) {
					ROWS[i].id_item = r.id_item;
					ROWS[i].mac_item = r.mac_item;
					ROWS[i].mac = r.mac_item;
					ROWS[i].hash_item = r.hash_item;
					ROWS[i].schema_item = JSON.parse(r.schema_item);
				});
				mongo.connect(function(error, db) {
					db.collection("items").insertMany(ROWS, function(error, info) {
						db.close();
						return res.json({
							output: ROWS,
							error: error,
							rows: rows,
							fields: fields
						});
					});
				});
			});
		});
	} catch (error) {
		notifyMonitor(req, error);
		res.json({ error: "FATAL_ERROR" });
	}
});
router.post("/account", routeHandler.authenticate, function(req, res) {
	var USER = req.user;
	var output = {};
	var query = "SELECT * FROM members_view WHERE id_user = " + USER.id_user;
	mysql.query(query, function(error, memberships, fields) {
		if (error) return res.json({ error: error });
		memberships.forEach(function(r, i) {
			var id_project = r.id_project.toString();
			output[id_project] = {
				name: r.name_project,
				url: r.url_project.replace("http://", "").replace("https://", ""),
				privileges: [],
				zones: [],
				devices: [],
				collaborations: [],
				subscriptions: []
			};
		});
		mysql.query(query, function(error, privileges, fields) {
			var query =
				"SELECT * FROM privileges_view WHERE id_user = " + USER.id_user;
			mysql.query(query, function(error, privileges, fields) {
				if (error) return res.json({ error: error });
				privileges.forEach(function(r, i) {
					var id_project = r.id_project.toString();
					if (undefined === output[id_project] || output[id_project] === null) {
						output[id_project] = {
							name: r.name_project,
							privileges: [],
							zones: [],
							devices: [],
							collaborations: [],
							subscriptions: []
						};
					}
					output[id_project].privileges.push(r);
				});
				query =
					"SELECT * FROM collaborators_view WHERE id_user = " + USER.id_user;
				mysql.query(query, function(error, collaborations, fields) {
					if (error) return res.json({ error: error });
					collaborations.forEach(function(r, i) {
						var id_project = r.id_project.toString();
						if (
							undefined === output[id_project] ||
							output[id_project] === null
						) {
							output[id_project] = {
								name: r.name_project,
								privileges: [],
								zones: [],
								devices: [],
								collaborations: [],
								subscriptions: []
							};
						}
						output[id_project].collaborations.push(r);
					});

					query =
						"SELECT * FROM subscriptors_view WHERE id_user = " + USER.id_user;
					mysql.query(query, function(error, subscriptions, fields) {
						if (error) return res.json({ error: error });
						subscriptions.forEach(function(r, i) {
							var id_project = r.id_project.toString();
							if (
								undefined === output[id_project] ||
								output[id_project] === null
							) {
								output[id_project] = {
									name: r.name_project,
									privileges: [],
									zones: [],
									devices: [],
									collaborations: [],
									subscriptions: []
								};
							}
							output[id_project].subscriptions.push(r);
						});

						query =
							"SELECT id_item,name_item,name_asset,id_project,name_project,url_project,mac_item,latitude_item,longitude_item FROM items_view WHERE id_user = " +
							USER.id_user;
						mysql.query(query, function(error, devices, fields) {
							if (error) return res.json({ error: error });
							devices.forEach(function(r, i) {
								var id_project = r.id_project.toString();
								if (
									undefined === output[id_project] ||
									output[id_project] === null
								) {
									output[id_project] = {
										name: r.name_project,
										privileges: [],
										zones: [],
										devices: [],
										collaborations: [],
										subscriptions: []
									};
								}
								output[id_project].devices.push(r);
							});
							query =
								"SELECT id_zone,name_zone,name_metadata,id_project,name_project,url_project,polygon_zone FROM zones_view WHERE id_user = " +
								USER.id_user;
							mysql.query(query, function(error, zones, fields) {
								if (error) return res.json({ error: error });
								zones.forEach(function(r, i) {
									var id_project = r.id_project.toString();
									if (
										undefined === output[id_project] ||
										output[id_project] === null
									) {
										output[id_project] = {
											name: r.name_project,
											privileges: [],
											zones: [],
											devices: [],
											collaborations: [],
											subscriptions: []
										};
									}
									try {
										zones[i].polygon_zone = JSON.parse(r.polygon_zone);
										zones[i].polygon_zone = r.geometry.coordinates[0];
										zones[i].polygon_zone.forEach(function(c, j) {
											zones[i].polygon_zone[j] = [c[1], c[0]];
										});
									} catch (e) {
										zones[i].polygon_zone = null;
									}
									zones[i].name_metadata = JSON.parse(r.name_metadata);
									output[id_project].zones.push(zones[i]);
								});
								return res.json(output);
							});
						});
					});
				});
			});
		});
	});
});
/***
 * Performs MySQLSELECT filtering.
 ***/
router.post("/assets/", routeHandler.authenticate, function(req, res) {
	try {
		var entity = "asset";
		if (accountManager.grantPermission(req, entity, "view") === false) {
			return res.json({ error: "NO_PRIVILEGES", privileges: false });
		}
		var id = req.body.id;
		var where = "";
		if (undefined === id || id === null || isNaN(id) === true) {
			var value =
				"'" +
				req.body.value
					.toString()
					.split(" ")
					.join("|") +
				"'";
			var is_trusted = req.body.trusted;
			var is_owner = req.body.owner;
			where =
				"(" +
				"name_asset REGEXP " +
				value +
				" OR " +
				"model_asset REGEXP " +
				value +
				" OR " +
				"manufacturer_asset REGEXP " +
				value +
				" OR " +
				"tags_asset REGEXP " +
				value +
				") ";
			if (is_trusted === true) {
				where += "AND " + "is_trusted_asset = 1 ";
			}
			if (is_owner === true) {
				where += "AND id_user = " + req.user.id_user + " ";
			} else {
				where +=
					"AND " +
					"(" +
					"id_user = " +
					req.user.id_user +
					" " +
					"OR " +
					"is_public_asset = 1 " +
					")";
			}
		} else {
			where = "id_asset = " + id + " ";
			where +=
				"AND " +
				"(" +
				"id_user = " +
				req.user.id_user +
				" " +
				"OR " +
				"is_public_asset = 1 " +
				")";
		}
		var query =
			"SELECT * FROM `assets_view` AS a WHERE " +
			where +
			" ORDER BY name_asset ASC ";
		if (req.body.limit) {
			query += "LIMIT " + req.body.limit;
		}
		mysql.query(query, function(error, rows, fields) {
			if (error) {
				return res.json({ error: error, rows: rows, fields: fields });
			}
			rows.forEach(function(a, i) {
				rows[i].schema_asset = JSON.parse(a.schema_asset);
				rows[i].is_trusted_asset = Boolean(a.is_trusted_asset);
			});
			return res.json({ error: error, rows: rows, fields: fields });
		});
	} catch (error) {
		notifyMonitor(req, error);
		return res.json({ error: "FATAL_ERROR" });
	}
});
/***
 * flush device and then delete it.
 ***/
router.post("/devices/delete", routeHandler.authenticate, function(req, res) {
	var MAC = req.body.mac;
	var query = "DELETE FROM item WHERE mac_item = " + MAC;
	mongo.connect(function(error, db) {
		if (error) return res.json({ error: error });
		db.collection("items").remove(
			{
				mac: MAC
			},
			{ multi: false },
			function(error, info) {
				if (error) return res.json({ error: error });
				db.collection("data").remove(
					{
						mac: MAC
					},
					{ multi: true },
					function(error, info) {
						if (error) return res.json({ error: error });
						db.collection("daily_data").remove(
							{
								"id.mac": MAC
							},
							{ multi: true },
							function(error, info) {
								if (error) return res.json({ error: error });
								db.collection("schedules").remove(
									{
										"control_event.mac": MAC
									},
									{ multi: true },
									function(error, info) {
										if (error) return res.json({ error: error });
										db.collection("events").remove(
											{
												mac: MAC
											},
											{ multi: true },
											function(error, info) {
												if (error) return res.json({ error: error });
												mysql.query(query, function(error, rows, fields) {
													return res.json({
														error: error,
														rows: rows,
														fields: fields
													});
												});
											}
										);
									}
								);
							}
						);
					}
				);
			}
		);
	});
});
router.post("/i18n/set", routeHandler.authenticate, function(req, res) {
	if (req.user.is_system_user === false) {
		return res.json({ privileges: false });
	}
	var configuration = JSON.stringify(req.body.configuration);
	var name = req.body.name;
	var query =
		"UPDATE module " +
		"SET " +
		"configuration_module = '" +
		configuration +
		"' " +
		"WHERE " +
		"name_module = '" +
		name +
		"' " +
		"LIMIT 1";
	mysql.query(query, function(error, rows, fields) {
		return res.json({ error: error, rows: rows, fields: fields });
	});
});
router.post("/project/get", routeHandler.authenticate, function(req, res) {
	if (accountManager.grantPermission(req, "project", "view") === false) {
		return res.json({ error: "NO_PRIVILEGES", privileges: false });
	}
	if (accountManager.grantPermission(req, "route", "view") === false) {
		return res.json({ error: "NO_PRIVILEGES", privileges: false });
	}
	var id = req.body.id;
	var parent_id = req.user.id_project;
	var project_query = "SELECT * FROM project WHERE id_project = " + id;
	var routes_query =
		"SELECT * FROM route " +
		"WHERE id_project IN (" +
		id +
		"," +
		parent_id +
		") OR id_project IS NULL";
	if (id != parent_id) {
		project_query += " AND parent_project = " + parent_id;
	}
	mysql.query(project_query, function(error, rows, fields) {
		var project = null;
		if (rows.length > 0) {
			project = rows[0];
			project.is_public_project = Boolean(project.is_public_project);
		}
		mysql.query(routes_query, function(error, routes, fields) {
			return res.json({
				error: error,
				project: project,
				routes: routes,
				fields: fields
			});
		});
	});
});
router.post("/project/set", routeHandler.authenticate, function(req, res) {
	if (accountManager.grantPermission(req, "project", "edit") === false) {
		return res.json({ error: "NO_PRIVILEGES", privileges: false });
	}
	var fields = {
		home_project: "text",
		is_public_project: "boolean",
		name_project: "text",
		url_project: "text"
	};
	var row = req.body.row;
	var id = req.body.id;
	var id_parent = req.user.id_project;
	var query = "UPDATE project SET";
	var update = "";
	for (r in row) {
		update += ", ";
		update += r + " = ";
		var value = row[r];
		var type = fields[r];
		switch (type) {
			case "boolean":
				update += Number(value).toString();
				break;
			default:
				update += "'" + value + "'";
		}
	}
	query += update.substring(1) + " ";
	query += "WHERE id_project = " + id + " ";
	if (id != id_parent) {
		query += "AND  parent_project = " + id_parent;
	}
	mysql.query(query, function(error, rows, fields) {
		return res.json({ error: error, rows: rows, fields: fields });
	});
});
router.post("/capabilities/get", routeHandler.authenticate, function(req, res) {
	if (
		accountManager.grantPermission(req, "capabilities_view", "view") === false
	) {
		return res.json({ error: "NO_PRIVILEGES", privileges: false });
	}
	var id = req.body.id;
	var id_parent = req.user.id_project;
	var query = "SELECT * FROM capabilities_view WHERE id_project = " + id;
	if (id != id_parent) {
		query += " AND parent_project = " + id_parent;
	}
	mysql.query(query, function(error, rows, fields) {
		rows = rows.filter(function(r, i) {
			if (r.is_successor_level === 0) {
				if (r.grandparent_project != null) return false;
				if (r.parent_project != null && id === id_parent) return false;
			}
			rows[i].schema_level = JSON.parse(r.schema_level);
			rows[i].is_creator_capability = Boolean(r.is_creator_capability);
			rows[i].is_editor_capability = Boolean(r.is_editor_capability);
			rows[i].is_destroyer_capability = Boolean(r.is_destroyer_capability);
			rows[i].is_global_capability = Boolean(r.is_global_capability);
			return true;
		});
		return res.json({ error: error, rows: rows, fields: fields });
	});
});
router.post("/capabilities/set", routeHandler.authenticate, function(req, res) {
	if (accountManager.grantPermission(req, "capability", "add") === false) {
		return res.json({ error: "NO_PRIVILEGES", privileges: false });
	}
	if (accountManager.grantPermission(req, "capability", "edit") === false) {
		return res.json({ error: "NO_PRIVILEGES", privileges: false });
	}
	if (accountManager.grantPermission(req, "capability", "delete") === false) {
		return res.json({ error: "NO_PRIVILEGES", privileges: false });
	}
	var capabilities = req.body.capabilities;
	var id = req.body.id;
	var id_parent = req.user.id_project;
	var keys = [
		"is_creator_capability",
		"is_editor_capability",
		"is_destroyer_capability",
		"is_global_capability"
	];
	var insert =
		"INSERT INTO capability (id_project,id_level," +
		keys.join(",") +
		") VALUES ";
	//FILTER LOCAL CAPABILITIES FROM PARENT CAPABILITIES
	values = "";
	update = "";
	keys.forEach(function(k) {
		update += "," + k + "= VALUES(" + k + ")";
	});
	var levels = [];
	capabilities.forEach(function(c) {
		levels.push(c.id_level);
		c.id_project = id;
		values += ",(";
		values += c.id_project + ",";
		values += c.id_level + "";
		keys.forEach(function(k) {
			values += "," + Number(c[k]);
		});
		values += ")";
		return true;
	});
	insert += values.substring(1) + " ";
	insert += "ON DUPLICATE KEY UPDATE " + update.substring(1);
	mysql.query(insert, function(error, rows, fields) {
		if (error) return res.json({ error: error, rows: rows, fields: fields });
		var select =
			"SELECT id_level FROM capability WHERE id_project = " + id_parent;
		mysql.query(select, function(error, rows, fields) {
			if (error) return res.json({ error: error, rows: rows, fields: fields });
			var remove =
				"DELETE FROM capability " +
				"WHERE " +
				"id_project IN (SELECT id_project FROM project WHERE id_project = " +
				id +
				" OR parent_project = " +
				id +
				" ) " +
				" AND " +
				"id_level NOT IN (" +
				levels.join(",") +
				")";
			mysql.query(remove, function(error, rows, fields) {
				if (error)
					return res.json({ error: error, rows: rows, fields: fields });
				return res.json({ error: error, rows: rows, fields: fields });
			});
		});
	});
});
//NODEJS module
module.exports = router;
