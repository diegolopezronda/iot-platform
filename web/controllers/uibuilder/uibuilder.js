function UibuilderController($rootScope, $scope, $http, $sce, $routeParams) {
	/***
	 * AngularJS scope.
	 ***/
	this.ROOT = $rootScope;
	/***
	 * Module customization
	 ***/
	this.CONF = this.ROOT.sensum.modules.uibuilder;
	//this.L10N = this.CONF.i18n[this.ROOT.sensum.language];
	/***
	 * AngularJS scope.
	 ***/
	this.SCOPE = $scope;
	/***
	 * AngularJS http.
	 ***/
	this.HTTP = $http;
	this.SCE = $sce;
	this.PARAMS = $routeParams;
	/***
	 * AngularJS route parameters.
	 ***/
	this.ELEMENT = "<ELEMENT></ELEMENT>";
	this.COLLECTIONS = {
		items: {}
	};
	this.selected_block = null;
	this.current_block = null;
	this.text = "";
	this.html = "";
	this.template = {
		name_template: "New Template " + Date.now(),
		schema_template: {},
		is_system_template: false,
		id_user: this.ROOT.user.id_user
	};
	this.selected_field = "device";
	this.FORM = {
		document_type: {
			title: "Document type",
			value: 0,
			options: [
				{ index: 0, key: "an invoice", value: "invoice" },
				{ index: 1, key: "a report", value: "report" }
			]
		},
		device: {
			title: "Device",
			value: 0,
			options: []
		},
		group: {
			title: "Group results by",
			value: 0,
			options: [
				{ index: 0, key: "last", value: "lst" },
				{ index: 1, key: "first", value: "fst" },
				{ index: 2, key: "count of", value: "cnt" },
				{ index: 3, key: "maximum", value: "max" },
				{ index: 4, key: "minimum", value: "min" },
				{ index: 5, key: "average", value: "avg" }
			]
		},
		scale: {
			title: "Group time by",
			value: 0,
			options: [
				{ index: 0, key: "minute", value: "minute" },
				{ index: 1, key: "hour", value: "hour" },
				{ index: 2, key: "day", value: "day" },
				{ index: 3, key: "week", value: "week" },
				{ index: 4, key: "month", value: "month" },
				{ index: 5, key: "year", value: "year" }
			]
		},
		field: {
			title: "Device field",
			value: 0,
			options: [
				{ key: "Bill", value: "bill" },
				{ key: "Report", value: "report" }
			]
		},
		start: {
			title: "Start date",
			value: moment().format("YYYY-MM-DD HH:mm"),
			type: "date",
			fix: 0,
			time: 0,
			interval: false
		},
		end: {
			title: "End date",
			value: moment().format("YYYY-MM-DD HH:mm"),
			type: "date",
			fix: 0,
			time: 0,
			interval: false
		},
		interval: {
			options: [
				{ key: "Fixed Time", value: false },
				{ key: "Relative Time", value: true }
			]
		}
	};
	this.MACS = [];
	this.ID = null;
	this.element_index = "";
	this.event = {
		interval_event: this.ROOT.MINUTE,
		start_date_event: moment()
			.utc()
			.format("YYYY-MM-DD HH:mm")
	};
	this.constructor();
}

