function SpectrumController($rootScope, $scope, $http, $routeParams) {
	/***
	 * AngularJS scope.
	 ***/
	this.ROOT = $rootScope;
	/***
	 * Undefined
	 ***/
	this.U = "undefined";
	/***
	 * Module customization
	 ***/
	this.CONF = this.ROOT.sensum.modules.spectrum;
	this.L10N = this.CONF.i18n[this.ROOT.sensum.language];
	/***
	 * AngularJS scope.
	 ***/
	this.SCOPE = $scope;
	/***
	 * AngularJS http.
	 ***/
	this.HTTP = $http;
	/***
	 * AngularJS route parameters.
	 ***/
	this.PARAMS = $routeParams;
	this.ITEMS = [];
	this.ICONS = {
		number: "globe",
		text: "globe",
		message: "globe",
		switch: "globe",
		logical: "globe"
	};
	this.LOGICAL = [
		{ key: this.L10N.NO, value: 0 },
		{ key: this.L10N.YES, value: 1 }
	];
	this.SWITCH = [
		{ key: this.L10N.OFF, value: 0 },
		{ key: this.L10N.ON, value: 1 }
	];
	this.TIME_FLAGS = {
		delayed: {
			_parent: null,
			color: "yellow",
			label: "Delayed",
			default: 1 * this.ROOT.DAY
		},
		warning: {
			_parent: "delayed",
			color: "orange",
			label: "Warning",
			default: 3 * this.ROOT.DAY
		},
		fault: {
			_parent: "warning",
			color: "red",
			label: "Fault",
			default: 5 * this.ROOT.DAY
		}
	};
	this.EXTERNAL = {};
	this.data = {};
	this.attr_count = {};
	this.lookup_test = {};
	this.lookup_import = null;
	this.selected_lookup = null;
	this.selected_virtual = null;
	this.virtual_indexes = [];
	this.metadata_key = null;
	this.metadata_value = null;
	this.color_columns = 10;
	this.color_matrix = [];
	this.lookup_table_x = null;
	this.lookup_table_y = null;
	this.constructor();
}

