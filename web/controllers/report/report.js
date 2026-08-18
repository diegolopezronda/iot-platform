function ReportController($rootScope, $scope, $http, $routeParams) {
	this.ROOT = $rootScope;
	this.PARAMS = $routeParams;
	this.SCOPE = $scope;
	this.HTTP = $http;
	this.CONFIG = this.ROOT.sensum.modules.report;
	this.POST = this.CONFIG.post;
	this.ITEM = {};
	this.GROUPS = {
		min: "minimum",
		max: "maximum",
		cnt: "count",
		avg: "average",
		sum: "summation",
		fst: "first",
		lst: "last"
	};
	this.HTML = "";
	this.CALCULATION_OPTIONS = {};
	this.REPORT_OPTIONS = [{ key: "an Invoice", value: true }];
	this.KPI_OPTIONS = [];
	this.selected_kpi = null;
	this.XML_CHARACTER_MAP = {
		"&": "&amp;",
		'"': "&quot;",
		"'": "&apos;",
		"<": "&lt;",
		">": "&gt;"
	};
	this.DEFAULT_INDENT = "    ";
	this.EVENT_FIELDS = [
		{
			label: {
				en: "Report name"
			},
			type: "text",
			key: "label"
		},
		{
			label: {
				en: "Report description"
			},
			type: "text",
			key: "description"
		}
	];
	this.INVOICE_TEMPLATE = {
		format: {
			tr: [
				{
					_attr: {
						class: "row"
					}
				},
				{
					td: [
						{
							_attr: {
								class: "col-xs-7 col-sm-7 col-md-7 col-lg-7",
								style: "width:70%;"
							}
						},
						{
							table: [
								{
									_attr: {
										class: "box no-border"
									}
								},
								{
									tr: [
										{
											_attr: {
												class: "box-header"
											}
										},
										{
											h1: [
												{
													_attr: {
														class: "no-margin text-bold"
													}
												},
												"Invoice"
											]
										}
									]
								},
								{
									tr: [
										{
											_attr: {
												class: "box-body"
											}
										}
									]
								}
							]
						}
					]
				},
				{
					td: [
						{
							_attr: {
								class: "col-xs-5 col-sm-5 col-md-5 col-lg-5",
								style: "width:30%;"
							}
						},
						{
							table: [
								{
									_attr: {
										class: "box no-border"
									}
								},
								{
									tr: [
										{
											_attr: {
												class: "box-header"
											}
										},
										{
											h3: [
												{
													_attr: {
														class: "box-title"
													}
												},
												"$COMPANY"
											]
										}
									]
								},
								{
									tr: [
										{
											_attr: {
												class: "box-body"
											}
										}
									]
								}
							]
						}
					]
				},
				{
					div: [
						{
							_attr: {
								class: "col-xs-12 col-sm-12 col-md-12 col-lg-12"
							}
						},
						{
							div: [
								{
									_attr: {
										class: "box no-border"
									}
								},
								{
									div: [
										{
											_attr: {
												class: "box-body no-padding"
											}
										},
										"$TABLE"
									]
								}
							]
						}
					]
				}
			]
		},

		attributes: [
			{
				label: {
					en: "Price"
				},
				type: "number",
				key: "price",
				default: 100
			},
			{
				label: {
					en: "Description"
				},
				type: "number",
				key: "description",
				default: "Default description"
			}
		],
		params: [
			{
				label: {
					en: "Tax rate"
				},
				type: "number",
				key: "tax",
				default: 15
			},
			{
				label: {
					en: "Invoice number"
				},
				type: "text",
				key: "invoice",
				default: "1NV01C3"
			},
			{
				label: {
					en: "Invoice date"
				},
				type: "date",
				key: "invoice_date",
				default: Date.now()
			},
			{
				label: {
					en: "Due date"
				},
				type: "date",
				key: "due_date",
				default: Date.now() + this.ROOT.DAY * 7
			},
			{
				label: {
					en: "Company name"
				},
				type: "text",
				key: "company",
				default: "My Company Ltd."
			},
			{
				label: {
					en: "Company address line #1"
				},
				type: "text",
				key: "address_1",
				default: "55 Aerodrome Road"
			},
			{
				label: {
					en: "Company address line #2"
				},
				type: "text",
				key: "address_2",
				default: "Units 3 and 4"
			},
			{
				label: {
					en: "Suburb"
				},
				type: "text",
				key: "suburb",
				default: "Mt. Maunganui"
			},
			{
				label: {
					en: "City"
				},
				type: "text",
				key: "city",
				default: "Tauranga"
			},
			{
				label: {
					en: "Region"
				},
				type: "text",
				key: "region",
				default: "Bay of plenty"
			},
			{
				label: {
					en: "Price"
				},
				type: "number",
				key: "price",
				attribute: true,
				default: 100
			},
			{
				label: {
					en: "Description"
				},
				type: "text",
				key: "description",
				attribute: true,
				default: "Service price"
			},
			{
				label: {
					en: "Bill"
				},
				type: "datatable",
				key: "table",
				transpose: true,
				columns: [
					{
						label: "Description",
						type: "text",
						key: "description"
					},
					{
						label: "Quantity",
						type: "number",
						key: "value"
					},
					{
						label: "Rate",
						type: "number",
						key: "price",
						prefix: "NZ$"
					},
					{
						label: "Value",
						type: "formula",
						prefix: "NZ$",
						fxscript: "A*B",
						decimals: 2,
						fxparams: {
							a: "value",
							b: "price"
						},
						fxdecimal: ".",
						fxfield: ","
					}
				],
				footers: [
					[
						{
							type: "text",
							value: "Grand total",
							attributes: {
								class: "text-bold text-right",
								colspan: "3"
							}
						},
						{
							type: "total",
							group: "sum",
							prefix: "NZ$",
							column: 4,
							attributes: {}
						}
					]
				],
				default: null
			}
		]
	};

	this.EVENT = {
		mac: null,
		hash: null,
		ip: this.ROOT.user.ip_user,
		originator: this.ROOT.user.account_user + "@" + this.ROOT.user.url_project,
		key: null,
		label: null,
		description: null,
		report: true,
		datasource: {
			source: "raw",
			sort: "_date",
			order: -1,
			start: {
				time: this.ROOT.MINUTE,
				interval: true,
				fix: 0
			},
			end: {
				time: 0,
				interval: true,
				fix: 0
			},
			group: {},
			scale: null
		},
		values: {
			invoice: true
		}
	};
	this.EVENT_RESPONSE = {
		error: null,
		data: {},
		stats: {},
		report: null,
		reponse_date: null
	};
	this.constructor();
}
//PROTOTYPE DEFINITION
ReportController.prototype = {
	constructor: function() {
		var _this = this;
		this.ID = this.PARAMS.id;
		if (undefined === this.ID && this.ID === null) {
			this.ROOT.error = "REPORT_ERROR";
			return;
		}
		this.ID = Number(this.ID);
		this.INVOICE_TEMPLATE.params.forEach(function(p) {
			_this.EVENT.values[p.key] = p.default;
		});
		this.getItem();
	},
	getItem: function() {
		var _this = this;
		var params = JSON.parse(JSON.stringify(this.POST.item.params));
		params.value = this.ID;
		this.HTTP.post(this.POST.item.url, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				_this.ROOT.error = "REPORT_ERROR";
			}
			_this.ITEM = data.rows[0];
			_this.ITEM.schema_item = JSON.parse(_this.ITEM.schema_item);
			_this.ITEM.schema_asset = JSON.parse(_this.ITEM.schema_asset);
			var virtuals = _this.ITEM.schema_item.virtuals || {};
			for (v in virtuals) {
				_this.ITEM.schema_asset.attributes[v] = virtuals[v];
			}
			var attributes = _this.ITEM.schema_asset.attributes;
			for (a in attributes) {
				_this.KPI_OPTIONS.push({
					key: attributes[a].label,
					value: a
				});
			}
			_this.ROOT.temp.item = JSON.parse(JSON.stringify(_this.ITEM));
			_this.EVENT.mac = _this.ITEM.mac_item;
			_this.EVENT.hash = _this.ITEM.hash_item;
			$("#sensum-report-modal").modal("show");
		});
	},
	updateKPIOptions: function(kpi) {
		var _this = this;
		if (undefined === kpi || kpi === null) {
			this.KPI_OPTIONS = this.KPI_OPTIONS.filter(function(k, i) {
				if (k.value === _this.selected_kpi) {
					_this.EVENT.datasource.group[k.value] = {
						incremental:
							_this.ITEM.schema_asset.attributes[k.value].incremental,
						decimals: _this.ITEM.schema_asset.attributes[k.value].decimals,
						group: _this.ITEM.schema_asset.attributes[k.value].group
					};
					return false;
				}
				return true;
			});
			this.selected_kpi = null;
			return;
		}
		this.KPI_OPTIONS.push({
			key: this.ITEM.schema_asset.attributes[kpi].label,
			value: kpi
		});
		delete this.EVENT.datasource.group[kpi];
	},
	generateReport: function() {
		_this = this;
		var now = Date.now();
		var start = 0;
		//EXTRA ATTRIBUTES
		this.EVENT.properties = {};
		for (k in this.EVENT.datasource.group) {
			this.EVENT.properties[k] = {};
		}
		this.INVOICE_TEMPLATE.attributes.forEach(function(p) {
			for (k in _this.EVENT.datasource.group) {
				_this.EVENT.properties[k][p.key] = p.default;
			}
		});
		//TIME INTERVAL
		if (this.EVENT.datasource.start.interval === true) {
			start = now - this.EVENT.datasource.start.time;
		} else {
			start = this.EVENT.datasource.start.time;
		}
		var end = 0;
		if (this.EVENT.datasource.end.interval === true) {
			end = now - this.EVENT.datasource.end.time;
		} else {
			end = this.EVENT.datasource.end.time;
		}
		var params = {
			items: [this.EVENT.mac],
			start: moment(start).valueOf(),
			end: moment(end).valueOf(),
			kpi: {},
			timezone: "Pacific/Auckland" //this.ITEM.name_timezone
		};
		var attributes = this.EVENT.datasource.group;
		params.kpi = JSON.parse(JSON.stringify(this.EVENT.datasource.group));
		this.HTTP.post("/mendelssohn/plotting", params).then(function(response) {
			var data = response.data;
			_this.EVENT_RESPONSE.data = data.data;
			_this.deployReport();
		});
	},
	deployReport: function() {
		var _this = this;
		_this.EVENT_RESPONSE.request = JSON.parse(JSON.stringify(_this.EVENT));
		_this.EVENT_RESPONSE.request.template = JSON.parse(
			JSON.stringify(_this.INVOICE_TEMPLATE)
		);
		_this.EVENT_RESPONSE.stats = {};
		for (d in _this.EVENT_RESPONSE.data) {
			var dd = _this.EVENT_RESPONSE.data[d];
			var len = dd.length;
			var is_empty = len === 0;
			_this.EVENT_RESPONSE.stats[d] = 0;
			var g = _this.EVENT_RESPONSE.request.datasource.group[d].group;
			switch (g) {
				case "fst":
					_this.EVENT_RESPONSE.stats[d] = is_empty ? 0 : dd[0][1];
					break;
				case "lst":
					_this.EVENT_RESPONSE.stats[d] = is_empty ? 0 : dd[len - 1][1];
					break;
				case "cnt":
					_this.EVENT_RESPONSE.stats[d] = len;
					break;
				case "min":
					_this.EVENT_RESPONSE.stats[d] = 0;
					dd.forEach(function(i) {
						_this.EVENT_RESPONSE.stats[d] = Math.min(
							i[1],
							_this.EVENT_RESPONSE.stats[d]
						);
					});
					break;
				case "max":
					_this.EVENT_RESPONSE.max = 0;
					dd.forEach(function(i) {
						_this.EVENT_RESPONSE.stats[d] = Math.max(
							i[1],
							_this.EVENT_RESPONSE.stats[d]
						);
					});
					break;
				case "avg":
					var sum = 0;
					dd.forEach(function(i) {
						sum += i[1];
					});
					_this.EVENT_RESPONSE.stats[d] = is_empty ? 0 : sum / len;
					break;
				case "sum":
					_this.EVENT_RESPONSE.stats[d] = 0;
					dd.forEach(function(i) {
						_this.EVENT_RESPONSE.stats[d] += i[1];
					});
					break;
			}
		}
		_this.EVENT_RESPONSE.report = _this.xml(
			_this.EVENT_RESPONSE.request.template.format,
			{
				indent: "\t"
			}
		);
		_this.EVENT_RESPONSE.request.template.params.forEach(function(p) {
			var content = "";
			switch (p.type) {
				case "datatable":
					content = _this.generateDataTable(
						p,
						_this.EVENT_RESPONSE.stats, //TODO Forcing stats
						_this.EVENT_RESPONSE.request.properties,
						_this.EVENT_RESPONSE.request.datasource.group
					);
					break;
				default:
					content =
						_this.xml(
							{
								input: [
									{
										_attr: {
											class: "form-control no-print",
											"ng-model": "report.EVENT.values." + p.key,
											"ng-change": "report.deployReport()"
										}
									}
								]
							},

							{
								indent: "\t"
							}
						) +
						_this.xml({
							span: [
								{
									_attr: {
										class: "visible-print"
									}
								},
								_this.EVENT.values[p.key]
							]
						});
			}
			_this.EVENT_RESPONSE.report = _this.EVENT_RESPONSE.report.replace(
				new RegExp("\\$" + p.key.toUpperCase(), "g"),
				content
			);
		});
	},
	generateDataTable: function(tableformat, data, attributes, group) {
		var table = {
			table: [
				{
					_attr: {
						class: "table table-striped"
					}
				},
				{
					thead: [
						{
							tr: []
						}
					]
				},
				{
					tbody: []
				}
			]
		};
		//TODO Assuming summarized data.
		if (tableformat.transpose === true) {
			var datta = [];
			for (d in data) {
				var q = {
					key: d,
					value: data[d]
				};
				for (a in attributes[d]) {
					q[a] = attributes[d][a];
				}
				datta.push(q);
			}
			data = datta;
		}
		tableformat.columns.forEach(function(c) {
			table.table[1].thead[0].tr.push({
				th: c.label
			});
		});
		data.forEach(function(d) {
			var tr = [];
			tableformat.columns.forEach(function(c) {
				var td = "";
				switch (c.type) {
					case "formula":
						var params = {};
						for (p in c.fxparams) {
							params[p] = d[c.fxparams[p]];
						}
						td = _this.ROOT.excelcute(
							c.fxscript,
							c.fxdecimal,
							c.fxfield,
							params
						).toFixed(c.decimals);
						break;
					default:
						td =
							c.type === "number"
								? Number(d[c.key]).toFixed(group[d.key].decimals)
								: d[c.key];
				}
				var td_wrapper = {
					span: [
						{
							_attr: {
								class: "no-print"
							}
						},
						td
					]
				};
				if (undefined != attributes[d.key][c.key]) {
					td_wrapper = {
						input: [
							{
								_attr: {
									class: "form-control no-print",
									"ng-model": "report.EVENT.properties." + d.key + "." + c.key,
									"ng-change": "report.deployReport()"
								}
							}
						]
					};
				}
				var td_array = [
					{
						span: [
							{
								_attr: {
									class: "pull-left"
								}
							},
							c.prefix ? c.prefix : ""
						]
					},
					{
						span: [
							{
								_attr: {
									class:
										["number", "formula"].indexOf(c.type) === -1
											? "pull-left"
											: "pull-right"
								}
							},
							{
								span: [
									{
										_attr: {
											class: "visible-print"
										}
									},
									td
								]
							},
							td_wrapper
						]
					},
					{
						span: [
							{
								_attr: {
									class: "pull-right"
								}
							},
							c.suffix ? c.suffix : ""
						]
					}
				];
				tr.push({
					td: td_array
				});
			});
			table.table[2].tbody.push({
				tr: tr
			});
		});
		var html_table = _this.xml(table, {
			indent: "\t"
		});
		return html_table;
	},
	escapeForXML: function(string) {
		var _this = this;
		return string && string.replace
			? string.replace(/([&"<>'])/g, function(str, item) {
					return _this.XML_CHARACTER_MAP[item];
			  })
			: string;
	},
	xml: function(input, options) {
		var _this = this;
		if (typeof options !== "object") {
			options = {
				indent: options
			};
		}

		var stream = null,
			output = "",
			interrupted = false,
			indent = !options.indent
				? ""
				: options.indent === true
					? this.DEFAULT_INDENT
					: options.indent,
			instant = true;

		function delay(func) {
			func();
		}

		function append(interrupt, out) {
			if (out !== undefined) {
				output += out;
			}
			if (interrupt && !interrupted) {
				stream = stream || new Stream();
				interrupted = true;
			}
			if (interrupt && interrupted) {
				var data = output;
				delay(function() {
					stream.emit("data", data);
				});
				output = "";
			}
		}

		function add(value, last) {
			_this.format(append, _this.resolve(value, indent, indent ? 1 : 0), last);
		}

		function end() {
			if (stream) {
				var data = output;
				delay(function() {
					stream.emit("data", data);
					stream.emit("end");
					stream.readable = false;
					stream.emit("close");
				});
			}
		}

		function addXmlDeclaration(declaration) {
			var encoding = declaration.encoding || "UTF-8",
				attr = { version: "1.0", encoding: encoding };

			if (declaration.standalone) {
				attr.standalone = declaration.standalone;
			}

			add({ "?xml": { _attr: attr } });
			output = output.replace("/>", "?>");
		}

		// disable delay delayed
		delay(function() {
			instant = false;
		});

		if (options.declaration) {
			addXmlDeclaration(options.declaration);
		}

		if (input && input.forEach) {
			input.forEach(function(value, i) {
				var last;
				if (i + 1 === input.length) last = end;
				add(value, last);
			});
		} else {
			add(input, end);
		}

		if (stream) {
			stream.readable = true;
			return stream;
		}
		return output;
	},

	element: function() {
		var _this = this;
		var input = Array.prototype.slice.call(arguments),
			self = {
				_elem: _this.resolve(input)
			};

		self.push = function(input) {
			if (!this.append) {
				throw new Error("not assigned to a parent!");
			}
			var that = this;
			var indent = this._elem.indent;
			_this.format(
				this.append,
				_this.resolve(input, indent, this._elem.icount + (indent ? 1 : 0)),
				function() {
					that.append(true);
				}
			);
		};

		self.close = function(input) {
			if (input !== undefined) {
				this.push(input);
			}
			if (this.end) {
				this.end();
			}
		};

		return self;
	},

	create_indent: function(character, count) {
		return new Array(count || 0).join(character || "");
	},

	resolve: function(data, indent, indent_count) {
		var _this = this;
		indent_count = indent_count || 0;
		var indent_spaces = this.create_indent(indent, indent_count);
		var name;
		var values = data;
		var interrupt = false;

		if (typeof data === "object") {
			var keys = Object.keys(data);
			name = keys[0];
			values = data[name];

			if (values && values._elem) {
				values._elem.name = name;
				values._elem.icount = indent_count;
				values._elem.indent = indent;
				values._elem.indents = indent_spaces;
				values._elem.interrupt = values;
				return values._elem;
			}
		}

		var attributes = [],
			content = [];

		var isStringContent;

		function get_attributes(obj) {
			var keys = Object.keys(obj);
			keys.forEach(function(key) {
				attributes.push(_this.attribute(key, obj[key]));
			});
		}

		switch (typeof values) {
			case "object":
				if (values === null) break;

				if (values._attr) {
					get_attributes(values._attr);
				}

				if (values._cdata) {
					content.push(
						("<![CDATA[" + values._cdata).replace(/\]\]>/g, "]]]]><![CDATA[>") +
							"]]>"
					);
				}

				if (values.forEach) {
					isStringContent = false;
					content.push("");
					values.forEach(function(value) {
						if (typeof value == "object") {
							var _name = Object.keys(value)[0];

							if (_name == "_attr") {
								get_attributes(value._attr);
							} else {
								content.push(_this.resolve(value, indent, indent_count + 1));
							}
						} else {
							//string
							content.pop();
							isStringContent = true;
							content.push(_this.escapeForXML(value));
						}
					});
					if (!isStringContent) {
						content.push("");
					}
				}
				break;

			default:
				//string
				content.push(_this.escapeForXML(values));
		}

		return {
			name: name,
			interrupt: interrupt,
			attributes: attributes,
			content: content,
			icount: indent_count,
			indents: indent_spaces,
			indent: indent
		};
	},

	format: function(append, elem, end) {
		var _this = this;
		if (typeof elem != "object") {
			return append(false, elem);
		}

		var len = elem.interrupt ? 1 : elem.content.length;

		function proceed() {
			while (elem.content.length) {
				var value = elem.content.shift();

				if (value === undefined) continue;
				if (interrupt(value)) return;

				_this.format(append, value);
			}

			append(
				false,
				(len > 1 ? elem.indents : "") +
					(elem.name ? "</" + elem.name + ">" : "") +
					(elem.indent && !end ? "\n" : "")
			);

			if (end) {
				end();
			}
		}

		function interrupt(value) {
			if (value.interrupt) {
				value.interrupt.append = append;
				value.interrupt.end = proceed;
				value.interrupt = false;
				append(true);
				return true;
			}
			return false;
		}

		append(
			false,
			elem.indents +
				(elem.name ? "<" + elem.name : "") +
				(elem.attributes.length ? " " + elem.attributes.join(" ") : "") +
				(len ? (elem.name ? ">" : "") : elem.name ? "/>" : "") +
				(elem.indent && len > 1 ? "\n" : "")
		);

		if (!len) {
			return append(false, elem.indent ? "\n" : "");
		}

		if (!interrupt(elem)) {
			proceed();
		}
	},

	attribute: function(key, value) {
		return key + "=" + '"' + this.escapeForXML(value) + '"';
	}
};
//MODULE DEFINITION
var app = angular
	.module("report", ["ngRoute"])
	.controller("ReportController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		ReportController
	]);
app.directive("compile", [
	"$compile",
	function($compile) {
		return function(scope, element, attrs) {
			scope.$watch(
				function(scope) {
					return scope.$eval(attrs.compile);
				},
				function(value) {
					element.html(value);
					$compile(element.contents())(scope);
				}
			);
		};
	}
]);
