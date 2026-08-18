/***
 * Deploys lists, forms and methods for displayinig and updating
 * database tables and row data.
 ***/
function AssetsController($route, $routeParams, $rootScope, $scope, $http) {
	this.ROUTE = $route;
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
	 *
	 ***/
	this.CONF = this.ROOT.sensum.modules.assets;
	this.CONSTANTS = {
		BOOLEAN: [
			{ value: false, label: { en: "No", es: "No" } },
			{ value: true, label: { en: "Yes", es: "Si" } }
		]
	};
	this.i18n = this.ROOT.sensum.language;
	this.BOOLEAN_OPTIONS = [
		{ value: false, label: { en: "No", es: "No" } },
		{ value: true, label: { en: "Yes", es: "Si" } }
	];
	this.CHECK_OPTIONS = [
		{ value: true, label: "Sensum" },
		{ value: false, label: "Third-Party" }
	];
	this.frame = "";
	this.nibbles = [];
	this.result = {};
	this.search_results = [];
	this.search_fields = {
		is_verified_asset: false,
		name_asset: ""
	};
	this.EDITOR_HEADERS = [
		{
			visible: true,
			label: {
				en: "General",
				es: "General"
			},
			kpi: ["name", "label", "description", "origin"]
		},
		{
			visible: true,
			label: {
				en: "Behaviour",
				es: "Comportamiento"
			},
			kpi: [
				"type",
				"control",
				"private",
				"bits",
				"array",
				"signed",
				"package_number"
			]
		},
		{
			visible: true,
			condition: {
				key: "origin",
				value: ["virtual"]
			},
			label: {
				en: "Virtual fields",
				es: "Campos virtuales"
			},
			kpi: ["fxdecimal", "fxfield", "fxscript", "fxparams"]
		},
		{
			visible: true,
			condition: {
				key: "type",
				value: ["number", "decimal"]
			},
			label: {
				en: "Numbers",
				es: "Numeros"
			},
			kpi: [
				"unit",
				"factor",
				"offset",
				"decimals",
				"min",
				"max",
				"group",
				"incremental"
			]
		},
		{
			visible: true,
			condition: {
				key: "type",
				value: ["package"]
			},
			label: {
				en: "Packages",
				es: "Paquetes"
			},
			kpi: ["icon", "structure"]
		},
		{
			visible: true,
			condition: {
				key: "type",
				value: ["multitime"]
			},
			label: {
				en: "Multi-Time Frame",
				es: "Trama multi-temporal"
			},
			kpi: ["rows", "next_frame", "timespan", "row_order"]
		}
	];
	this.is_searching = false;
	this.pristine = true;
	this.asset = {
		id_user: this.ROOT.user.id_user,
		name_asset: "New driver " + Math.floor(Math.random() * 100000),
		model_asset: "Unknown model",
		manufacturer_asset: "Unknown manufacturer",
		id_carrier: 4,
		is_public_asset: false,
		schema_asset: {
			icon: "wifi",
			driver: "sigfox",
			endianess: false,
			human: false,
			bind_packages: false,
			attributes: {}
		}
	};
	this.filters = {};
	this.attribute_list = [];
	this.fxparams_fields = [];
	this.selected_attribute = null;
	this.color_columns = 10;
	this.color_matrix = [];
	this.marker_matrix = [];
	this.json = "";
	this.editor_mode = true;
	this.FRAME_HEADER_PATTERN = "[A,B,C,D,E,F,0-9]*";
	//this.SCOPE.MATH_QUILL = MathQuill.getInterface(2);
	this.FRAME_DIRECTION = true;
	this.SCOPE.EQUATIONS = {};
	this.constructor();
}
//PROTYPE DEFINITION
AssetsController.prototype = {
	/***
	 * Controller entry-point. Sets page title.
	 ***/
	constructor: function() {
		var _this = this;
		this.ROOT.sensum.constants.SENSUM_COLORS.forEach(function(c, i) {
			if (i % _this.color_columns === 0) {
				_this.color_matrix.push([]);
			}
			_this.color_matrix[_this.color_matrix.length - 1].push(c.toUpperCase());
		});
		if (this.PARAMS.id) this.ID = Number(this.PARAMS.id);
		this.ROOT.page_header = this.ID ? "Edit driver" : "New driver";
		for (var c in this.ROOT.sensum.constants) {
			this.CONSTANTS[c] = JSON.parse(
				JSON.stringify(this.ROOT.sensum.constants[c])
			);
		}
		this.getCarriers(function() {
			_this.HTTP.post(
				_this.CONF.post.constants,
				_this.CONF.post.constants_params
			).then(function(response) {
				var data = response.data;
				data.rows.forEach(function(r, i) {
					_this.CONSTANTS[r.name_list] = JSON.parse(r.json_list);
				});
				_this.CONSTANTS.SENSUM_CORE_MARKERS.forEach(function(c, i) {
					if (i % _this.color_columns === 0) {
						_this.marker_matrix.push([]);
					}
					_this.marker_matrix[_this.marker_matrix.length - 1].push(c);
				});
				if (_this.ROOT.user.is_system_user === false) {
					_this.CONSTANTS.SENSUM_CORE_DRIVERS = _this.CONSTANTS.SENSUM_CORE_DRIVERS.filter(
						function(d) {
							return d.system === false;
						}
					);
				}
				_this.CONSTANTS.ORIGINS = {};
				_this.CONSTANTS.SENSUM_CORE_ORIGINS = _this.CONSTANTS.SENSUM_CORE_ORIGINS.filter(
					function(d) {
						_this.CONSTANTS.ORIGINS[d.value] = JSON.parse(JSON.stringify(d));
						return (
							_this.ROOT.user.is_system_user === true || d.system === false
						);
					}
				);
				_this.CONSTANTS.SENSUM_CORE_AVAILABLE_ORIGINS = JSON.parse(
					JSON.stringify(_this.CONSTANTS.SENSUM_CORE_ORIGINS)
				);
				for (k in _this.CONSTANTS.SENSUM_CORE_ASSET_KPIS) {
					var kpi = _this.CONSTANTS.SENSUM_CORE_ASSET_KPIS[k];
					if (undefined === kpi.list) {
						_this.CONSTANTS.SENSUM_CORE_ASSET_KPIS[k].list = null;
					}
				}
				_this.CONSTANTS.SENSUM_CORE_COLORS.forEach(function(c, i) {
					_this.CONSTANTS.SENSUM_CORE_COLORS[
						i
					] = _this.CONSTANTS.SENSUM_CORE_COLORS[i].toUpperCase();
				});
				if (undefined === _this.ID) {
					var dolly = Number(_this.PARAMS.clone);
					if (isNaN(dolly) === false) {
						_this.cloneAssetByID(dolly);
					}
					return;
				}
				var params = {};
				for (p in _this.CONF.post.submit_params) {
					params[p] = _this.CONF.post.submit_params[p];
				}
				params.key = params.primary;
				params.value = _this.ID;
				_this.HTTP.post(_this.CONF.post.asset, params).then(function(response) {
					var data = response.data;
					if (data.error) return (_this.ROOT.error = "ASSETS_ERROR");
					if (data.rows.length === 0)
						return (_this.ROOT.warning = "ASSETS_ZERO_ASSETS");
					var row = data.rows[0];
					if (row.id_user != _this.ROOT.user.id_user) {
						return (_this.ROOT.privilege = false);
					}
					row.schema_asset = JSON.parse(row.schema_asset);
					for (f in row) {
						if (f.indexOf("is_") === 0) {
							row[f] = Boolean(row[f]);
						}
					}
					_this.asset = row;
					_this.deploy();
				});
			});
		});
	},
	getCarriers: function(callback) {
		var _this = this;
		var params = {
			entity: "carrier"
		};
		this.HTTP.post("/mozart/list", params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return (_this.error = "ASSETS_ERROR");
			}
			_this.CONSTANTS.SENSUM_CORE_CARRIERS = data.rows;
			callback();
		});
	},
	deploy: function() {
		for (a in this.asset.schema_asset.attributes) {
			this.asset.schema_asset.attributes[a].name = a;
			this.asset.schema_asset.attributes[
				a
			].color = this.asset.schema_asset.attributes[a].color.toUpperCase();
			this.filters[a] = {};
			for (f in this.CONSTANTS.SENSUM_CORE_ASSET_KPIS) {
				this.filters[a][f] = {
					required: true,
					disabled: false,
					visible: true
				};
			}
			this.updateFilters(a);
		}
		this.json = JSON.stringify(this.asset);
		var keys = Object.keys(this.asset.schema_asset.attributes);
		this.attribute_list = keys;
		var first = keys[0];
		var last = keys[keys.length - 1];
		this.filters[first].name.first = true;
		this.filters[last].name.last = true;
		this.updateFXFields();
	},
	updateFXFields: function() {
		this.fxparams_fields = [];
		for (k in this.asset.schema_asset.attributes) {
			var f = JSON.parse(JSON.stringify(this.asset.schema_asset.attributes[k]));
			this.fxparams_fields.push({
				label: {
					en: f.label,
					es: f.label
				},
				name: k
			});
		}
		this.fxparams_fields.push({
			label: {
				en: "Timestamp in milliseconds.",
				es: "Fecha en milisegundos."
			},
			name: "_date"
		});
	},
	updateField: function(f, k, required, disabled, visible, v) {
		this.filters[f][k].required =
			undefined === required ? this.filters[f][k].required : required;
		this.filters[f][k].disabled =
			undefined === required ? this.filters[f][k].disabled : disabled;
		this.filters[f][k].visible =
			undefined === required ? this.filters[f][k].visible : visible;
		if (undefined === v) return;
		this.asset.schema_asset.attributes[f][k] = v;
	},
	updateAvailableOrigins: function() {
		var _this = this;
		var code_carrier = this.CONSTANTS.SENSUM_CORE_CARRIERS.filter(function(c) {
			return c.id_carrier === _this.asset.id_carrier;
		})[0].code_carrier;
		switch (code_carrier) {
			case "sensum_virtual":
				this.CONSTANTS.SENSUM_CORE_AVAILABLE_ORIGINS = this.CONSTANTS.SENSUM_CORE_ORIGINS.filter(
					function(o) {
						return ["external", "virtual"].indexOf(o.value) != -1;
					}
				);
				break;
			default:
				this.CONSTANTS.SENSUM_CORE_AVAILABLE_ORIGINS = JSON.parse(
					JSON.stringify(this.CONSTANTS.SENSUM_CORE_ORIGINS)
				);
		}
	},
	updateFilters: function(a) {
		var _this = this;
		var attr = this.asset.schema_asset.attributes[a];
		for (f in this.CONSTANTS.SENSUM_CORE_ASSET_KPIS) {
			this.updateField(a, f, true, false, true);
		}
		switch (attr.origin) {
			case "listener":
				this.updateField(a, "fxscript", false, true, false, null);
				this.updateField(a, "fxparams", false, true, false, null);
				this.updateField(a, "fxfield", false, true, false, null);
				this.updateField(a, "fxdecimal", false, true, false, null);
				this.updateField(a, "bits", true, false, true);
				this.updateField(a, "package_number", true, false, true);
				this.updateField(a, "signed", true, false, true);
				break;
			case "item":
				this.updateField(a, "fxscript", false, true, false, null);
				this.updateField(a, "fxparams", false, true, false, null);
				this.updateField(a, "fxfield", false, true, false, null);
				this.updateField(a, "fxdecimal", false, true, false, null);
				this.updateField(a, "bits", false, true, false, 0);
				this.updateField(a, "package_number", false, true, false, null);
				this.updateField(a, "signed", false, true, false, null);
				break;
			case "virtual":
				this.updateField(a, "fxscript", true, false, true);
				this.updateField(a, "fxparams", true, false, true);
				this.updateField(a, "fxfield", true, false, true);
				this.updateField(a, "fxdecimal", true, false, true);
				this.updateField(a, "bits", false, true, false, 0);
				this.updateField(a, "package_number", false, true, false, null);
				this.updateField(a, "signed", false, true, false, null);
				this.updateField(a, "type", true, true, true, "number");
				this.updateField(a, "control", true, true, true, false);
				break;
			case "external":
				this.updateField(a, "fxscript", false, true, false, null);
				this.updateField(a, "fxparams", false, true, false, null);
				this.updateField(a, "fxfield", false, true, false, null);
				this.updateField(a, "fxdecimal", false, true, false, null);
				this.updateField(a, "bits", false, true, false, 0);
				this.updateField(a, "package_number", false, true, false, null);
				this.updateField(a, "signed", false, true, false, null);
				this.updateField(a, "type", true, true, true, "number");
				this.updateField(a, "control", true, true, true, false);
				break;
		}
		switch (attr.type) {
			case "number":
			case "decimal":
				this.updateField(a, "unit", true, false, true);
				this.updateField(a, "factor", true, false, true);
				this.updateField(a, "offset", true, false, true);
				this.updateField(a, "decimals", true, false, true);
				this.updateField(a, "min", true, false, true);
				this.updateField(a, "max", true, false, true);
				this.updateField(a, "group", true, false, true);
				this.updateField(a, "incremental", true, false, true);
				break;
			default:
				this.updateField(a, "unit", false, true, false, null);
				this.updateField(a, "factor", false, true, false, null);
				this.updateField(a, "offset", false, true, false, null);
				this.updateField(a, "decimals", false, true, false, null);
				this.updateField(a, "min", false, true, false, null);
				this.updateField(a, "max", false, true, false, null);
				this.updateField(a, "group", false, true, false, null);
				this.updateField(a, "incremental", false, true, false, null);
				break;
		}
		this.updateField(a, "structure", false, true, false, null);
		this.updateField(a, "icon", false, true, false, null);
		this.updateField(a, "next_frame", false, true, false, null);
		this.updateField(a, "rows", false, true, false, null);
		switch (attr.type) {
			case "package":
				this.updateField(a, "structure", true, false, true);
				this.updateField(a, "icon", true, false, true);
				break;
			case "multitime":
				this.updateField(a, "next_frame", true, false, true, null);
				this.updateField(a, "rows", true, false, true, 2);
				this.updateField(a, "row_order", true, false, true, false);
				this.updateField(a, "timespan", true, false, true, 3600);
				this.updateField(a, "control", false, true, false, null);
				this.updateField(a, "array", false, true, false, null);
				this.updateField(a, "package_number", false, true, false, null);
				this.updateField(a, "signed", false, true, false, null);
				break;
			case "sensum_nmea_lat":
				this.updateField(a, "unit", true, true, true, "deg");
				this.updateField(a, "factor", true, true, true, 1);
				this.updateField(a, "offset", true, true, true, 0);
				this.updateField(a, "decimals", true, true, true, 10);
				this.updateField(a, "min", true, true, true, -90);
				this.updateField(a, "max", true, true, true, 90);
				this.updateField(a, "group", true, true, true, "lst");
				this.updateField(a, "incremental", true, false, true, false);
				this.updateField(a, "bits", true, true, true, 28);
				break;
			case "sensum_nmea_lng":
				this.updateField(a, "unit", true, true, true, "deg");
				this.updateField(a, "factor", true, true, true, 1);
				this.updateField(a, "offset", true, true, true, 0);
				this.updateField(a, "decimals", true, true, true, 10);
				this.updateField(a, "min", true, true, true, -180);
				this.updateField(a, "max", true, true, true, 180);
				this.updateField(a, "group", true, true, true, "lst");
				this.updateField(a, "incremental", true, true, true, false);
				this.updateField(a, "bits", true, true, true, 29);
				break;
		}
		this.updateField(a, "name", true, false, true);
		this.updateField(a, "label", true, false, true);
		this.updateField(a, "description", true, false, true);
		this.updateField(a, "color", true, false, true);
		this.updateField(a, "algorithm", false, true, false, null);
		if (
			undefined != this.asset.schema_asset.attributes[a].fxparams &&
			this.asset.schema_asset.attributes[a].fxparams != null
		) {
			this.filters[a].fxparams.params = Object.keys(
				this.asset.schema_asset.attributes[a].fxparams
			).join(",");
		}
		this.EDITOR_HEADERS.forEach(function(h, i) {
			if (undefined === h.condition) return;
			var value = _this.asset.schema_asset.attributes[a][h.condition.key];
			var index = h.condition.value.indexOf(value);
			if (index === -1) {
				_this.EDITOR_HEADERS[i].visible = false;
				return;
			}
			_this.EDITOR_HEADERS[i].visible = true;
		});
	},
	addAttribute: function() {
		var _this = this;
		var keys = Object.keys(this.asset.schema_asset.attributes);
		var len = keys.length;
		var name = "new_attribute" + "_" + len;
		this.asset.schema_asset.attributes[name] = {
			name: name,
			label: "New Attribute " + len,
			description: "New Attribute " + len,
			color: "#F00",
			type: "number",
			origin: "listener",
			decimals: 1,
			bits: 8,
			factor: 1,
			offset: 0,
			unit: "u",
			min: 0,
			max: 100,
			group: "avg",
			incremental: false,
			control: false,
			array: false,
			signed: false,
			package_number: false,
			private: false
		};
		var id = "sensum-assets-mathquill-" + name;
		this.deploy();
	},
	sortAttribute: function(k, up) {
		var _this = this;
		var keys = Object.keys(this.asset.schema_asset.attributes);
		var i = keys.indexOf(k);
		var j = up === true ? i - 1 : i + 1;
		keys.splice(i, 1);
		keys.splice(j, 0, k);
		var attributes = JSON.parse(
			JSON.stringify(this.asset.schema_asset.attributes)
		);
		this.asset.schema_asset.attributes = {};
		keys.forEach(function(k) {
			_this.asset.schema_asset.attributes[k] = attributes[k];
		});
		this.deploy();
	},
	cloneAttribute: function(k, n, l) {
		var _this = this;
		var keys = Object.keys(this.asset.schema_asset.attributes);
		var len = keys.length;
		var name = k + "_" + len;
		if (undefined != n && n != null && n.length != 0 && isNaN(n) === true) {
			name = n;
		}
		this.asset.schema_asset.attributes[name] = JSON.parse(
			JSON.stringify(this.asset.schema_asset.attributes[k])
		);
		this.asset.schema_asset.attributes[name].name = name;
		this.asset.schema_asset.attributes[name].label += " " + len;
		if (undefined != l && l != null && l.length != 0 && isNaN(l) === true) {
			this.asset.schema_asset.attributes[name].label = l;
		}
		keys = Object.keys(this.asset.schema_asset.attributes);
		var i = keys.indexOf(name);
		var j = keys.indexOf(k) + 1;
		keys.splice(i, 1);
		keys.splice(j, 0, name);
		var attributes = JSON.parse(
			JSON.stringify(this.asset.schema_asset.attributes)
		);
		this.asset.schema_asset.attributes = {};
		keys.forEach(function(k) {
			_this.asset.schema_asset.attributes[k] = attributes[k];
		});
		this.deploy();
		return name;
	},
	editAttribute: function(k) {
		var _this = this;
		this.selected_attribute = k;
		this.updateFilters(k);
		var value = this.asset.schema_asset.attributes[k].fxscript;
		if (undefined === value || value === null) return;
		if (value.charAt(0) === "=") {
			value = value.substring(1);
		}
		var result = this.ROOT.parseExcel(
			this.asset.schema_asset.attributes[k].fxscript,
			this.asset.schema_asset.attributes[k].fxdecimal,
			this.asset.schema_asset.attributes[k].fxfield
		);
		this.filters[k].fxparams.value = result.html;
		result.params.forEach(function(p, i) {
			_this.asset.schema_asset.attributes[k].fxparams[p].color =
				_this.ROOT.sensum.constants.PARAMS_COLORS[
					i % _this.ROOT.sensum.constants.PARAMS_COLORS_LENGTH
				];
		});
	},
	updateAttributeName: function() {
		var label = this.asset.schema_asset.attributes[this.selected_attribute]
			.label;
		var name = this.filters[this.selected_attribute].name.value;
		this.cloneAttribute(this.selected_attribute, name, label);
		this.removeAttribute();
		this.editAttribute(name);
	},
	updateAttributeScript: function() {
		var _this = this;
		var k = this.selected_attribute;
		var value = this.filters[k].fxscript.value;
		if (value.charAt(0) === "=") {
			value = value.substring(1);
		}
		var result = this.ROOT.parseExcel(
			value,
			this.asset.schema_asset.attributes[k].fxdecimal,
			this.asset.schema_asset.attributes[k].fxfield
		);
		this.filters[k].fxparams.value = result.html;
		this.asset.schema_asset.attributes[k].fxscript = value;
		this.asset.schema_asset.attributes[k].fxparams = {};
		result.params.forEach(function(p, i) {
			_this.asset.schema_asset.attributes[k].fxparams[p] = {
				field: null,
				group: null,
				color:
					_this.ROOT.sensum.constants.PARAMS_COLORS[
						i % _this.ROOT.sensum.constants.PARAMS_COLORS_LENGTH
					]
			};
		});
	},
	removeAttribute: function() {
		delete this.asset.schema_asset.attributes[this.selected_attribute];
		this.deploy();
	},
	submit: function(clone) {
		if (clone === true) delete this.ID;
		var _this = this;
		var insert = JSON.parse(JSON.stringify(this.asset));
		delete insert.date_asset;
		insert.schema_asset.frames.forEach(function(f) {
			delete f.$hashKey;
			delete f.$$hashKey;
		});
		insert.schema_asset = JSON.stringify(insert.schema_asset);
		var params = JSON.parse(JSON.stringify(this.CONF.post.submit_params));
		var post = this.CONF.post.add;
		if (this.ID) {
			delete insert.id_user;
			post = this.CONF.post.edit;
			params.id = this.ID;
			insert.id_asset = this.ID;
			params.mongo.value = this.ID;
		}
		params.row = insert;
		this.HTTP.post(post, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				if (data.error.code === "ER_DUP_ENTRY") {
					return (_this.ROOT.warning = "ASSETS_DUPLICATE_ERROR");
				}
				return (_this.ROOT.error = "ASSETS_ERROR");
			}
			if (!_this.ID) _this.ID = data.rows.insertId;
			_this.ROOT.success = "ASSETS_SUCCESS";
		});
	},
	//TEST
	nmeaToDecimal: function(nmea, side) {
		var split = nmea.toString().split(".");
		var index = split[0].length - 2;
		var degrees = split[0].substring(0, index);
		var minutes =
			split[0].substring(index) +
			"." +
			"0000".substring(0, 4 - split[1].length) +
			split[1];
		var factor = side === "N" || side === "E" || side === 1 ? 1 : -1;
		return factor * (Number(degrees) + Number(minutes) / 60);
	},

	exists: function(value) {
		return !(undefined === value || value === null);
	},

	toIEEE754: function(b) {
		try {
			var s = parseInt(b.substring(0, 1), 2);
			var m = parseInt(b.substring(9, 32), 2);
			var x = parseInt(b.substring(1, 9), 2);
			return (
				Math.pow(-1, s) * (1 + m * Math.pow(2, -23)) * Math.pow(2, x - 127)
			);
		} catch (e) {
			return null;
		}
	},
	parse: function(input, type, sign, pre, post) {
		if (input.length === 0) return null;
		var output = null;
		switch (type) {
			case "logical":
			case "switch":
				output = Boolean(parseInt(input, 2));
				break;
			case "text":
			case "message":
				output = parseInt(input, 2).toString(16);
				break;
			case "decimal":
				output = this.toIEEE754(input);
				break;
			case "sensum_nmea_lat":
				var side = parseInt(input.charAt(0));
				var integer = parseInt(input.substring(1, 15), 2);
				var decimal = parseInt(input.substring(15), 2);
				output = this.nmeaToDecimal([integer, decimal].join("."), side);
				break;
			case "sensum_nmea_lng":
				var side = parseInt(input.charAt(0));
				var integer = parseInt(input.substring(1, 16), 2);
				var decimal = parseInt(input.substring(16), 2);
				output = this.nmeaToDecimal([integer, decimal].join("."), side);
				break;
			default:
				output = parseInt(input, 2);
				if (sign === true) {
					var l = input.length;
					var h = Math.pow(2, l - 1);
					output = output - Math.pow(2, l) * Math.floor(output / h);
				}
		}
		return output;
	},

	applyEndianess: function(input, endianess) {
		if (undefined === endianess || endianess === null || endianess === false) {
			return input;
		}
		var bits = input.length;
		var byte_size = Math.ceil(bits / 8);
		var byte_array = new Array(byte_size);
		for (a = 0; a < byte_size; a++) {
			var b = input.substring(a * 8, (a + 1) * 8);
			byte_array[byte_size - 1 - a] = b;
		}
		return byte_array.join("");
	},

	hex2bin: function(data, endianess) {
		var bits = "";
		var hex_array = data.split("");
		hex_array.forEach(function(h) {
			var nibble = parseInt(h, 16).toString(2);
			while (nibble.length < 4) nibble = "0" + nibble;
			bits += nibble;
		});
		return this.applyEndianess(bits, endianess);
	},

	getAttributes: function(schema, frame) {
		if (
			undefined === schema.frames ||
			schema.frames === null ||
			schema.frames.length === 0
		) {
			return JSON.parse(JSON.stringify(schema.attributes));
		}
		var flen = schema.frames.length;
		var found = false;
		for (var f = 0; f < flen; f++) {
			var schema_frame = schema.frames[f];
			if (undefined === schema_frame.direction) schema.frame_direction = true;
			if (this.FRAME_DIRECTION != schema_frame.direction) {
				continue;
			}
			var frame_bits = 0;
			var attributes = {};
			var value = schema_frame.value;
			var alen = schema_frame.attributes.length;
			for (var a = 0; a < alen; a++) {
				var attr = schema_frame.attributes[a];
				if (a === schema_frame.header) {
					if (
						parseInt(
							frame.substring(
								frame_bits,
								frame_bits + schema.attributes[attr].bits
							),
							2
						) === Number(value)
					) {
						found = true;
					}
				}
				attributes[attr] = JSON.parse(JSON.stringify(schema.attributes[attr]));
				frame_bits += schema.attributes[attr].bits;
			}
			if (found === true) return attributes;
		}
		return null;
	},
	test: function() {
		var _this = this;
		var bits = this.hex2bin(this.frame, this.asset.schema_asset.endianess);
		this.bits = bits;
		var n = Math.ceil(bits.length / 4);
		this.nibbles = [];
		for (a = 0; a < n; a++) {
			var z = bits.substring(a * 4, a * 4 + 4);
			this.nibbles.push(z);
		}
		var bit_offset = 0;
		this.result = {};
		var attributes = this.getAttributes(this.asset.schema_asset, this.bits);
		for (i in attributes) {
			var prop = attributes[i];
			var type = prop.type;
			var origin = prop.origin;
			var q = Number(prop.bits);
			_this.result[i] = {};
			var parsed = null;
			switch (origin) {
				case "listener":
					var bin = bits.substring(bit_offset, bit_offset + q);
					_this.result[i].binary = bin;
					parsed = _this.parse(
						bin,
						type,
						prop.signed,
						prop.prescript,
						prop.postscript
					);
					_this.result[i].value = parsed;
					break;
				case "virtual":
					_this.result[i].binary = null;
					var params = {};
					for (p in prop.fxparams) {
						var name = prop.fxparams[p];
						if (name.field === "_date") {
							params[p] = Date.now();
						} else {
							params[p] = Number(_this.result[name.field].value);
						}
					}
					parsed = _this.ROOT.excelcute(
						prop.fxscript,
						prop.fxdecimal,
						prop.fxfield,
						params
					);
					break;
				default:
					//TODO
					_this.result[i].binary = null;
					_this.result[i].value = null;
					continue;
			}
			switch (type) {
				case "logical":
				case "switch":
				case "number":
				case "decimal":
					_this.result[i].value = Number(
						(prop.offset + prop.factor * parsed).toFixed(prop.decimals)
					);
					break;
				default:
					_this.result[i].value = parsed;
			}
			bit_offset += q;
		}
	},
	updateDriver: function() {
		this.updateAvailableOrigins();
		var l = this.CONSTANTS.SENSUM_CORE_CARRIERS.length;
		for (var c = 0; c < l; c++) {
			var k = this.CONSTANTS.SENSUM_CORE_CARRIERS[c];
			if (k.id_carrier === this.asset.id_carrier) {
				this.asset.schema_asset.driver = k.code_carrier;
				break;
			}
		}
	},
	cloneAssetByJSON: function() {
		try {
			var asset = JSON.parse(this.json);
			this.asset = asset;
			delete this.asset.id_asset;
			this.asset.id_user = this.ROOT.user.id_user;
			this.deploy();
		} catch (e) {
			this.ROOT.error = "ASSETS_JSON_ERROR";
		}
	},
	cloneAssetByID: function(id) {
		var _this = this;
		this.kpi_count = 0;
		this.KPI = [];
		var params = JSON.parse(JSON.stringify(this.CONF.post.assets.params));
		params.id = id;
		this.HTTP.post(this.CONF.post.assets.url, params).then(function(response) {
			var data = response.data;
			if (data.error || data.rows.length === 0) {
				return (_this.ROOT.error = "ASSETS_ERROR");
			}
			var row = data.rows[0];
			for (r in row) {
				if (r.indexOf("_asset") === -1 && r.indexOf("id_carrier") === -1) {
					delete row[r];
				}
			}
			delete row.id_asset;
			row.id_user = _this.ROOT.user.id_user;
			_this.asset = row;
			_this.deploy();
		});
	},
	remove: function() {
		var _this = this;
		var url = this.CONF.post.remove;
		var params = JSON.parse(JSON.stringify(this.CONF.post.submit_params));
		params.id = this.ID;
		params.mongo.value = this.ID;
		$("#sensum-assets-delete-modal").on("hidden.bs.modal", function() {
			_this.HTTP.post(url, params).then(function(response) {
				var data = response.data;
				if (data.error) {
					if (data.error.code === "ER_ROW_IS_REFERENCED_2") {
						return (_this.ROOT.warning = "ASSETS_ER_ROW_IS_REFERENCED_2");
					}
					return (_this.ROOT.error = "ASSETS_ERROR");
				}
				_this.ROOT.success = "ASSETS_SUCCESS";
				_this.ROOT.response_redirect = "/dashboard/data/drivers";
			});
			$(".modal-backdrop").remove();
			$("body").removeClass("modal-open");
		});
	},
	addFrameFormat: function() {
		if (
			undefined === this.asset.schema_asset.frames ||
			this.asset.schema_asset.frames === null
		) {
			this.asset.schema_asset.frames = [];
		}
		this.asset.schema_asset.frames.push({
			index: this.asset.schema_asset.frames.length,
			header: null,
			label: "Frame #" + (this.asset.schema_asset.frames.length + 1),
			attributes: []
		});
	},
	removeFrameFormat: function(i) {
		var _this = this;
		this.asset.schema_asset.frames.splice(i, 1);
		this.asset.schema_asset.frames.forEach(function(a, b) {
			_this.asset.schema_asset.frames[b].index = b;
		});
	},
	cloneFrameFormat: function(i) {
		var _this = this;
		var dolly = JSON.parse(JSON.stringify(this.asset.schema_asset.frames[i]));
		this.asset.schema_asset.frames.splice(i, 0, dolly);
		this.asset.schema_asset.frames.forEach(function(a, b) {
			_this.asset.schema_asset.frames[b].index = b;
		});
	},
	addFrameFormatField: function(i) {
		var _this = this;
		this.asset.schema_asset.frames[i].attributes.push(null);
		this.asset.schema_asset.frames.forEach(function(a, b) {
			_this.asset.schema_asset.frames[b].index = b;
		});
	},
	removeFrameFormatField: function(i, k) {
		this.asset.schema_asset.frames[i].attributes.splice(k, 1);
	},
	cloneFrameFormatField: function(i, k) {
		var dolly = JSON.parse(
			JSON.stringify(this.asset.schema_asset.frames[i].attributes[k])
		);
		this.asset.schema_asset.frames[i].attributes.splice(k, 0, dolly);
	},
	updateFrameFormatHeader: function(i, k) {
		this.asset.schema_asset.frames[i].header = k;
	},
	insertMathExpression: function(equation, expression) {
		this.SCOPE.EQUATIONS[equation].blur();
		this.SCOPE.EQUATIONS[equation].focus();
		if (expression.length === 1) {
			this.SCOPE.EQUATIONS[equation].typedText(expression);
			this.SCOPE.EQUATIONS[equation].mathField.keystroke("Left");
		} else {
			this.SCOPE.EQUATIONS[equation].write("\\" + expression);
		}
	}
};
//MODULE DEFINITION
var app = angular
	.module("assets", ["ngRoute"])
	.controller("AssetsController", [
		"$route",
		"$routeParams",
		"$rootScope",
		"$scope",
		"$http",
		AssetsController
	]);
