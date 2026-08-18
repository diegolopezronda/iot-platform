const connection = require("./connection.js");
/***
 * Handles queries to database and
 * SELECT,INSERT,UPDATE and DELETE queries by giving a table.
 * Gives info about tables,columns from both database and config file.
 ***/
function EntityManager(connection) {
	/***
	 * Connection driver
	 ***/
	this.CONNECTION = connection;
	/***
	 * table name
	 ***/
	this.TABLE = null;
	/***
	 * Stores field names, data types, maximum lengths, AUTOINCREMENT and DEFAULT policies
	 ***/
	this.FIELDS = {};
	/***
	 * Stores PRIMARY KEY from SHOW CREATE TABLE.
	 ***/
	this.PRIMARY = null;
	/***
	 * Stores INDEX, UNIQUE, PRIMARY indexes from SHOW CREATE TABLE.
	 ***/
	this.INDEXES = {};
	/***
	 * Stores FOREIGN KEYS from SHOW CREATE TABLE.
	 ***/
	this.CONSTRAINTS = {};
	/***
	 * Stores rows from constraints.
	 ***/
	this.BINDINGS = {};
	/***
	 * Stores aliases, display fields, when different fields
	 * and tables should be displayed. This array contains
	 * Every information that SHOW CREATE TABLE query can't output
	 ***/
	this.CONFIG = null;
	/***
	 * Stores a SELECT statement.
	 ***/

	this.DEFAULT_SELECT_STRING = "SELECT a.* FROM `?` AS a ";
	this.SELECT_STRING = this.DEFAULT_SELECT_STRING;
	/***
	 * Stores a SELECT by PRIMARY  statement.
	 ***/

	this.DEFAULT_SELECT_PRIMARY_STRING = "SELECT a.* FROM `?` AS a ";
	this.SELECT_PRIMARY_STRING = this.DEFAULT_SELECT_PRIMARY_STRING;
	/***
	 * MYSQL TYPE TO JS TYPES
	 ***/
	this.JS_TYPES = {
		tinyint: "checkbox",
		integer: "number",
		int: "number",
		mediumint: "number",
		bigint: "number",
		smallint: "number",
		decimal: "number",
		numeric: "number",
		float: "number",
		double: "number",
		blob: "textarea",
		text: "textarea",
		longtext: "textarea",
		varchar: "text",
		char: "text",
		binary: "text",
		barbinary: "text",
		enum: "text",
		set: "text",
		date: "date",
		timestamp: "date"
	};
	this.MAGIC_QUERY =
		"SELECT " +
		"t.TABLE_NAME AS `table`," +
		"c.COLUMN_NAME AS `field`," +
		"c.ORDINAL_POSITION AS `position`," +
		"c.DATA_TYPE AS `mysql_type`," +
		"c.COLUMN_COMMENT AS `comment`," +
		"c.IS_NULLABLE AS `required`," +
		"t.TABLE_TYPE AS `table_type`," +
		"c.CHARACTER_MAXIMUM_LENGTH AS `maxlength`," +
		"c.EXTRA AS `extra`," +
		"n.CONSTRAINT_TYPE  AS `constraint`," +
		"k.REFERENCED_TABLE_NAME AS `foreign_table`," +
		"k.REFERENCED_COLUMN_NAME AS `foreign_field`," +
		"k.REFERENCED_COLUMN_NAME AS `foreign_display_field`" +
		"FROM INFORMATION_SCHEMA.TABLES t " +
		"LEFT JOIN INFORMATION_SCHEMA.COLUMNS c " +
		"ON t.TABLE_SCHEMA=c.TABLE_SCHEMA AND t.TABLE_NAME=c.TABLE_NAME " +
		"LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k " +
		"ON c.TABLE_SCHEMA=k.TABLE_SCHEMA AND c.TABLE_NAME=k.TABLE_NAME " +
		"AND c.COLUMN_NAME=k.COLUMN_NAME " +
		"LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS n " +
		"ON k.CONSTRAINT_SCHEMA=n.CONSTRAINT_SCHEMA " +
		"AND k.CONSTRAINT_NAME=n.CONSTRAINT_NAME " +
		"AND k.TABLE_SCHEMA=n.TABLE_SCHEMA AND k.TABLE_NAME=n.TABLE_NAME " +
		"WHERE t.TABLE_TYPE IN ('BASE TABLE','VIEW') AND t.TABLE_SCHEMA = 'sensum';";
	this.SCHEMA = {};
	this.constructor();
}
EntityManager.prototype = {
	/***
	 * Does the motherfucking whole job, yeah.
	 ***/
	constructor: function() {
		var _this = this;
		this.CONNECTION.query(this.MAGIC_QUERY, function(error, rows, fields) {
			var tables = {};
			rows.forEach(function(r) {
				r.view = r.table_type === "VIEW";
				r.label = r.field
					.replace("_" + r.table, "")
					.replace(/^id$/g, "#")
					.replace(/^id_/g, "")
					.replace(/url/g, "URL")
					.replace(/mac/g, "MAC")
					.replace(/json/g, "JSON")
					.replace(/_/g, " ");
				r.label = r.label.charAt(0).toUpperCase() + r.label.substring(1);
				if (r.label.indexOf("Is ") === 0) r.label += "?";
				r.auto_increment = r.extra === "auto_increment";
				var key =
					r.constraint === null
						? null
						: r.constraint
								.replace(" KEY", "")
								.replace("FOREIGN", "constraint")
								.toLowerCase();
				r.unique = false;
				r.primary = false;
				r.constraint = false;
				r.required = r.required === "YES" ? false : true;
				r.type = _this.JS_TYPES[r.mysql_type];
				if (key !== null) r[key] = true;
				if (undefined === tables[r.table] || tables[r.table] === null) {
					tables[r.table] = {
						view: r.view,
						fields: {},
						constraints: [],
						primary: null,
						display_fields: [],
						select: "SELECT ? FROM " + r.table + " AS a ",
						project: [],
						member: [],
						user: [],
						zone: [],
						item: [],
						conditions: "",
						project_conditions: "",
						owner_conditions: ""
					};
				}
				tables[r.table].select = tables[r.table].select.replace(
					"?",
					", a." + r.field + " ?"
				);
				switch (key) {
					case "primary":
						r.unique = true;
						tables[r.table].primary = r.field;
						tables[r.table].display_field = r.field;
						tables[r.table].display_fields.push(r.field);
						switch (r.table) {
							case "project":
								if (r.field === "parent_project") break;
							case "member":
							case "zone":
								if (r.field === "parent_zone") break;
							case "item":
							case "user":
								tables[r.table][r.table].push(
									"(" +
										"a." +
										r.field +
										" IS NULL OR " +
										"a." +
										r.field +
										" IN ($" +
										r.field.toUpperCase() +
										"))"
								);
								break;
							default:
							//NOTHING
						}
						break;
					case "unique":
						tables[r.table].display_fields.push(r.field);
						break;
					case "constraint":
						tables[r.table].constraints.push(r.field);
						switch (r.foreign_table) {
							case "project":
								if (r.field === "parent_project") break;
							case "member":
							case "zone":
								if (r.field === "parent_zone") break;
							case "item":
							case "user":
								tables[r.table][r.foreign_table].push(
									"(" +
										"a." +
										r.field +
										" IS NULL OR " +
										"a." +
										r.field +
										" IN ($" +
										r.foreign_field.toUpperCase() +
										"))"
								);
								break;
							default:
							//NOTHING
						}
						r.type = "binded";
						r.foreign_alias = [r.foreign_table, r.foreign_field].join(".");
						r.foreign_display_field = r.foreign_field;
						tables[r.table].select +=
							"LEFT JOIN `" +
							r.foreign_table +
							"` AS a" +
							r.position +
							" " +
							"ON a" +
							r.position +
							"." +
							r.foreign_field +
							" = " +
							" a." +
							r.field +
							" ";
						tables[r.table].select = tables[r.table].select.replace(
							"?",
							", a" +
								r.position +
								"." +
								r.foreign_display_field +
								" AS '" +
								r.foreign_alias +
								"'" +
								"?"
						);
						break;
					default:
					//nothing
				}
				if (r.view === true) {
					switch (r.field) {
						case "id_project":
						case "id_member":
						case "id_user":
						case "id_zone":
						case "id_item":
							tables[r.table][r.field.replace("id_", "")].push(
								"(" +
									"a." +
									r.field +
									" IS NULL OR " +
									"a." +
									r.field +
									" IN ($" +
									r.field.toUpperCase() +
									"))"
							);
							break;
						default:
						//NOTHING
					}
				}
				tables[r.table].fields[r.field] = {};
				for (x in r) tables[r.table].fields[r.field][x] = r[x];
			});
			for (t in tables) {
				tables[t].field_list = Object.keys(tables[t].fields);
				tables[t].select = tables[t].select
					.replace("SELECT ,", "SELECT ")
					.replace("?", "");
				//SELECT IN PROJECT SCOPE
				tables[t].project_select = tables[t].select;
				if (tables[t].project.length > 0) {
					var project = "(" + tables[t].project.join(" AND ") + ")";
					tables[t].project_conditions = project;
					tables[t].project_select += " WHERE " + project;
				}
				//SELECT IN OWNER SCOPE
				var mix = [];
				if (tables[t].member.length > 0) {
					mix.push("(" + tables[t].member.join(" AND ") + ")");
				}
				if (tables[t].user.length > 0) {
					mix.push("(" + tables[t].user.join(" AND ") + ")");
				}
				if (tables[t].item.length > 0) {
					mix.push("(" + tables[t].item.join(" AND ") + ")");
				}
				if (tables[t].zone.length > 0) {
					mix.push("(" + tables[t].zone.join(" AND ") + ")");
				}
				if (mix.length > 0) {
					var owner = "(" + mix.join(" OR ") + ")";
					tables[t].owner_conditions = owner;
					tables[t].owner_select = tables[t].project_select;
					if (tables[t].project.length === 0) {
						tables[t].owner_select += " WHERE " + owner;
						tables[t].conditions = owner;
					} else {
						tables[t].owner_select += " AND " + owner;
						tables[t].conditions =
							"(" + owner + " AND " + tables[t].project_conditions + ")";
					}
				}
				//SELECT BY ID
				tables[t].id_select =
					tables[t].select + " WHERE a." + tables[t].primary + " = ?";
			}
			_this.SCHEMA = tables;
			//PLATFORM MANAGER EXTENSION
			_this.SCHEMA = _this.getProjectConstraints(_this.SCHEMA);
		});
	},
	getProjectConstraints: function(input) {
		var JOIN = " LEFT JOIN @T1 AS a@A1 ON a@A1.@I1 = a@A2.@I2";
		var SELECT = "a@A1.@I1 AS `@T1.@I2`, ";
		var WHERE = " WHERE a@I1.id_project IN ($ID_PROJECT) ";
		var PARENT_WHERE =
			" WHERE (" +
			"a@I1.id_project IN ($ID_PROJECT) OR " +
			"a@I1.parent_project IN ($ID_PROJECT) OR " +
			"a@I2.parent_project IN ($ID_PROJECT) " +
			")";

		//TODO ADD PARENT PROJECT SUPPORT
		for (s in input) {
			var links = this.findProjectLink(s);
			if (links === null) continue;
			var select = "SELECT ";
			var schema = input[s];
			if (links[0].table === "project" || links[0].field === "id_project") {
				select += SELECT.replace(/@T1/g, "project")
					.replace(/\@A1/g, schema.fields.id_project.position)
					.replace(/\@I1/g, "name_project")
					.replace(/\@I2/g, "name_project");
			}
			var len = links.length;
			var join = "";
			var m = schema.field_list.length;
			var n = schema.fields[links[0].field].position;
			var cross_key = null;
			for (var l = 1; l < len; l++) {
				var crnt_link = links[l];
				var fk = this.SCHEMA[crnt_link.table].fields[crnt_link.field];
				if (crnt_link.table === "project" && cross_key === null) {
					cross_key = n;
				}
				++m;
				join += JOIN.replace(/@T1/g, fk.foreign_table)
					.replace(/\@A1/g, m)
					.replace(/\@A2/, n)
					.replace(/\@I1/g, fk.foreign_field)
					.replace(/\@I2/g, crnt_link.field);
				input[s].fields[crnt_link.field] = fk;
				input[s].fields[crnt_link.field].field =
					(crnt_link.table_alias || fk.foreign_table) + "." + crnt_link.field;
				input[s].fields[crnt_link.field].foreign_alias =
					(crnt_link.table_alias || fk.foreign_table) +
					"." +
					this.SCHEMA[fk.foreign_table].display_field;

				select += SELECT.replace(
					/@T1/g,
					crnt_link.table_alias || fk.foreign_table
				)
					.replace(/\@A1/g, m)
					.replace(/\@I1/g, fk.foreign_field)
					.replace(/\@I2/g, crnt_link.field);
				select += SELECT.replace(
					/@T1/g,
					crnt_link.table_alias || fk.foreign_table
				)
					.replace(/\@A1/g, m)
					.replace(/\@I1/g, this.SCHEMA[fk.foreign_table].display_field)
					.replace(/\@I2/g, this.SCHEMA[fk.foreign_table].display_field);
				n = m;
			}
			/*
			select += SELECT.replace(/@T1/g, "project")
				.replace(/\@A1/g, m)
				.replace(/\@I1/g, "parent_project")
				.replace(/\@I2/g, "parent_parent_project");
*/
			//CROSS-PROJECT
			console.log(
				input[s].project_select.split("WHERE")[0].replace(/SELECT /, select)
			);
			input[s].cross_select = input[s].project_select
				.split("WHERE")[0]
				.replace(/SELECT /, select);
			input[s].cross_select += join;
			input[s].cross_select += PARENT_WHERE.replace(/\@I1/g, cross_key).replace(
				/\@I2/g,
				n
			);
			//LOCAL SELECT
			input[s].project_select = input[s].project_select
				.split("WHERE")[0]
				.replace(/SELECT /, select);
			input[s].project_select += join;
			input[s].project_select += WHERE.replace(/\@I1/g, cross_key);
		}
		return input;
	},
	findProjectLink: function(table) {
		if (undefined === table) return;
		var schema = this.SCHEMA[table];
		var constraints = schema.constraints;
		//if(undefined === constraints) constraints = [];
		var clen = constraints.length;
		for (var c = 0; c < clen; c++) {
			var constraint = constraints[c];
			var field = schema.fields[constraint];
			if (
				field.foreign_table === "project" &&
				field.foreign_field === "id_project"
			) {
				return [
					{ table: table, field: constraint },
					{
						table: "project",
						field: "parent_project",
						table_alias: "parent_project"
					}
				];
			}
		}
		for (var c = 0; c < clen; c++) {
			var constraint = constraints[c];
			var field = schema.fields[constraint];
			if (field.foreign_table === table) continue;
			var resources = this.findProjectLink(field.foreign_table);
			if (resources === null) continue;
			resources = [{ table: table, field: constraint }].concat(resources);
			return resources;
		}
		return null;
	},
	exists: function(n) {
		return !(undefined === n || n === null);
	},
	/***
	 *
	 ***/
	manageFromLocal: function(table, adapters) {
		var _this = this;
		var output = this.SCHEMA[table];
		var t = table;
		if (!this.exists(adapters)) adapters = {};
		var adapter = adapters[t];
		if (!this.exists(adapter)) adapter = {};
		//Matching display field
		var display_field = adapter.display_field;
		if (this.exists(display_field)) {
			output.display_field = display_field;
		}
		//Matching inputs
		var inputs = adapter.inputs;
		if (!this.exists(inputs)) inputs = {};
		for (f in output.fields) {
			var input = inputs[f];
			if (!this.exists(input)) input = {};
			for (k in input) {
				if (input[k] === null) continue;
				output.fields[f][k] = input[k];
			}
			var field = output.fields[f];
			if (field.constraint === true) {
				var foreign_adapter = adapters[field.foreign_table];
				if (this.exists(foreign_adapter)) {
					var foreign_display_field = foreign_adapter.display_field;
					if (this.exists(foreign_display_field)) {
						var p = "a" + field.position.toString() + ".";
						var old_foreign_display_field = field.foreign_display_field;
						if (field.foreign_table === t) {
							old_foreign_display_field = output.primary;
						}
						var old_foreign_alias = field.foreign_alias;
						var foreign_alias = [
							field.foreign_table,
							foreign_display_field
						].join(".");
						if (
							this.exists(foreign_adapter.inputs) &&
							this.exists(foreign_adapter.inputs[foreign_display_field])
						) {
							output.fields[f].foreign_field_type =
								foreign_adapter.inputs[foreign_display_field].type;
						}
						output.fields[f].foreign_alias = foreign_alias;
						output.fields[f].foreign_display_field = foreign_display_field;
						output.select = output.select
							.replace(old_foreign_alias, foreign_alias)
							.replace(
								", " + p + old_foreign_display_field,
								", " + p + foreign_display_field
							);
					}
				}
			}
		}
		delete adapter.inputs;
		delete adapter.display_field;
		//Matching everything else
		for (k in adapter) {
			if (adapter[k] === null) continue;
			output[k] = adapter[k];
		}
		//SELECT IN PROJECT SCOPE
		output.project_select = output.select;
		if (output.project.length > 0) {
			output.project_select += " WHERE " + output.project_conditions;
		}
		//SELECT IN OWNER SCOPE
		output.owner_select = output.project_select;
		if (
			output.member.length > 0 ||
			output.user.length > 0 ||
			output.item.length > 0 ||
			output.zone.length > 0
		) {
			if (output.project.length === 0) {
				output.owner_select += " WHERE " + output.owner_conditions;
			} else {
				output.owner_select += " AND " + output.owner_conditions;
			}
		}
		output.id_select = output.select + " WHERE a." + output.primary + " = ? ";
		//PLATFORM MANAGER EXTENSION
		var schema = {};
		schema[table] = output;
		try {
			output = this.getProjectConstraints(schema)[table];
		} catch (e) {}
		// :D
		return output;
	},
	/***
	 * Configures singleton for managing CRUD operations over a entity.
	 *
	 * @param table Table name in the current database;
	 *
	 ***/
	manage: function(table, adapters, callback) {
		var _this = this;
		_this.TABLE = table;
		_this.SELECT_STRING = _this.DEFAULT_SELECT_STRING.replace(
			"?",
			_this.TABLE
		).replace("a.*", "?");
		_this.ADAPTERS = adapters;
		if (typeof _this.ADAPTERS === "undefined") _this.ADAPTERS = {};
		_this.CONFIG = _this.ADAPTERS[_this.TABLE];
		//set local Configuration
		if (typeof _this.CONFIG === "undefined") _this.CONFIG = {};
		if (typeof _this.CONFIG.display_field === "undefined")
			_this.CONFIG.display_field = null;
		if (typeof _this.CONFIG.inputs === "undefined") _this.CONFIG.inputs = {};
		//Then  we obtain fields,lengths,comment,keys and constraints.
		var query = "SHOW CREATE TABLE `?`".replace("?", _this.TABLE);
		_this.CONNECTION.query(query, function(error, rows, fields) {
			_this.CREATE = rows[0]["Create Table"];
			if (undefined === _this.CREATE || _this.CREATE === null) {
				_this.CREATE = rows[0]["Create View"];
			}
			//Then we prepare it for clasifying.
			var mysql_create = _this.CREATE.split("\n");
			var last_line = mysql_create[mysql_create.length - 1];
			_this.COMMENT = last_line.replace(/^.*COMMENT='|'$/g, "");
			if (_this.COMMENT == last_line) _this.COMMENT = "";
			mysql_create.pop();
			mysql_create.shift();
			//FIELDS
			//We filter the rows of CREATE TABLE that matches with fields.
			//We will sanitize the field type, null type, default and autoincrement.
			//Then we associate a DOM form element to field type.
			//Finally we override DOM form element, if exists someone in CONFIG.
			_this.FIELDS = {};
			var a = 0;
			mysql_create.forEach(function(line) {
				var line_type = line.replace(/^\s{2}|\s.*$/g, "");
				switch (line_type) {
					case "KEY":
						var field = line.replace(
							/^\s{2}KEY\s`[a-z_0-9]*`\s\(`|`\).*$/g,
							""
						);
						_this.FIELDS[field].index = true;
						return;
					case "UNIQUE":
						var fields = line
							.replace(/^\s{2}UNIQUE\sKEY\s`.*`\s\(`|`\).*$/g, "")
							.replace(/`/g, "")
							.split(",");
						fields.forEach(function(f) {
							_this.FIELDS[f].unique = true;
						});
						return;
					case "PRIMARY":
						_this.PRIMARY = line.replace(/^\s{2}PRIMARY\sKEY\s\(`|`\).*$/g, "");
						_this.FIELDS[_this.PRIMARY].primary = true;
						_this.FIELDS[_this.PRIMARY].unique = true;
						return;
					case "CONSTRAINT":
						var field = line.replace(/^.*FOREIGN\sKEY\s\(`|`\).*$/g, "");
						_this.FIELDS[field].constraint = true;
						_this.FIELDS[field].type = "binded";
						_this.FIELDS[field].foreign_table = line.replace(
							/^.*REFERENCES\s`|`.*$/g,
							""
						);
						_this.FIELDS[field].foreign_field = line.replace(
							/^.*REFERENCES.*\(`|`.*$/g,
							""
						);
						//Foreign table display field
						_this.FIELDS[field].foreign_display_field =
							_this.FIELDS[field].foreign_field;
						var foreign_table = _this.FIELDS[field].foreign_table;
						var foreign_adapter = _this.ADAPTERS[foreign_table];
						if (
							typeof foreign_adapter !== "undefined" &&
							typeof foreign_adapter.display_field !== "undefined"
						) {
							_this.FIELDS[field].foreign_display_field =
								foreign_adapter.display_field;
						}
						_this.FIELDS[field].foreign_alias =
							foreign_table + "." + _this.FIELDS[field].foreign_display_field;
						//left join statement
						++a;
						_this.SELECT_STRING += "LEFT JOIN `" + foreign_table + "` AS a" + a;
						_this.SELECT_STRING +=
							" ON a" + a + "." + _this.FIELDS[field].foreign_field + " = ";
						_this.SELECT_STRING += " a." + field + " ";
						_this.SELECT_STRING = _this.SELECT_STRING.replace(
							"?",
							", a" +
								a +
								"." +
								_this.FIELDS[field].foreign_display_field +
								" AS '" +
								_this.FIELDS[field].foreign_alias +
								"'" +
								"?"
						);
						return;
					default:
						if (line.indexOf("`") == 2) {
							var field = line.replace(/^\s{2}`|`\s.*$/g, "");
							var mysql_type = line.replace(/^\s{2}`.*`\s|\(.*$|\s.*$/g, "");
							var type = _this.JS_TYPES[mysql_type];
							var maxlength = null;
							if (["text", "timestamp"].indexOf(type) === -1)
								maxlength = Number(
									line
										.replace(/^\s{2}`[a-z_]*`\s[a-z]*\(|\).*$/g, "")
										.split(",")[0]
								);
							var comment = line.replace(/^.*COMMENT\s'|'.*,.*$/g, "");
							if (comment === line) comment = "";
							var extras = line.replace(
								/^.*\)\s|^`[a-z_]*`\s[a-z]*\s|\s,$|\sCOMMENT.*$/g,
								""
							);
							var required = extras.indexOf("NOT NULL") !== -1;
							var auto_increment = extras.indexOf("AUTO_INCREMENT") !== -1;
							_this.FIELDS[field] = {
								field: field,
								mysql_statement: line,
								mysql_type: mysql_type,
								type: type,
								required: required,
								maxlength: maxlength,
								comment: comment,
								auto_increment: auto_increment
							};
							_this.SELECT_STRING = _this.SELECT_STRING.replace(
								"?",
								", a." + field + " ?"
							);
							if (
								typeof _this.CONFIG.inputs[field] !== "undefined" &&
								typeof _this.CONFIG.inputs[field].wrapper !== "undefined" &&
								typeof _this.CONFIG.inputs[field].wrapper
							)
								_this.FIELDS[field].wrapper =
									_this.CONFIG.inputs[field].wrapper;
							if (
								typeof _this.CONFIG.inputs[field] !== "undefined" &&
								typeof _this.CONFIG.inputs[field].hidden !== "undefined" &&
								typeof _this.CONFIG.inputs[field].hidden
							)
								_this.FIELDS[field].hidden = _this.CONFIG.inputs[field].hidden;
							if (
								typeof _this.CONFIG.inputs[field] !== "undefined" &&
								typeof _this.CONFIG.inputs[field].type !== "undefined" &&
								typeof _this.CONFIG.inputs[field].type
							)
								_this.FIELDS[field].type = _this.CONFIG.inputs[field].type;
						}
				}
			});
			//DISPLAY_FIELD
			//Display field is a field that represents the whole row
			//It might be defined in CONFIG
			//By default, we use PRIMARY KEY.
			if (_this.CONFIG.display_field == null)
				_this.CONFIG.display_field = _this.PRIMARY;
			_this.SELECT_STRING = _this.SELECT_STRING.replace(
				"SELECT ,",
				"SELECT "
			).replace("?", "");
			_this.SELECT_PRIMARY_STRING =
				_this.SELECT_STRING + " WHERE a." + _this.PRIMARY + " = ? ";
			return callback(this);
		});
	},
	/***
	 * Executes a MySQL Query.
	 *
	 * @param query Query statement in SQL language.
	 *
	 * @returns An object that contents if exists: the error, rows and fields.
	 ***/
	execute: function(query) {
		var _this = this;
		var output = {};
		output.error = null;
		output.rows = [];
		output.fields = [];
		_this.CONNECTION.query(query, function(error, rows, fields) {
			output.error = error;
			output.rows = rows;
			output.fields = fields;
			return output;
		});
		return output;
	},
	/***
	 * Performs a SELECT operation, using PRIMARY value as needle.
	 *
	 * @param id Row's primary key value.
	 * @returns An object that contents if exists: the error, row and fields.
	 ***/
	select: function(callback) {
		var _this = this;
		var query = _this.SELECT_STRING;
		_this.CONNECTION.query(query, function(error, rows, fields) {
			var bundle = {
				table: _this.TABLE,
				comment: _this.COMMENT,
				fields: _this.FIELDS,
				primary: _this.PRIMARY,
				config: _this.CONFIG,
				rows: rows,
				error: error
			};
			return callback(bundle);
		});
	},
	/***
	 * Performs a SELECT operation, using PRIMARY value as needle.
	 *
	 * @param id Row's primary key value.
	 * @returns An object that contents if exists: the error, row and fields.
	 ***/
	selectByID: function(id, callback) {
		var _this = this;
		var query = _this.SELECT_PRIMARY_STRING.replace("?", id);
		_this.CONNECTION.query(query, function(error, rows, fields) {
			var bundle = {
				table: _this.TABLE,
				comment: _this.COMMENT,
				fields: _this.FIELDS,
				primary: _this.PRIMARY,
				config: _this.CONFIG,
				rows: rows,
				error: error
			};
			return callback(bundle);
		});
	},
	/***
	 * Retrieves current configuration of instance.
	 *
	 * @return An object with the current configuration.
	 ***/
	getConfiguration: function() {
		var _this = this;
		return {
			table: _this.TABLE,
			comment: _this.COMMENT,
			fields: _this.FIELDS,
			primary: _this.PRIMARY,
			config: _this.CONFIG
		};
	}
};

module.exports = new EntityManager(connection);
