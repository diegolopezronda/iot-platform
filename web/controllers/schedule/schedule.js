function ScheduleController($route, $routeParams, $rootScope, $scope, $http) {
	this.ROUTE = $route;
	this.PARAMS = $routeParams;
	this.SCOPE = $scope;
	this.ROOT = $rootScope;
	this.HTTP = $http;
	this.CONF = this.ROOT.sensum.modules.schedule;
	this.POST = this.CONF.post;
	this.SCHEDULE = "schedule";
	this.PREFIX = "SCHEDULE_";
	this.MAGNITUDES = {
		minute: {
			key: this.CONF.i18n[this.ROOT.sensum.language]["SCHEDULE_MINUTES"],
			value: "MINUTE"
		},
		hour: {
			key: this.CONF.i18n[this.ROOT.sensum.language]["SCHEDULE_HOURS"],
			value: "HOUR"
		},
		day: {
			key: this.CONF.i18n[this.ROOT.sensum.language]["SCHEDULE_DAYS"],
			value: "DAY"
		},
		week: {
			key: this.CONF.i18n[this.ROOT.sensum.language]["SCHEDULE_WEEKS"],
			value: "WEEK"
		},
		month: {
			key: this.CONF.i18n[this.ROOT.sensum.language]["SCHEDULE_MONTHS"],
			value: "MONTH"
		}
	};
	this.MYSQL_TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm:ss";
	this.SCHEDULE_TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm";
	this.EVENT_DURATION = 30;
	this.EVENT_MAGNITUDE = "minute";
	this.CALENDAR_ELEMENT = $("#schedule-calendar");
	this.START_ELEMENT = $("#schedule-event-start");
	this.END_ELEMENT = $("#schedule-event-end");
	this.CONTROL_ID_PREFIX = "external-event-";
	this.DATEPICKER_CONFIG = {
		format: "YYYY-MM-DD HH:mm",
		ignoreReadonly: true,
		showClose: true,
		widgetPositioning: {
			horizontal: "auto",
			vertical: "bottom"
		},
		sideBySide: false
	};
	this.CALENDAR_CONFIG = {
		locale: this.ROOT.sensum.language,
		header: {
			left: "prev,next today",
			center: "title",
			right: "month,listWeek"
		},
		editable: true,
		droppable: true,
		timezone: "local",
		firstDay: 1,
		defaultView: "listWeek",
		displayEventEnd: false,
		height: $("body").height() - 260
	};
	this.WEEKDAYS = [
		{ key: "SCHEDULE_SCHEDULE_MONDAY", value: "is_monday_event" },
		{ key: "SCHEDULE_SCHEDULE_TUESDAY", value: "is_tuesday_event" },
		{ key: "SCHEDULE_SCHEDULE_WEDNESDAY", value: "is_wednesday_event" },
		{ key: "SCHEDULE_SCHEDULE_THURSDAY", value: "is_thursday_event" },
		{ key: "SCHEDULE_SCHEDULE_FRIDAY", value: "is_friday_event" },
		{ key: "SCHEDULE_SCHEDULE_SATURDAY", value: "is_saturday_event" },
		{ key: "SCHEDULE_SCHEDULE_SUNDAY", value: "is_sunday_event" }
	];
	this.EVENTS = [];
	this.CONTROLS = {};
	this.current_calendar_start = null;
	this.current_calendar_end = null;
	this.current_event = {
		row: {
			start_date_event: null,
			end_date_event: null,
			control_event: null
		}
	};
	this.constructor();
}
ScheduleController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.page_header = this.CONF.i18n[
			this.ROOT.sensum.language
		].SCHEDULES_TITLE;
		this.ROOT.optional_description = this.CONF.i18n[
			this.ROOT.sensum.language
		].SCHEDULES_DESCRIPTION;
		var url = this.POST.devices.all;
		var params = { entity: "items_view" };
		this.ID = this.PARAMS.id;
		if (this.ID) {
			this.ID = Number(this.ID);
			url = this.POST.devices.current;
			params.key = "id_item";
			params.value = this.ID;
		}
		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.rows.length === 0) {
				return (_this.ROOT.info = _this.PREFIX + "NO_SCHEDULES");
			}
			_this.devices = data.rows;
			_this.MACS = [];
			_this.KPI = {};
			_this.devices.forEach(function(d, i) {
				_this.MACS.push(d.mac_item);
				d.schema_asset = JSON.parse(d.schema_asset);
				_this.devices[i].schema_asset = d.schema_asset;
				data.rows[i].schema_asset = d.schema_asset;
				var schema = d.schema_asset.attributes;
				for (s in schema) {
					_this.KPI[s] = schema[s];
					if (schema[s].control === false) continue;
					var type = schema[s].type;
					switch (type) {
						case "switch":
							var on_key = s + "_on";
							var off_key = s + "_off";
							var label = schema[s].label + " ";
							_this.CONTROLS[on_key] = {
								key: s,
								name: on_key,
								label: label + "On",
								description: label + "On",
								description: "",
								color: "#096",
								background: "#096",
								border: "#096",
								message: {},
								hash: d.hash_item,
								mac: d.mac_item
							};
							_this.CONTROLS[on_key].message[s] = true;
							_this.CONTROLS[off_key] = {
								key: s,
								name: off_key,
								label: label + "Off",
								description: label + "Off",
								color: "#C00",
								border: "#C00",
								background: "#C00",
								message: {},
								hash: d.hash_item,
								mac: d.mac_item
							};
							_this.CONTROLS[off_key].message[s] = false;
							break;
						default:
						//nothing
					}
				}
				d.schema_item = JSON.parse(d.schema_item);
				_this.devices[i].schema_item = d.schema_item;
				data.rows[i].schema_item = d.schema_item;
				var virtuals = d.schema_item.virtuals;
				for (s in virtuals) {
					_this.KPI[s] = virtuals[s];
				}
			});
			if (_this.ID) {
				_this.item = data.rows[0];
				_this.ROOT.temp.item = JSON.parse(JSON.stringify(_this.item));
			}
			if (_this.CALENDAR_ELEMENT.length === 0) {
				_this.getEvents();
			} else {
				_this.deploySchedules();
			}
		});
	},
	deploySchedules: function() {
		var _this = this;
		this.ROOT.page_header = this.CONF.i18n[
			this.ROOT.sensum.language
		].SCHEDULE_TITLE;
		this.ROOT.optional_description = this.CONF.i18n[
			this.ROOT.sensum.language
		].SCHEDULE_DESCRIPTION;
		this.INTERVALS = [];
		for (i = 1; i < 60; i++) {
			this.INTERVALS.push({
				value: i,
				key: i < 10 ? "0" + i : i
			});
		}
		this.START_ELEMENT.datetimepicker(this.DATEPICKER_CONFIG);
		this.END_ELEMENT.datetimepicker(this.DATEPICKER_CONFIG);
		this.START_ELEMENT.on("dp.change", function(e) {
			_this.current_event.row.start_date_event = e.date
				.utc()
				.format(_this.MYSQL_TIMESTAMP_FORMAT);
			_this.current_event.start = e.date;
			_this.current_event.end = e.date
				.clone()
				.add(
					_this.current_event.interval,
					_this.current_event.magnitude.toLowerCase() + "s"
				);
		});
		this.END_ELEMENT.on("dp.change", function(e) {
			_this.current_event.row.end_date_event = e.date
				.utc()
				.format(_this.MYSQL_TIMESTAMP_FORMAT);
		});
		this.CALENDAR_CONFIG.viewRender = function(view, element) {
			var range = view.activeRange;
			_this.current_calendar_start = range.start.toDate();
			_this.current_calendar_end = range.end.toDate();
			_this.deployEvents(range.start.toDate(), range.end.toDate());
		};
		this.CALENDAR_CONFIG.eventClick = function(calendarEvent, jsEvent, view) {
			var ID = calendarEvent.id;
			var EVENT = _this.EVENTS.filter(function(e) {
				return e.id_event === ID;
			})[0];
			_this.current_event = {
				mode: "update",
				allDay: false,
				magnitude: "MINUTE",
				interval: 1,
				row: {
					id_event: null,
					id_item: _this.item.id_item,
					start_date_event: null,
					end_date_event: null,
					control_event: {},
					interval_event: 0,
					is_repeat_event: false,
					is_forever_event: false,
					is_monday_event: true,
					is_tuesday_event: true,
					is_wednesday_event: true,
					is_thursday_event: true,
					is_friday_event: true,
					is_saturday_event: false,
					is_sunday_event: false
				}
			};
			for (k in _this.current_event.row) {
				if (k.indexOf("is_") === 0) {
					_this.current_event.row[k] = Boolean(EVENT[k]);
					continue;
				}
				_this.current_event.row[k] = EVENT[k];
			}
			//CONTROL
			_this.current_event.row.control_event = JSON.parse(
				_this.current_event.row.control_event
			);
			for (c in _this.CONTROLS) {
				var control = _this.CONTROLS[c];
				var same_key_length =
					Object.keys(_this.current_event.row.control_event.message).length ===
					Object.keys(control.message).length;
				if (
					control.hash === _this.current_event.row.control_event.hash &&
					control.mac === _this.current_event.row.control_event.mac &&
					same_key_length === true
				) {
					var is_same_message = true;
					for (m in control.message) {
						var field = control.message[m];
						if (field != _this.current_event.row.control_event.message[m]) {
							is_same_message = false;
							break;
						}
					}
					if (is_same_message === true) {
						_this.current_event.row.control_event = control;
						break;
					}
				}
			}
			//INTERVAL
			var interval = _this.current_event.row.interval_event;
			if (interval === 0) interval = _this.ROOT.minute;
			for (m in _this.MAGNITUDES) {
				var v = _this.MAGNITUDES[m].value;
				var k = _this.ROOT[v];
				if (interval < k) continue;
				if (interval % k === 0) {
					_this.current_event.magnitude = v;
					_this.current_event.interval = interval / k;
				}
			}
			//DATES
			var start = moment(Date.parse(EVENT.start_date_event));
			_this.current_event.row.start_date_event = start
				.clone()
				.utc()
				.format(_this.MYSQL_TIMESTAMP_FORMAT);
			var end = moment(Date.parse(EVENT.end_date_event));
			_this.current_event.row.end_date_event = end
				.clone()
				.utc()
				.format(_this.MYSQL_TIMESTAMP_FORMAT);
			_this.START_ELEMENT.data("DateTimePicker").date(start.clone());
			_this.END_ELEMENT.data("DateTimePicker").date(end.clone());
			$("#schedule-new-modal").modal("show");
			_this.ROOT.$applyAsync();
		};
		this.CALENDAR_CONFIG.dayClick = function(date, jsEvent, view) {
			_this.current_event = {
				mode: "insert",
				allDay: false,
				magnitude: "MINUTE",
				interval: 1,
				row: {
					id_item: _this.item.id_item,
					start_date_event: null,
					end_date_event: null,
					control_event: {
						mac: _this.item.mac_item,
						hash: _this.item.hash_item,
						key: "",
						name: "",
						label: "",
						description: "",
						color: "",
						border: "",
						background: "",
						message: {}
					},
					interval_event: 0,
					is_repeat_event: false,
					is_forever_event: false,
					is_monday_event: true,
					is_tuesday_event: true,
					is_wednesday_event: true,
					is_thursday_event: true,
					is_friday_event: true,
					is_saturday_event: false,
					is_sunday_event: false
				}
			};
			date.add(new Date(date.valueOf()).getTimezoneOffset(), "minutes");
			_this.START_ELEMENT.data("DateTimePicker").date(date.clone());
			_this.END_ELEMENT.data("DateTimePicker").minDate(date.clone());
			date.subtract(new Date(date.valueOf()).getTimezoneOffset(), "minutes");
			_this.START_ELEMENT.val(date.format(_this.MYSQL_TIMESTAMP_FORMAT));
			_this.updateInterval();
			$("#schedule-new-modal").modal("show");
			_this.ROOT.$applyAsync();
		};
		_this.CALENDAR_ELEMENT.fullCalendar(_this.CALENDAR_CONFIG);
	},
	updateInterval: function() {
		this.current_event.row.interval_event =
			this.ROOT[this.current_event.magnitude] * this.current_event.interval;
	},
	deleteEvent: function() {
		var _this = this;
		var params = {
			entity: "event",
			primary: "id_event",
			id: this.current_event.row.id_event,
			mongo: {
				collection: "schedules",
				field: "id",
				column: "id_event",
				is_number: true
			}
		};
		params.mongo.value = this.current_event.row.id_event;
		this.HTTP.post(_this.POST.events.delete, params).then(function(response) {
			var data = response.data;
			if (data.error) _this.ROOT.error = "SCHEDULE_SCHEDULE_ERROR";
			_this.deployEvents(
				_this.current_calendar_start,
				_this.current_calendar_end
			);
		});
	},
	saveEvent: function() {
		var _this = this;
		var row = {
			control_event: {}
		};
		for (k in this.current_event.row) {
			if (k === "control_event") continue;
			row[k] = this.current_event.row[k];
		}
		for (k in this.current_event.row.control_event) {
			if (k === "$$hashKey") continue;
			row.control_event[k] = this.current_event.row.control_event[k];
		}
		if (undefined === row.control_event.mac || row.control_event.mac === null) {
			row.control_event.mac = this.item.mac_item;
		}
		if (
			undefined === row.control_event.hash ||
			row.control_event.hash === null
		) {
			row.control_event.hash = this.item.hash_item;
		}
		row.control_event = JSON.stringify(row.control_event);
		row.interval_event = row.interval_event.toString();
		if (undefined === row.end_date_event || row.end_date_event === null) {
			row.end_date_event = row.start_date_event;
		}
		var params = {
			entity: "event",
			row: row,
			mongo: {
				collection: "schedules",
				field: "id",
				column: "id_event",
				is_number: true
			},
			fields: {
				start_date_event: {
					type: "date"
				},
				end_datw_event: {
					type: "date"
				},
				control_event: {
					type: "json"
				}
			}
		};
		if (
			undefined === params.row.id_event ||
			params.row.id_event === null ||
			isNaN(params.row.id_event) === true
		) {
			this.HTTP.post(this.POST.events.add, params).then(function(response) {
				var data = response.data;
				if (data.error) _this.ROOT.error = "SCHEDULE_SCHEDULE_ERROR";
				_this.deployEvents(
					_this.current_calendar_start,
					_this.current_calendar_end
				);
			});
			return;
		} else {
			params.id = this.current_event.row.id_event;
			params.primary = "id_event";
			this.HTTP.post(this.POST.events.edit, params).then(function(response) {
				var data = response.data;
				if (data.error) _this.ROOT.error = "SCHEDULE_SCHEDULE_ERROR";
				_this.deployEvents(
					_this.current_calendar_start,
					_this.current_calendar_end
				);
			});
			return;
		}
	},
	getEvents: function() {
		var _this = this;
		this.HTTP.post(this.POST.events.get, { entity: "event" }).then(function(
			response
		) {
			var data = response.data;
			_this.EVENTS = data.rows;
			_this.EVENTS.forEach(function(r) {
				r.is_repeat_event = Boolean(r.is_repeat_event);
				r.is_forever_event = Boolean(r.is_forever_event);
			});
		});
	},
	deployEvents: function(start, end) {
		var _this = this;
		this.CALENDAR_ELEMENT.fullCalendar("removeEvents");
		var params = {
			start: start.getTime(),
			end: end.getTime(),
			event_duration: this.EVENT_DURATION,
			event_magnitude: this.EVENT_MAGNITUDE
		};
		if (this.ID) {
			params.id = this.item.id_item;
		}
		this.HTTP.post(this.POST.events.list, params).then(function(response) {
			var data = response.data;
			_this.EVENTS = data.rows;
			data.events.forEach(function(e) {
				_this.CALENDAR_ELEMENT.fullCalendar("renderEvent", e, true);
			});
		});
	},
	submit: function() {
		var _this = this;
		this.HTTP.post(this.POST.rename, {
			entity: "item",
			id: this.ID,
			primary: "id_item",
			row: { name_item: this.item.name_item, mac_item: this.item.mac_item },
			mongo: {
				collection: "items",
				field: "mac",
				column: "mac_item",
				is_number: true
			}
		}).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "SCHEDULE_RENAME_ERROR");
			_this.ROOT.success = "SCHEDULE_RENAME_SUCCESS";
		});
	},
	getDeviceName: function(mac) {
		if (!this.devices) return null;
		var device = this.devices.filter(function(d) {
			return d.mac_item === mac;
		})[0];
		if (device) return device.name_item;
		return null;
	}
};
var app = angular
	.module("schedule", ["ngRoute"])
	.controller("ScheduleController", [
		"$route",
		"$routeParams",
		"$rootScope",
		"$scope",
		"$http",
		ScheduleController
	]);