SpectrumController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.page_header = this.L10N.HEADER;
		this.ROOT.optional_description = this.L10N.DESCRIPTION;
		this.ID = this.PARAMS.id;
		this.ROOT.sensum.constants.SENSUM_COLORS.forEach(function(c, i) {
			if (i % _this.color_columns === 0) {
				_this.color_matrix.push([]);
			}
			_this.color_matrix[_this.color_matrix.length - 1].push(c);
		});
		this.getItem();
	},
	getItem: function() {
		var _this = this;
		var params = {
			entity: "items_view",
			key: "id_item",
			value: Number(this.ID)
		};
		this.HTTP.post(this.CONF.post.get, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "SPECTRUM_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "SPECTRUM_NO_ROWS");
			_this.item = data.rows[0];
			if (_this.ID) {
				_this.ROOT.temp.item = JSON.parse(JSON.stringify(_this.item));
			}
			_this.item.schema_asset = JSON.parse(_this.item.schema_asset);
			_this.item.schema_item = JSON.parse(_this.item.schema_item);
			if (
				typeof _this.item.schema_item === "undefined" ||
				_this.item.schema_item === null
			) {
				_this.item.schema_item = {};
			}
			var must = [
				"attributes",
				"constants",
				"display",
				"lookups",
				"virtuals",
				"metadata",
				"external",
				"flags"
			];
			_this.item.schema_item._display = [];
			must.forEach(function(m) {
				if (
					typeof _this.item.schema_item[m] === "undefined" ||
					_this.item.schema_item[m] === null
				) {
					_this.item.schema_item[m] = {};
				}
			});
			//FLAGS
			for (f in _this.TIME_FLAGS) {
				var flag = _this.TIME_FLAGS[f];
				if (
					undefined === _this.item.schema_item.flags[f] ||
					_this.item.schema_item.flags[f] === null
				) {
					_this.item.schema_item.flags[f] = flag.default;
				}
			}
			//VIRTUALS
			for (v in _this.item.schema_item.virtuals) {
				var virtual = _this.item.schema_item.virtuals[v];
				_this.item.schema_asset.attributes[v] = JSON.parse(
					JSON.stringify(virtual)
				);
			}
			for (d in _this.item.schema_item.attributes) {
				if (
					undefined === _this.item.schema_asset.attributes[d] ||
					_this.item.schema_asset.attributes[d].private == true
				) {
					delete _this.item.schema_item.attributes[d];
					continue;
				}
			}
			for (d in _this.item.schema_item.display) {
				if (
					undefined === _this.item.schema_asset.attributes[d] ||
					_this.item.schema_asset.attributes[d].private == true
				) {
					delete _this.item.schema_item.display[d];
					continue;
				}
				_this.item.schema_item._display.push({
					key: d,
					value: _this.item.schema_item.display[d]
				});
			}
			_this.item.schema_item._display = [];
			//ASSET
			for (a in _this.item.schema_asset.attributes) {
				var schema_attr = _this.item.schema_asset.attributes[a];
				if (
					["decimal", "number"].indexOf(schema_attr.type) === -1 ||
					schema_attr.private === true
				) {
					delete _this.item.schema_asset.attributes[a];
					delete _this.item.schema_item.attributes[a];
					continue;
				}
				if (
					undefined === _this.item.schema_item.display[a] ||
					_this.item.schema_item.display[a] === null
				) {
					_this.item.schema_item.display[a] = true;
				}
				_this.item.schema_item._display.push({
					key: a,
					value: _this.item.schema_item.display[a]
				});
				var origin = schema_attr.origin;
				switch (origin) {
					case "item":
						var item_constant = _this.item.schema_item.constants[a];
						if (
							typeof item_constant === "undefined" ||
							item_constant === null
						) {
							_this.item.schema_item.constants[a] = 0;
						}
						//delete _this.item.schema_asset.attributes[a];
						delete _this.item.schema_item.attributes[a];
						continue;
						break;
					case "lookup":
						var table = schema_attr.lookup;
						if (
							undefined === _this.item.schema_item.lookups[table] ||
							_this.item.schema_item.lookups[table] === null
						) {
							_this.item.schema_item.lookups[table] = {
								decimals: 3,
								interpolation: "lin",
								name: table.replace(/_/g, " "),
								is_asset: true,
								data: []
							};
						}
						continue;
						break;
					case "external":
						if (
							undefined === _this.item.schema_item.external[a] ||
							_this.item.schema_item.external[a] === null
						) {
							_this.item.schema_item.external[a] = {
								item: null,
								attribute: null
							};
						}
						break;
				}
				//LIMITS
				var item_attr = _this.item.schema_item.attributes[a];
				if (typeof item_attr === "undefined" || item_attr === null) {
					_this.item.schema_item.attributes[a] = {
						min: schema_attr.min,
						max: schema_attr.max
					};
				}
			}
			//PROJECT METADATA
			if (
				undefined != _this.ROOT.sensum.project.schema_project.metadata &&
				_this.ROOT.sensum.project.schema_project.metadata != null
			) {
				for (k in _this.ROOT.sensum.project.schema_project.metadata) {
					if (_this.item.schema_item.metadata[k] === undefined) {
						_this.item.schema_item.metadata[k] = {
							key: _this.ROOT.sensum.project.schema_project.metadata[k].key,
							value: null
						};
					}
				}
			}
			_this.item.schema_asset.attributes._date = {
				label: "Date in milliseconds"
			};
			_this.virtual_indexes = Object.keys(_this.item.schema_item.virtuals);
			//COUNT
			must.forEach(function(m) {
				_this.attr_count[m] = Object.keys(_this.item.schema_item[m]).length;
			});
			if (_this.attr_count.external != 0) _this.getItems();
			_this.ROOT.$applyAsync();
		});
	},
	getItems: function() {
		var _this = this;
		var params = {
			entity: "items_view"
		};
		this.HTTP.post(this.CONF.post.external, params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "SPECTRUM_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "SPECTRUM_NO_ROWS");
			data.rows.forEach(function(r) {
				r.schema_asset = JSON.parse(r.schema_asset);
				r.schema_item = JSON.parse(r.schema_item);
				if (undefined === r.schema_item.virtuals) {
					r.schema_item.virtuals = {};
				}
				for (v in r.schema_item.virtuals) {
					var virtual = r.schema_item.virtuals[v];
					r.schema_asset.attributes[v] = virtual;
				}
				_this.EXTERNAL[r.mac_item.toString()] = r;
			});
		});
	},
	submit: function() {
		var _this = this;
		for (l in this.item.schema_item.lookups) {
			delete this.item.schema_item.lookups[l].$hashKey;
			delete this.item.schema_item.lookups[l].$$hashKey;
		}
		delete this.item.schema_item.display;
		this.item.schema_item.display = {};
		this.item.schema_item._display.forEach(function(d) {
			_this.item.schema_item.display[d.key] = d.value;
		});
		var display = this.item.schema_item._display;
		delete this.item.schema_item._display;
		//
		this.item.schema_item.external_array = [];
		for (a in this.item.schema_item.external) {
			var x = JSON.parse(JSON.stringify(this.item.schema_item.external[a]));
			x.local = a;
			this.item.schema_item.external_array.push(x);
		}
		//
		var params = {
			entity: "item",
			primary: "id_item",
			id: this.item.id_item,
			fields: {
				schema_item: { type: "json" }
			},
			mongo: {
				collection: "items",
				field: "mac",
				column: "mac_item",
				is_number: true
			},
			row: {
				id_item: this.item.id_item,
				mac_item: this.item.mac_item,
				schema_item: JSON.stringify(this.item.schema_item)
			}
		};
		this.HTTP.post(this.CONF.post.submit, params).then(function(response) {
			var data = response.data;
			if (data.error !== null) return (_this.ROOT.error = "SPECTRUM_ERROR");
			_this.ROOT.success = "SPECTRUM_SUCCESS";
			_this.item.schema_item._display = display;
		});
	},
	up: function(is_positive, is_max, field) {
		this.item.schema_item.attributes[field][is_max === true ? "max" : "min"] =
			Number(
				this.item.schema_item.attributes[field][is_max === true ? "max" : "min"]
			) + (is_positive === true ? 1 : -1);
	},
	sort: function(index, up) {
		var _this = this;
		var diff = up ? -1 : 1;
		var value = this.item.schema_item._display[index];
		this.item.schema_item._display.splice(index, 1);
		this.item.schema_item._display.splice(index - diff, 0, value);
	},
	testLookup: function(n) {
		var params = null;
		var data = this.item.schema_item.lookups[n].data.sort(function(a, b) {
			return a.x - b.x;
		});
		var l = data.length - 1;
		var k = 0;
		var x = Number(this.lookup_test[n].x);
		for (var a = 0; a <= l; a++) {
			if (x === data[a].x) {
				this.lookup_test[n].y = data[a].y;
				return;
			}
			k = a;
			if (x < data[a].x) break;
		}
		if (k === 0) k = 1;
		params = {
			x: x,
			xa: data[k - 1].x,
			ya: data[k - 1].y,
			xb: data[k].x,
			yb: data[k].y
		};
		this.lookup_test[n].y = Number(
			this.ROOT.excelcute(
				this.ROOT.sensum.constants.SENSUM_INTERPOLATION_METHODS[
					this.item.schema_item.lookups[n].interpolation
				].fx,
				".",
				",",
				params
			)
		);
		if (
			undefined === this.lookup_test[n].y ||
			this.lookup_test[n].y === null ||
			isNaN(this.lookup_test[n].y) === true
		) {
			this.lookup_test[n].y = Number(
				this.ROOT.excelcute(
					this.ROOT.sensum.constants.SENSUM_INTERPOLATION_METHODS.lin.fx,
					".",
					",",
					params
				).toFixed(3)
			);
		}
	},
	importLookup: function() {
		var lookup = [];
		var DELIMITER = " ";
		var raw = this.lookup_import
			.replace(/[^0-9.\s]/g, "-")
			.replace(/\t|,|;/g, DELIMITER);
		var rows = raw.split("\n");
		rows.forEach(function(r) {
			var cols = r.split(DELIMITER);
			var x = Number(cols[0]);
			if (isNaN(x) === true) x = 0;
			var y = Number(cols[1]);
			if (isNaN(y) === true) y = 0;
			lookup.push({
				x: x,
				y: y
			});
		});
		lookup = lookup.sort(function(a, b) {
			return a.x - b.x;
		});
		this.item.schema_item.lookups[this.selected_lookup].data = lookup;
	},
	addMetadata: function() {
		this.ROOT.error = null;
		var obj = this.metadata_key.toLowerCase().replace(/(?![a-z,0-9])./g, "_");
		if (
			undefined === this.item.schema_item.metadata[obj] ||
			this.item.schema_item.metadata[obj] === null
		) {
			this.item.schema_item.metadata[obj] = {
				key: this.metadata_key,
				value: this.metadata_value
			};
		} else {
			this.ROOT.error = "SPECTRUM_DUPLICATE_METADATA_KEY";
		}
	},
	removeMetadata: function(n) {
		delete this.item.schema_item.metadata[n];
	},
	addVirtualField: function() {
		var n = Object.keys(this.item.schema_item.virtuals).length;
		var name = "New Virtual Field " + n;
		var k = "virtual_field_" + n;
		this.item.schema_item.virtuals[k] = {
			name: k,
			label: name,
			description: name + ".",
			color: "#f60",
			unit: "u",
			decimals: 0,
			factor: 1,
			offset: 0,
			fxscript: "",
			fxparams: {},
			fxdecimal: ".",
			fxfield: ",",
			//READ ONLY CURRENT VERSION
			type: "number",
			min: -100000000,
			max: 100000000,
			group: "avg",
			incremental: false,
			//CONSTANTS
			origin: "virtual",
			control: false,
			private: false,
			array: false,
			lookup: null
		};
		this.virtual_indexes = Object.keys(this.item.schema_item.virtuals);
		this.item.schema_asset.attributes[k] = JSON.parse(
			JSON.stringify(this.item.schema_item.virtuals[k])
		);
	},
	cloneVirtualField: function(k) {
		var n = Object.keys(this.item.schema_item.virtuals).length;
		var name = "New Virtual Field " + n;
		var q = "virtual_field_" + n;
		this.item.schema_item.virtuals[q] = JSON.parse(
			JSON.stringify(this.item.schema_item.virtuals[k])
		);
		this.item.schema_item.virtuals[q].name = q;
		this.item.schema_item.virtuals[q].label = name;
		this.item.schema_item.virtuals[q].description = name + ".";
		this.item.schema_asset.attributes[q] = JSON.parse(
			JSON.stringify(this.item.schema_item.virtuals[q])
		);
		this.virtual_indexes = Object.keys(this.item.schema_item.virtuals);
	},
	removeVirtualField: function(n) {
		delete this.item.schema_item.virtuals[n];
		delete this.item.schema_asset.attributes[n];
		this.virtual_indexes = Object.keys(this.item.schema_item.virtuals);
	},
	sortVirtualField: function(k, is_up) {
		var _this = this;
		var f = 2 * Number(!is_up) - 1;
		var m = this.virtual_indexes.indexOf(k);
		this.virtual_indexes.splice(m, 1);
		this.virtual_indexes.splice(m + f, 0, k);
		var kpi = JSON.parse(JSON.stringify(this.item.schema_item.virtuals));
		this.item.schema_item.virtuals = {};
		this.virtual_indexes.forEach(function(v) {
			_this.item.schema_item.virtuals[v] = kpi[v];
		});
	},
	parseFXScript: function(n) {
		var _this = this;
		if (this.item.schema_item.virtuals[n].fxscript.charAt(0) === "=") {
			this.item.schema_item.virtuals[
				n
			].fxscript = this.item.schema_item.virtuals[n].fxscript.substring(1);
		}
		var result = this.ROOT.parseExcel(
			this.item.schema_item.virtuals[n].fxscript,
			this.item.schema_item.virtuals[n].fxdecimal,
			this.item.schema_item.virtuals[n].fxfield
		);
		this.item.schema_item.virtuals[n].fxparams = {};
		result.params.forEach(function(p) {
			_this.item.schema_item.virtuals[n].fxparams[p] = {
				field: null,
				group: null
			};
		});
	},
	updateKPIName: function(k) {
		this.item.schema_asset.attributes[k].label = this.item.schema_item.virtuals[
			k
		].label;
	},
	addLookupTable: function() {
		var n = Object.keys(this.item.schema_item.lookups).length + 1;
		this.item.schema_item.lookups["lookup_table_" + n] = {
			name: "Lookup Table " + n,
			decimals: 3,
			interpolation: "lin",
			is_asset: false,
			data: []
		};
	},
	removeLookupTable: function(k) {
		if (this.item.schema_item.lookups[k].is_asset === true) return;
		delete this.item.schema_item.lookups[k];
	},
	addLookupTableRow: function(x, y) {
		this.item.schema_item.lookups[this.selected_lookup].data.push({
			x: Number(x),
			y: Number(y)
		});
		this.item.schema_item.lookups[this.selected_lookup].data.sort(function(
			a,
			b
		) {
			return a.x - b.x;
		});
	},
	dropLookupTableRow: function(i) {
		this.item.schema_item.lookups[
			this.selected_lookup
		].data = this.item.schema_item.lookups[this.selected_lookup].data.filter(
			function(a, b) {
				return b != i;
			}
		);
	}
};

//MODULE DEFINITION
var app = angular
	.module("spectrum", ["ngRoute"])
	.controller("SpectrumController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		SpectrumController
	]);
