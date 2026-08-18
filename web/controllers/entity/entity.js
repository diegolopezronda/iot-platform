/***
 * Deploys lists, forms and methods for displayinig and updating
 * database tables and row data.
 *
 ***/
function EntityController($routeParams, $rootScope, $scope, $http, $location) {
	/***
	 * AngularJS route parameters,
	 ***/
	this.PARAMS = $routeParams;
	/***
	 * AngularJS scope.
	 ***/
	this.SCOPE = $scope;
	/***
	 * AngularJS root scope.
	 ***/
	this.ROOT = $rootScope;
	/***
	 * Angular JS Http.
	 ***/
	this.HTTP = $http;
	/***
	 * Angular JS Http.
	 ***/
	this.LOCATION = $location;
	/***
	 * List of entity aliases
	 ***/
	this.CONF = this.ROOT.sensum.modules.entity;
	this.POST = this.CONF.post;
	this.U = "undefined";
	/***
	 * Table name in database
	 ***/
	/***
	 * Stores key-value pairs related with foreign key tables rows.
	 ***/
	this.BINDINGS = {};
	this.PREFIX = "ENTITY_";
	/***
	 * Show boolean values for select.
	 ***/
	this.BOOLEAN = [
		{ key: this.CONF.i18n[this.ROOT.sensum.language].YES, value: 1 },
		{ key: this.CONF.i18n[this.ROOT.sensum.language].NO, value: 0 }
	];
	this.NULL_OPTION = { key: "", value: null };
	/***
	 * Stores icon names assotiated to actions
	 ***/
	this.ICONS = {
		list: "table",
		view: "eye",
		add: "plus",
		edit: "pencil",
		delete: "trash"
	};
	this.ADD = "add";
	this.LIST = "list";
	this.EDIT = "edit";
	this.VIEW = "view";
	this.DELETE = "delete";
	this.ERROR_MESSAGE = this.PREFIX + "ERROR";
	this.ERROR_CODES = {
		ER_DUP_ENTRY: this.PREFIX + "DUPLICATE_ERROR"
	};
	this.SUCCESS_MESSAGE = this.PREFIX + "DB_UPDATED_SUCCESSFULLY";
	this.TYPES = {
		text: { icon: "font", text: true },
		password: { icon: "key", text: true },
		number: { icon: "list-ol", text: true },
		email: { icon: "at", text: true },
		date: { icon: "calendar", text: false },
		textarea: { icon: "paragraph", text: false },
		checkbox: { icon: "question", text: false },
		binded: { icon: "chain", text: false },
		json: { icon: "code", text: false },
		i18n: { icon: "language", text: false },
		icon: { icon: "eye", text: true }
	};
	this.CHECKBOX = "checkbox";
	this.JSON = "json";
	this.I18N = "i18n";
	this.DATE = "date";
	this.NUMBER = "number";
	this.BINDED = "binded";
	this.LIMIT = 10;
	this.page = 0;
	this.more = true;
	this.data_search = {};
	this.MYSQL_TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm:ss";
	this.DATETIMEPICKER_OPTIONS = { format: this.MYSQL_TIMESTAMP_FORMAT };
	//START-UP
	this.constructor();
}
//PROTYPE DEFINITION
EntityController.prototype = {
	/***
	 * Controller entry-point. Sets page title.
	 ***/
	constructor: function() {
		var _this = this;
		this.BACKUP_PARAMS = document.location.pathname.substring(1).split("/");
		this.CONF.url_format.forEach(function(u, i) {
			if (u === null || _this.BACKUP_PARAMS.length < i + 1) return;
			_this[u.toUpperCase()] = _this.BACKUP_PARAMS[i];
		});
		this.TABLE = this.CONF.aliases[this.ENTITY].table;
		this.ROOT.page_header = this.ENTITY.replace(/-/g, " ");
		if (typeof this.ID !== this.U) this.ID = Number(this.ID);
		if (typeof this.ACTION === this.U) this.ACTION = this.LIST;
		this.ACTION_LABEL = this.PREFIX + this.ACTION.toUpperCase();
		var params = { entity: this.TABLE, adapters: this.CONF.adapters };
		switch (this.ACTION) {
			case this.ADD:
				return this.deploy(params, true);
			case this.EDIT:
				params.id = this.ID;
				return this.deploy(params, true);
			case this.VIEW:
			case this.DELETE:
				params.id = this.ID;
				return this.deploy(params, false);
			default:
				var filter = this.CONF.adapters[this.TABLE].filter;
				if (undefined != filter && filter != null) {
					params.key = filter.key;
					if (undefined === filter.source || filter.source === null) {
						params.value = filter.value;
					} else {
						params.value = this.ROOT[filter.source][filter.value];
					}
				}
				params.cross_project =
					this.CONF.aliases[this.ENTITY].cross_project || false;
				params.limit = this.LIMIT;
				params.page = this.page;
				return this.deploy(params, false);
		}
	},
	/***
	 * Selects all rows from database table and table's both local and
	 * database configuration.
	 ***/
	deploy: function(params, bind) {
		var _this = this;
		this.HTTP.post(this.POST.deploy[this.ACTION], params).then(function(
			response
		) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = _this.ERROR_MESSAGE);
			delete data.error;
			delete data.table;
			if (this.ID) delete data.rows;
			for (d in data) {
				_this[d.toUpperCase()] = data[d];
			}
			if (undefined === _this.CONFIG) _this.CONFIG = {};
			if (undefined === _this.CONFIG.layout) _this.CONFIG.layout = {};
			if (undefined === _this.CONFIG.layout.actions)
				_this.CONFIG.layout.actions = {};
			if (undefined === _this.CONFIG.layout.actions[_this.ACTION])
				_this.CONFIG.layout.actions[_this.ACTION] = {
					default_top: true,
					default_row: true
				};
			_this.ROOT.optional_description = _this.COMMENT;
			if (undefined === _this.ROWS || _this.ROWS === null) {
				_this.ROWS = [{}];
			}
			_this.ROWS = _this.deployRows(_this.ROWS);
			for (f in _this.FIELDS) {
				var field = _this.FIELDS[f];
				if (
					!(
						undefined === field.hidden ||
						field.hidden === null ||
						field.hidden.indexOf(_this.ACTION) === -1
					)
				) {
					delete _this.FIELDS[f];
					continue;
				}
				if (!bind) continue;
				if (field.constraint) _this.bindForeignKey(f);
				if (field.type !== _this.CHECKBOX) continue;
				_this.bindBoolean(f);
			}
			if (_this.ID) _this.ROW = _this.ROWS[0];
			if (!_this.ROW) return;
			for (r in _this.ROW) {
				if (r.indexOf(".") != -1) delete _this.ROW[r];
			}
			_this.ROOT.$applyAsync(function() {
				$(".datetimepicker").each(function() {
					var field = $(this).attr("name");
					if (_this.FIELDS[field].type != "date") return;
					_this.DATETIMEPICKER_OPTIONS.defaultDate = _this.ROW[field] + "Z";
					$(this).datetimepicker(_this.DATETIMEPICKER_OPTIONS);
					$(this).on("dp.change", function(e) {
						_this.ROW[field] = e.date
							.utc()
							.format(_this.MYSQL_TIMESTAMP_FORMAT);
					});
				});
			});
		});
	},
	deployRows: function(rows) {
		var _this = this;
		rows.forEach(function(r, i) {
			for (f in _this.FIELDS) {
				var field = _this.FIELDS[f];
				if (
					!(
						undefined === field.hidden ||
						field.hidden === null ||
						field.hidden.indexOf(_this.ACTION) === -1 ||
						f === _this.PRIMARY
					)
				) {
					delete rows[i][f];
					continue;
				}
				switch (field.type) {
					case _this.NUMBER:
						rows[i][f] = rows[i][f] === null ? null : Number(rows[i][f]);
						break;
					case _this.DATE:
						if (r === null) return;
						rows[i][f] = moment(Date.parse(rows[i][f])).format(
							_this.MYSQL_TIMESTAMP_FORMAT
						);
						break;
					case _this.BINDED:
						var bind_type = field.foreign_field_type;
						switch (bind_type) {
							case _this.I18N:
								if (
									undefined != r[field.foreign_alias] &&
									r[field.foreign_alias] != null
								) {
									rows[i][field.foreign_alias] =
										r[field.foreign_alias][_this.ROOT.sensum.language];
								}
								break;
							default:
							//Nothing
						}
						break;
					default:
					//DO NOTHING
				}
			}
		});
		return rows;
	},
	getNextPage: function() {
		++this.page;
		var params = { entity: this.TABLE, adapters: this.CONF.adapters };
		var filter = this.CONF.adapters[this.TABLE].filter;
		if (undefined != filter && filter != null) {
			params.key = filter.key;
			if (undefined === filter.source || filter.source === null) {
				params.value = filter.value;
			} else {
				params.value = this.ROOT[filter.source][filter.value];
			}
		}
		params.limit = this.LIMIT;
		params.page = this.page;
		if (Object.keys(this.data_search).length > 0) {
			params.filter = this.data_search;
		}
		params.cross_project =
			this.CONF.aliases[this.ENTITY].cross_project || false;
		var _this = this;
		this.HTTP.post(this.POST.deploy[this.ACTION], params).then(function(
			response
		) {
			var data = response.data;
			if (data.error) {
				--_this.page;
				return (_this.ROOT.error = _this.ERROR_MESSAGE);
			}
			_this.more = true;
			if (data.rows.length < _this.LIMIT) _this.more = false;
			data.rows = _this.deployRows(data.rows);
			_this.ROWS = _this.ROWS.concat(data.rows);
		});
	},
	/***
	 *
	 ***/
	bindBoolean: function(field) {
		if (typeof this.ROW === this.U || !this.ROW) return;
		var value = this.ROW[field];
		this.ROW[field] = this.BOOLEAN.filter(function(input) {
			return input.value === value;
		})[0];
	},
	/***
	 * Obtains the list of possible foreign keys values.
	 ***/
	bindForeignKey: function(field) {
		var _this = this;
		var params = _this.FIELDS[field];
		var isI18N = false;
		var bind_type = params.foreign_field_type;
		isI18N = bind_type === _this.I18N;
		_this.HTTP.post(_this.POST.deploy.bind, params).then(function(response) {
			var data = response.data;
			if (typeof data.error !== _this.U && data.error)
				return (_this.ROOT.error = _this.ERROR_MESSAGE);
			data.rows.forEach(function(r, i) {
				if (isI18N) {
					data.rows[i].key = JSON.parse(r.key)[_this.ROOT.sensum.language];
				}
				data.rows[i].key += " (#" + r.value + ")";
			});
			_this.BINDINGS[field] = [];
			if (params.required === false)
				_this.BINDINGS[field].push(_this.NULL_OPTION);
			_this.BINDINGS[field] = _this.BINDINGS[field].concat(data.rows);
			if (typeof _this.ROW === _this.U || !_this.ROW) return;
			var value = _this.ROW[field];
			_this.ROW[field] = _this.BINDINGS[field].filter(function(input, index) {
				return input.value === value;
			})[0];
		});
	},
	searchData: function() {
		var _this = this;
		for (s in this.data_search) {
			var d = this.data_search[s];
			if (undefined === d || d === null || d.toString().length === 0) {
				delete this.data_search[s];
			}
		}
		if (Object.keys(this.data_search).length === 0) return;
		++this.page;
		var params = { entity: this.TABLE, adapters: this.CONF.adapters };
		var filter = this.CONF.adapters[this.TABLE].filter;
		if (undefined != filter && filter != null) {
			params.key = filter.key;
			if (undefined === filter.source || filter.source === null) {
				params.value = filter.value;
			} else {
				params.value = this.ROOT[filter.source][filter.value];
			}
		}
		params.filter = this.data_search;
		params.limit = this.LIMIT;
		params.page = 0;
		this.HTTP.post(this.POST.deploy[this.ACTION], params).then(function(
			response
		) {
			var data = response.data;
			if (data.error) {
				--_this.page;
				return (_this.ROOT.error = _this.ERROR_MESSAGE);
			}
			_this.more = true;
			if (data.rows.length < _this.LIMIT) _this.more = false;
			_this.ROWS = _this.deployRows(data.rows);
			_this.page = 0;
		});
	},
	/***
	 * Applies changes
	 ***/
	submit: function() {
		var _this = this;
		var params = {
			entity: this.TABLE,
			primary: this.PRIMARY,
			fields: this.FIELDS
		};
		for (f in _this.FIELDS) {
			var field = _this.FIELDS[f];
			if (_this.ROW[f] === null) continue;
			if ([this.JSON, this.I18N].indexOf(field.type) > -1) {
				_this.ROW[f] = JSON.stringify(_this.ROW[f]).replace(/'/g, "\\'");
			} else if (field.type === this.NUMBER) {
				_this.ROW[f] = Number(_this.ROW[f]);
			}
		}
		this.MONGO = this.CONF.adapters[this.TABLE].mongo;
		if (typeof this.MONGO !== this.U && this.MONGO && this.ROW) {
			this.MONGO.value = this.ROW[this.MONGO.column];
			if (this.MONGO.is_number) this.MONGO.value = Number(this.MONGO.value);
			params.mongo = this.MONGO;
		}
		var redirect = location.pathname.replace(this.ACTION, "view");
		switch (this.ACTION) {
			case this.ADD:
				params.row = this.ROW;
				break;
			case this.EDIT:
				params.id = this.ID;
				params.row = this.ROW;
				break;
			case this.DELETE:
				params.id = this.ID;
				redirect = location.pathname
					.replace(this.ACTION + "/", "")
					.replace(this.ID, "");
				break;
			default:
				return;
		}
		if (_this.ACTION === _this.DELETE) {
			$("#entity-modal").on("hidden.bs.modal", function() {
				$(".modal-backdrop").remove();
				$("body").removeClass("modal-open");
				_this.requestChanges(params, redirect);
			});
			return;
		}
		this.requestChanges(params, redirect);
	},
	requestChanges: function(params, redirect) {
		var _this = this;
		this.HTTP.post(this.POST.submit[this.ACTION], params).then(function(
			response
		) {
			var data = response.data;
			for (f in _this.FIELDS) {
				var field = _this.FIELDS[f];
				if (_this.ROW[f] === null) continue;
				if ([_this.JSON, _this.I18N].indexOf(field.type) > -1) {
					_this.ROW[f] = JSON.parse(_this.ROW[f].replace(/\\'/, "'"));
				}
			}
			if (undefined != data.error && data.error) {
				for (e in _this.ERROR_CODES) {
					if (e === data.error.code)
						return (_this.ROOT.warning = _this.ERROR_CODES[e]);
				}
				return (_this.ROOT.error = _this.ERROR_MESSAGE);
			}
			_this.ROOT.saved_success = _this.SUCCESS_MESSAGE;
			if (_this.ACTION === _this.ADD) redirect += "/" + data.rows.insertId;
			_this.LOCATION.path(redirect);
		});
	},
	/***
	 * Convert ugly headers to beautiful headers.
	 ***/
	humanize: function(header) {
		var output = header
			.replace("_" + this.TABLE, "")
			.replace(/^id$/g, "#")
			.replace(/^id_/g, "")
			.replace(/url/g, "URL")
			.replace(/mac/g, "MAC")
			.replace(/json/g, "JSON")
			.replace(/_/g, " ");
		output = output.charAt(0).toUpperCase() + output.substring(1);
		if (output.indexOf("Is ") === 0) output += "?";
		return output;
	},
	/***
	 * Obtains alias from a table
	 ***/
	getAlias: function(table) {
		for (k in this.CONF.aliases) {
			if (this.CONF.aliases[k].table === table) return k;
		}
		return table;
	},
	sanitizeURL: function(href, id) {
		return href
			.toLowerCase()
			.toString()
			.replace(/:id/g, id.toString());
	}
};
//MODULE DEFINITION
var app = angular
	.module("entity", ["ngRoute"])
	.controller("EntityController", [
		"$routeParams",
		"$rootScope",
		"$scope",
		"$http",
		"$location",
		EntityController
	]);