UibuilderController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.page_header = "New Bill";
		if (this.PARAMS.id) {
			this.ID = Number(this.PARAMS.id);
			this.getTemplate(function() {
				_this.getItems(function() {
					_this.deploy();
				});
			});
			return;
		}
		this.getItems(function() {
			_this.deploy();
		});
	},
	deploy: function() {
		try {
			var html = "";
			this.template.schema_template["sensum-uibuilder-layer"] = {
				type: "layout",
				attributes: {},
				_parent: null
			};
			for (u in this.template.schema_template) {
				var unit = this.template.schema_template[u];
				if (unit._parent === null && u != "sensum-uibuilder-layer") {
					unit._parent = "sensum-uibuilder-layer";
				}
				var block = this.ROOT.sensum.constants.SENSUM_CORE_UI_BLOCKS[unit.type];
				var tag =
					block.simple === true
						? "<" + block.element + "/>"
						: this.ELEMENT.replace(/ELEMENT/g, block.element);
				var element = $(tag);
				if (undefined != block.datatable && block.datatable != null) {
					if (undefined === unit.datatable || unit.datatable === null) {
						unit.datatable = JSON.parse(JSON.stringify(block.datatable));
					}
					element = this.deployDataTable(unit.datatable);
				}
				element.attr("id", u);
				element.attr("ng-click", "uibuilder.selectElement('" + u + "',$event)");
				for (a in block.attributes) {
					var value = block.attributes[a].join(" ");
					element.attr(a, value);
				}
				for (a in unit.attributes) {
					var value = unit.attributes[a].join(" ");
					var old = element.attr(a);
					if (undefined === old || old === null) old = "";
					element.attr(a, old + " " + value);
				}
				if (block.children === "text" && undefined != unit.text) {
					element.html(unit.text);
				}
				element.addClass("sensum-uibuilder-element");
				unit.outerHTML = element[0].outerHTML;
				if (
					["tbody", "thead", "tfoot", "tr", "th", "td"].indexOf(
						block.element
					) === -1
				)
					html += element[0].outerHTML;
			}
			var template = $("<div>" + html + "</div>");

			for (u in this.template.schema_template) {
				var unit = this.template.schema_template[u];
				if (undefined === unit._parent || unit._parent === null) {
					delete this.template.schema_template[u].outerHTML;
					continue;
				}
				var q = template.find("#" + u);
				if (q.length === 0) {
					$(unit.outerHTML.toString()).appendTo(
						template.find("#" + unit._parent)
					);
					delete this.template.schema_template[u].outerHTML;
					continue;
				}
				q.appendTo(template.find("#" + unit._parent));
				delete this.template.schema_template[u].outerHTML;
			}
			this.html = template.html();
		} catch (e) {}
	},
	deployDataTable: function(datatable) {
		var _this = this;
		var element = $("<table></table>");
		element.append("<thead><tr></tr></thead>");
		element.append("<tbody></tbody>");
		element.append("<tfoot></tfoot>");
		datatable.columns.forEach(function(c) {
			element.find("thead>tr").append("<th>" + c.label + "</th>");
		});
		datatable.data.forEach(function(d, j) {
			element.find("tbody").append("<tr></tr>");
			d.forEach(function(c, i) {
				var col = datatable.columns[i];
				var t = col.type;
				var v = "";
				switch (t) {
					case "text":
						v = c;
						break;
					case "data":
						if (col.prefix) {
							v = "<span class='pull-left'>" + col.prefix + "</span>";
						}
						if (undefined === c.item || c.item === null) break;
						if (undefined === c.attribute || c.attribute === null) break;
						v +=
							"<span class='pull-right'>" +
							_this.COLLECTIONS.items[c.item].data[c.attribute] +
							"</span>";
						datatable.data[j][i].value = v;
						break;
					case "formula":
						var params = {};
						for (p in col.fxparams) {
							var m = col.fxparams[p];
							params[p] = d[m];
							if (undefined === params[p] || params[p] === null) params[p] = 0;
							if (datatable.columns[m].type === "data") {
								if (
									undefined === params[p].item ||
									params[p].item === null ||
									undefined === params[p].attribute ||
									params[p].attribute === null
								) {
									params[p] = 0;
								} else {
									params[p] =
										_this.COLLECTIONS.items[params[p].item].data[
											params[p].attribute
										];
								}
							}
						}
						c = _this.ROOT.excelcute(
							col.fxscript,
							col.fxdecimal,
							col.fxfield,
							params
						);
						if (col.prefix) {
							v = "<span class='pull-left'>" + col.prefix + "</span>";
						}
						v += "<span class='pull-right'>" + c.toFixed(2) + "</span>";
						datatable.data[j][i] = c;
						break;
					case "number":
						if (col.prefix) {
							v = "<span class='pull-left'>" + col.prefix + "</span>";
						}
						v += "<span class='pull-right'>" + c.toFixed(2) + "</span>";
						break;
				}
				element
					.find("tbody>tr")
					.last()
					.append("<td>" + v + "</td>");
			});
		});
		datatable.footers.forEach(function(f) {
			element.find("tfoot").append("<tr></tr>");
			f.forEach(function(c) {
				var t = c.type;
				var v = null;
				var html = "";
				switch (t) {
					case "text":
					case "number":
						v = c.value;
						html = "<td>" + v + "</td>";
						break;
					case "total":
						v = 0;
						//TODO add column type filter
						datatable.data.forEach(function(r) {
							v += r[c.column];
						});
						if (undefined === c.prefix || c.prefix === null) c.prefix = "";
						html =
							"<td><span class='pull-left'>" +
							c.prefix +
							"</span><span class='pull-right'>" +
							v.toFixed(2) +
							"</span></td>";
						break;
					default:
					//Alphajor
				}
				element
					.find("tfoot>tr")
					.last()
					.append(html);
				for (a in c.attributes) {
					var value = c.attributes[a].join(" ");
					element
						.find("tfoot tr td")
						.last()
						.attr(a, value);
				}
			});
		});
		return element;
	},
	addDataTableRow: function() {
		var id = this.current_block.id;
		var row = [];
		this.template.schema_template[id].datatable.columns.forEach(function(c) {
			var value = null;
			switch (c.type) {
				case "number":
					value = 0;
					break;
				case "text":
					value = "Default Text";
					break;
				case "data":
					value = {
						item: null,
						attribute: null
					};
					break;
				default:
				//nothing
			}
			row.push(value);
		});
		this.template.schema_template[id].datatable.data.push(row);
		this.current_block.unit.datatable.data.push(row);
		this.deploy();
	},
	getItems: function(callback) {
		var _this = this;
		var params = {
			entity: "items_view"
		};
		this.HTTP.post("/mozart/list/", params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "UIBUILDER_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "UIBUILDER_NO_ROWS");
			data.rows.forEach(function(r, i) {
				_this.FORM.device.options.push({
					index: i,
					key: r.name_item,
					value: r.mac_item.toString()
				});
				r.schema_asset = JSON.parse(r.schema_asset);
				r.schema_item = JSON.parse(r.schema_item);
				if (undefined === r.schema_item.virtuals) {
					r.schema_item.virtuals = {};
				}
				for (v in r.schema_item.virtuals) {
					var virtual = r.schema_item.virtuals[v];
					r.schema_asset.attributes[v] = virtual;
				}
				_this.COLLECTIONS.items[r.mac_item.toString()] = {
					key: "name_item",
					value: r
				};
			});
			_this.updateFormDependencies();
			_this.MACS = Object.keys(_this.COLLECTIONS.items);
			var ml = _this.MACS.length;
			for (a = 0; a < ml; a++) {
				_this.MACS[a] = Number(_this.MACS[a]);
			}
			_this.getData(function() {
				callback();
			});
		});
	},
	getTemplate: function(callback) {
		var _this = this;
		var params = {
			entity: "template",
			primary: "id_template",
			key: "id_template",
			value: this.ID
		};
		this.HTTP.post("/mozart/where/", params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "UIBUILDER_ERROR");
			if (data.rows.length === 0)
				return (_this.ROOT.warning = "UIBUILDER_NO_ROWS");
			_this.template = data.rows[0];
			_this.template.schema_template = JSON.parse(
				_this.template.schema_template
			);
			callback();
		});
	},
	getData: function(callback) {
		var _this = this;
		var params = { macs: this.MACS };
		this.HTTP.post("/mendelssohn/map/", params).then(function(response) {
			var data = response.data;
			data.forEach(function(d) {
				var m = d.mac.toString();
				_this.COLLECTIONS.items[m].data = d;
			});
			callback();
		});
	},
	selectElement: function(id, evt) {
		if (evt) evt.stopPropagation();
		this.current_block = {
			id: id,
			unit: JSON.parse(JSON.stringify(this.template.schema_template[id])),
			block: JSON.parse(
				JSON.stringify(
					this.ROOT.sensum.constants.SENSUM_CORE_UI_BLOCKS[
						this.template.schema_template[id].type
					]
				)
			),
			content: []
		};
		for (u in this.template.schema_template) {
			var unit = this.template.schema_template[u];
			if (unit._parent === id) {
				this.current_block.content.push(u);
			}
		}
		if (evt) $("#sensum-uibuilder-element-modal").modal("show");
	},
	addElement: function() {
		var id = this.getNewElementId();
		this.template.schema_template[id] = {
			type: this.selected_block,
			attributes: {},
			_parent: this.current_block.id
		};
		this.current_block.content.push(id);
		var element_content = this.addElementContent(
			id,
			this.ROOT.sensum.constants.SENSUM_CORE_UI_BLOCKS[this.selected_block]
				.content
		);
		for (e in element_content) {
			this.template.schema_template[e] = element_content[e];
		}
		this.deploy();
	},
	getNewElementId: function() {
		return (
			"e-" + (Date.now() + Math.floor(Date.now() - Math.random() * Date.now()))
		);
	},
	addElementContent: function(id, kontent) {
		var _this = this;
		if (undefined === id || id === null) return {};
		if (undefined === kontent || kontent === null) return {};
		var keys = Object.keys(kontent);
		if (keys.length === 0) return {};
		var content = JSON.parse(JSON.stringify(kontent));
		var ids = {
			n: id
		};
		keys.forEach(function(c) {
			var current = content[c];
			ids[c] = _this.getNewElementId();
			content[c]._parent = ids[current._parent || "n"];
			var subcontents = _this.addElementContent(
				ids[c],
				_this.ROOT.sensum.constants.SENSUM_CORE_UI_BLOCKS[current.type].content
			);
			content[ids[c]] = JSON.parse(JSON.stringify(current));
			for (s in subcontents) {
				content[s] = JSON.parse(JSON.stringify(subcontents[s]));
			}
			delete content[c];
		});
		return content;
	},
	removeElement: function(id) {
		delete this.template.schema_template[id];
		for (u in this.template.schema_template) {
			var unit = this.template.schema_template[u];
			if (unit._parent === id) {
				delete this.template.schema_template[u];
			}
		}
		this.current_block.content.splice(
			this.current_block.content.indexOf(id),
			1
		);
		this.deploy();
	},
	updateField: function(f) {
		var _this = this;
		var id = this.current_block.id;
		var a = this.current_block.block.fields[f].attribute;
		var options = this.current_block.block.fields[f].options;
		options.forEach(function(o) {
			var v = o.value;
			if (undefined === _this.template.schema_template[id].attributes[a]) {
				_this.template.schema_template[id].attributes[a] = [];
			}
			_this.template.schema_template[id].attributes[a].splice(
				_this.template.schema_template[id].attributes[a].indexOf(v),
				1
			);
		});
		this.template.schema_template[id].attributes[a].push(
			this.template.schema_template[id].fields[f]
		);
		this.deploy();
	},
	updateText: function() {
		this.current_block.unit.text = this.template.schema_template[
			this.current_block.id
		].text;
		this.deploy();
	},
	submit: function() {
		var _this = this;
		var params = {
			entity: "template",
			row: JSON.parse(JSON.stringify(this.template)),
			primary: "id_template",
			id: this.ID
		};
		delete params.row.schema_template["sensum-uibuilder-layer"];
		for (r in params.row.schema_template) {
			if (params.row.schema_template[r]._parent === "sensum-uibuilder-layer") {
				params.row.schema_template[r]._parent = null;
			}
		}
		params.row.schema_template = JSON.stringify(params.row.schema_template);
		var url = "/mozart/insert/";
		if (this.ID) {
			url = "/mozart/update/";
			delete params.row.is_system_template;
			delete params.row.id_user;
		}
		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.error) {
				_this.ROOT.error = "UIBUILDER_ERROR";
				return;
			}
			_this.ROOT.success = "UIBUILDER_SUCCESS";
		});
	},
	addSchedule: function() {
		this.event.schema_event = {
			mac: [],
			hash: "<String> Device password.",
			message: {
				extension: "html",
				format: {
					data: "<Object> Format of the document",
					document: this.template.schema_template,
					values: "<Object> variables deployed on 'data'.",
					timestamp: "<String> Format of the timestamp.",
					utc:
						"<Boolean> Indicates if the date should be printed in UTC (true) or local (false)."
				},
				params: "<Object> Information sources for 'values'",
				receiver: {
					_type: "<String> Receiver type",
					email: "<String> Recipient email address ('_type' is 'email')",
					user: "<String> FTP user ('_type' is 'ftp')",
					host: "<String> FTP server ('_type' is 'ftp')",
					password: "<String> FTP password ('_type' is 'ftp')",
					port: "<String> FTP port ('_type' is 'ftp')"
				}
			},
			parser: "html",
			key: "<String> Is the identifier of the command or report.",
			label: "<String> Human-readable alias of the the event.",
			description: "<String> Short Human-readable description of the event."
		};
	},
	updateFormDependencies: function() {
		switch (this.selected_field) {
			case "device":
				var attr = this.COLLECTIONS.items[
					this.FORM.device.options[this.FORM.device.value].value
				].value.schema_asset.attributes;
				this.FORM.field.options = [];
				var index = -1;
				for (a in attr) {
					this.FORM.field.options.push({
						index: ++index,
						key: attr[a].label,
						value: a
					});
				}
				break;
			default:
			//blank
		}
	},
	generateReport: function() {
		var mac = this.FORM.device.options[this.FORM.device.value].value.toString();
		var schema = {
			ip: this.ROOT.user.ip_user,
			originator:
				this.ROOT.user.account_user + "@" + this.ROOT.user.url_project,
			mac: Number(mac),
			hash: this.COLLECTIONS.items[mac].value.hash_item,
			key: "monthly_consumption_report",
			label: "Monthly Consumption Report",
			description: "Water consumption summary.",
			report: true,
			datasource: {
				source: "raw",
				sort: "_date",
				order: -1,
				filter: {
					_date: {
						$gte: "$TIMERS.start",
						$lt: "$TIMERS.end"
					}
				},
				group: [],
				scale: this.FORM.scale.options[this.FORM.scale.value].key
			},
			timers: {
				start: {
					date: moment(),
					fixed: null
				},
				end: {
					date: {
						interval: 30,
						scale: "day"
					},
					fixed: "hour"
				}
			},
			constants: {
				title: "Best Report Ever",
				author: "Tauranga City Council"
			}
		};
	}
};

//MODULE DEFINITION
var app = angular
	.module("uibuilder", ["ngRoute"])
	.controller("UibuilderController", [
		"$rootScope",
		"$scope",
		"$http",
		"$sce",
		"$routeParams",
		UibuilderController
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