/*
app.directive("mathquill", function() {
	return {
		link: function(scope, element, attrs) {
			scope.$parent.EQUATIONS[
				attrs.mathquill
			] = scope.$parent.MATH_QUILL.MathField(element[0], {
				handlers: {
					edit: function() {
						var a = scope.$parent.EQUATIONS[attrs.mathquill].latex();
						var b = a
							.replace(/\\\s/g, "")
							.replace(/\s/g, "")
							.replace(/\\left\(/g, "(")
							.replace(/\\right\)/g, ")")
							.replace(/\\left\[/g, "(")
							.replace(/\\right\]/g, ")")
							.replace(/\\lfloor/g, "FLOOR(")
							.replace(/\\rfloor/g, ")")
							.replace(/\\lceil/g, "CEIL(")
							.replace(/\\rceil/g, ")")
							.replace(/\\frac{/g, "((")
							.replace(/}{/g, ")/(")
							.replace(/\]{/g, ",");
						//.replace(/}/g, ")");
						var alpha = "abcdefghijklmnopqrstuvwxyx0123456789";
						alpha.split("").forEach(function(q) {
							b = b
								.replace(new RegExp(q + "\\(", "g"), q + "*(")
								.replace(
									new RegExp(q.toUpperCase() + "\\(", "g"),
									q.toUpperCase() + "*("
								)
								.replace(new RegExp("\\)" + q, "g"), ")*" + q)
								.replace(
									new RegExp("\\)" + q.toUpperCase(), "g"),
									")*" + q.toUpperCase()
								)
								.replace(new RegExp(q + "\\\\", "g"), q + "*\\");
						});
						//b = b.replace(/\\sqrt\[/g, "SQRT(").replace(/\)SQRT/g, ")*SQRT");
						//var reg = /(?<=\/.*)(?<!(FLOOR|SQRT|CEIL|ABS).*)}/g;
						///b = b.replace(reg, "))");
					}
				}
			});
		}
	};
});
*/
