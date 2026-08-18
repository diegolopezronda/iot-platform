/***
 *
 ***/
function PlottingController($rootScope, $scope, $http, $routeParams) {
	/***
	 * AngularJS scope.
	 ***/
	this.ROOT = $rootScope;
	this.U = "undefined";
	/***
	 * AngularJS routeParams
	 ***/
	this.PARAMS = $routeParams;
	/***
	 * AngularJS scope.
	 ***/
	this.SCOPE = $scope;
	/***
	 * AngularJS scope.
	 ***/
	this.HTTP = $http;
	//Instance variables
	/***
	 * End date for plotting.
	 ***/
	this.end_date = new Date().getTime();
	/***
	 * Start date for plotting.
	 ***/
	this.start_date = this.end_date - this.ROOT.DAY;
	/***
	 * Data to plot.
	 ***/
	this.data = [];
	/***
	 * Data to plot filtered.
	 ***/
	this.filtered_data = [];
	/***
	 * filters
	 ***/
	this.current_hour = null;
	this.item_filters = [];
	this.kpi_filters = [];
	this.zone_lock = [];
	/***
	 * Chart options
	 ***/

	this.CHART_OPTIONS = {
		xaxis: {
			mode: "time",
			timezone: "browser",
			tickColor: "rgba(255,255,255,0)"
		},
		yaxis: {
			zoomRange: [1, 1],
			ticks: 10,
			panRange: false
		},
		yaxes: [],
		series: {
			lines: { show: true, fill: true },
			points: { show: true },
			/*
			curvedLines: {
				apply: true,
				//active: true,
				monotonicFit: true
			},
*/
			grow: {
				active: true,
				steps: 20
			},
			bars: {
				show: false,
				barWidth: this.ROOT.HOUR,
				align: "left",
				horizontal: false
			},
			autoMarkings: {
				enabled: false,
				showAvg: true,
				showMinMax: false
			}
		},
		pan: {
			interactive: true
		},
		legend: { show: false },
		grid: {
			hoverable: true,
			clickable: true,
			borderWidth: 0,
			margin: {
				left: 5,
				right: 30,
				top: 5,
				bottom: 5
			},
			labelMargin: 5,
			axisMargin: 0
		}
	};
	/***
	 *
	 ***/
	this.tooltip_date = null;
	this.PLOTTING_KEYS = [
		{
			icon: "clock-o",
			letter: "T",
			key: "PLOTTING_TODAY",
			value: "today",
			eta: "0s"
		},
		{
			icon: "calendar",
			letter: "7",
			key: "PLOTTING_WEEK",
			value: "this_week",
			eta: "0s"
		},
		{
			icon: "calendar",
			letter: "30",
			key: "PLOTTING_MONTH",
			value: "this_month",
			eta: "6s"
		},
		{
			icon: "calendar",
			letter: "365",
			key: "PLOTTING_YEAR",
			value: "this_year",
			eta: "2 min"
		},
		{ icon: "magic", letter: "C", key: "PLOTTING_CUSTOM", value: "custom" }
	];
	this.ITEM_KEYS = {
		mac_item: "ID",
		name_item: "Name",
		name_asset: "Type"
	};
	/***
	 *
	 ***/
	this.ID =
		undefined === this.PARAMS.id || this.PARAMS.id === null
			? -1
			: this.PARAMS.id;
	this.MODULE_CONF = this.ROOT.sensum.modules.plotting.routes;
	this.CONF = this.MODULE_CONF[
		this.ID === -1
			? location.pathname.replace(/\/$/g, "")
			: location.pathname.replace("/" + this.PARAMS.id, "").replace(/\/$/g, "")
	];
	this.KPI = [];
	this.LOCALE = this.CONF.locale;
	/***
	 * DOM ID for chart
	 ***/
	this.CHART_ID = "#plotting-chart";
	this.ZOOM_LEFT = ($(this.CHART_ID).width() - 100) / 2;
	this.TOOLTIP_ID = "#plotting-tooltip";
	this.TOOLTIP = null;
	this.TIME_FORMATS = [
		{
			gt: this.ROOT.DAY * 90,
			sizes: {
				xs: {
					timeformat: "%b",
					tickSize: [3, "month"],
					barWidth: this.ROOT.DAY
				},
				sm: {
					timeformat: "%b",
					tickSize: [3, "month"],
					barWidth: this.ROOT.DAY
				},
				md: {
					timeformat: "%b",
					tickSize: [1, "month"],
					barWidth: this.ROOT.DAY
				},
				lg: {
					timeformat: "%b",
					tickSize: [1, "month"],
					barWidth: this.ROOT.DAY
				}
			}
		},
		{
			gt: this.ROOT.DAY * 27,
			sizes: {
				xs: {
					timeformat: "%b %d",
					tickSize: [7, "day"],
					barWidth: this.ROOT.DAY
				},
				sm: {
					timeformat: "%b %d",
					tickSize: [7, "day"],
					barWidth: this.ROOT.DAY
				},
				md: {
					timeformat: "%b %d",
					tickSize: [1, "day"],
					barWidth: this.ROOT.DAY
				},
				lg: {
					timeformat: "%b %d",
					tickSize: [1, "day"],
					barWidth: this.ROOT.DAY
				}
			}
		},
		{
			gt: this.ROOT.DAY * 2,
			sizes: {
				xs: {
					timeformat: "%b %d",
					tickSize: [4, "day"],
					barWidth: this.ROOT.DAY
				},
				sm: {
					timeformat: "%b %d",
					tickSize: [4, "day"],
					barWidth: this.ROOT.DAY
				},
				md: {
					timeformat: "%b %d",
					tickSize: [1, "day"],
					barWidth: this.ROOT.DAY
				},
				lg: {
					timeformat: "%b %d",
					tickSize: [1, "day"],
					barWidth: this.ROOT.DAY
				}
			}
		},
		{
			gt: this.ROOT.DAY,
			sizes: {
				xs: {
					timeformat: "%h:%M <br> %b %d",
					tickSize: [8, "hour"],
					barWidth: this.ROOT.HOUR
				},
				sm: {
					timeformat: "%h:%M <br> %b %d",
					tickSize: [8, "hour"],
					barWidth: this.ROOT.HOUR
				},
				md: {
					timeformat: "%h:%M <br> %b %d",
					tickSize: [1, "hour"],
					barWidth: this.ROOT.HOUR
				},
				lg: {
					timeformat: "%h:%M <br> %b %d",
					tickSize: [1, "hour"],
					barWidth: this.ROOT.HOUR
				}
			}
		},
		{
			gt: this.ROOT.HOUR,
			sizes: {
				xs: {
					timeformat: "%h:%M <br> %b %d",
					tickSize: [8, "hour"],
					barWidth: this.ROOT.HOUR
				},
				sm: {
					timeformat: "%h:%M <br> %b %d",
					tickSize: [8, "hour"],
					barWidth: this.ROOT.HOUR
				},
				md: {
					timeformat: "%h:%M <br> %b %d",
					tickSize: [1, "hour"],
					barWidth: this.ROOT.HOUR
				},
				lg: {
					timeformat: "%h:%M <br> %b %d",
					tickSize: [1, "hour"],
					barWidth: this.ROOT.HOUR
				}
			}
		},
		{
			gt: this.ROOT.MINUTE,
			sizes: {
				xs: {
					timeformat: "%h:%M",
					tickSize: [15, "minute"],
					barWidth: this.ROOT.MINUTE
				},
				sm: {
					timeformat: "%h:%M",
					tickSize: [15, "minute"],
					barWidth: this.ROOT.MINUTE
				},
				md: {
					timeformat: "%h:%M",
					tickSize: [5, "minute"],
					barWidth: this.ROOT.MINUTE
				},
				lg: {
					timeformat: "%h:%M",
					tickSize: [5, "minute"],
					barWidth: this.ROOT.MINUTE
				}
			}
		},
		{
			gt: this.ROOT.SECOND,
			sizes: {
				xs: {
					timeformat: "%h:%M:%S",
					tickSize: [15, "second"],
					barWidth: this.ROOT.SECOND
				},
				sm: {
					timeformat: "%h:%M:%S",
					tickSize: [15, "second"],
					barWidth: this.ROOT.SECOND
				},
				md: {
					timeformat: "%h:%M:%S",
					tickSize: [5, "second"],
					barWidth: this.ROOT.SECOND
				},
				lg: {
					timeformat: "%h:%M:%S",
					tickSize: [5, "second"],
					barWidth: this.ROOT.SECOND
				}
			}
		},
		{ gt: 1, timeformat: "%h:%M:%S", tickSize: 100, barWidth: 1 }
	];
	this.SMALL = $(document).width() < 1024;
	this.ON_COLOR = "bg-teal";
	this.OFF_COLOR = "bg-gray";
	this.visible_item = null;
	this.BAR_GRAPH = this.CHART_OPTIONS.series.bars.show;
	this.POINTS = this.CHART_OPTIONS.series.points.show;
	this.FILL = this.CHART_OPTIONS.series.lines.fill;
	this.MULTI_AXES = false;
	this.item_filter_buffer = [];
	this.show_table = false;
	this.ASSETS = {};
	this.ZONES = {};
	this.zone_filters = [];
	this.updating = false;
	//CONTROLLER START-UP
	this.constructor();
}
//PROTOTYPE DEFINITION
PlottingController.prototype = {
	constructor: function() {
		var _this = this;
		this.ROOT.overlay_times[_this.CONF.post.stats] = {
			times: 1,
			current_times: 0
		};
		this.analize = typeof this.PARAMS.analize !== "undefined";
		this.ROOT.page_header = "Stats";
		//if (this.ID > -1) this.ROOT.temp.device_id = this.ID;
		this.initialize();
		this.updateItems(function(r) {
			_this.preparePlot("today");
		});
	},
	/***
	 * Prepares scenario.
	 ***/
	initialize: function() {
		var _this = this;
		$("#plotting-custom-interval").daterangepicker({
			locale: {
				format: "DD-MM-YYYY"
			},
			drops: "down",
			maxDate: new Date(),
			minDate: new Date() - 365 * _this.ROOT.DAY,
			autoApply: true
		});
		$(_this.CHART_ID).bind("plotclick", function(evt, position, item) {
			if (_this.tooltip_date && $(_this.TOOLTIP_ID + ":hover").length) return;
			if (!item) {
				_this.tooltip_date = null;
				_this.TOOLTIP = null;
				return $(_this.TOOLTIP_ID).hide();
			}
			_this.TOOLTIP = {};
			var series = item.seriesIndex;
			var index = item.dataIndex;
			_this.tooltip_date = _this.plotting_data[series].data[index][0];
			var date = new Date(_this.tooltip_date);
			_this.TOOLTIP.date = date.toLocaleString();
			_this.TOOLTIP.value = _this.plotting_data[series].data[index][1];
			var label = item.series.label.replace("&nbsp;", "");
			_this.TOOLTIP.label = item.series.alpha;
			var lw_label = label.toLowerCase();
			var kpi_index = -1;
			var a = 0;
			while (a < _this.KPI.length) {
				if (_this.KPI[a].name == lw_label) {
					kpi_index = a;
					break;
				}
				++a;
			}
			_this.TOOLTIP.color = _this.KPI[kpi_index].color;
			_this.TOOLTIP.unit = _this.KPI[kpi_index].unit;
			_this.TOOLTIP.group = _this.KPI[kpi_index].group;
			$("#plotting-tooltip-modal").modal("show");
			_this.ROOT.$applyAsync();
		});
		$(_this.CHART_ID).bind("plotpan", function(evt, plot) {
			var axes = _this.PLOT.getAxes();
			var scale_name = _this.PLOT.getOptions().xaxis.tickSize[1];
			var scale = _this.PLOT.getOptions().xaxis.barWidth;
			if (scale_name === "day") scale = _this.ROOT.DAY * 3;
			var min = Math.floor(axes.xaxis.min);
			var max = Math.floor(axes.xaxis.max);
			var max_diff = max - _this.end_date;
			var min_diff = _this.start_date - min;
			if (min_diff > scale && _this.updating === false) {
				_this.updating = true;
				var kpi = {};
				_this.KPI.forEach(function(k) {
					kpi[k.name] = {
						group: k.group,
						decimals: k.decimals,
						incremental: k.incremental
					};
				});
				_this.HTTP.post(_this.CONF.post.stats, {
					items: _this.item_filters,
					start: min,
					end: _this.start_date,
					timezone: "Pacific/Auckland",
					kpi: kpi
				}).then(function(response) {
					var data = response.data;
					var d = data.data;
					_this.plotting_data.forEach(function(pd) {
						if (undefined === d[pd.label] || d[pd.label] === null) {
							d[pd.label] = [];
						}
						pd.data = d[pd.label].concat(pd.data);
					});
					_this.PLOT.setData(_this.plotting_data);
					_this.PLOT.draw();
					if (scale < _this.ROOT.DAY * 2) {
						if (undefined === data.details || data.details === null) {
							data.details = [];
						}
						_this.pairs = data.details.concat(_this.pairs);
						_this.applyDateFilters(false);
					}
					_this.start_date = min;
					_this.updating = false;
				});
				return;
			}
			if (max_diff > scale && _this.updating === false) {
				_this.updating = true;
				var kpi = {};
				_this.KPI.forEach(function(k) {
					kpi[k.name] = {
						group: k.group,
						decimals: k.decimals,
						incremental: k.incremental
					};
				});
				_this.HTTP.post(_this.CONF.post.stats, {
					items: _this.item_filters,
					start: _this.end_date,
					end: max,
					timezone: "Pacific/Auckland",
					kpi: kpi
				}).then(function(response) {
					var data = response.data;
					var d = data.data;
					_this.plotting_data.forEach(function(pd) {
						pd.data = pd.data.concat(d[pd.label]);
					});
					_this.PLOT.setData(_this.plotting_data);
					_this.PLOT.draw();
					if (scale < _this.ROOT.DAY * 2) {
						_this.pairs = _this.pairs.concat(data.details);
						_this.applyDateFilters(false);
					}
					_this.end_date = max;
					_this.updating = false;
				});
				return;
			}
		});
	},
	/***
	 * Plot alerts grouped by type.
	 ***/
	plot: function() {
		var _this = this;
		this.startdate_label = new Date(this.start_date).toLocaleDateString(
			this.LOCALE
		);
		this.enddate_label = new Date(this.end_date).toLocaleDateString(
			this.LOCALE
		);
		this.show_table = false;
		var kpi = {};
		this.KPI.forEach(function(k) {
			kpi[k.name] = {
				group: k.group,
				decimals: k.decimals,
				incremental: k.incremental
			};
		});

		var diff = this.end_date - this.start_date;
		var params = {
			items: this.item_filters,
			start: this.start_date,
			end: this.end_date,
			timezone: "Pacific/Auckland",
			kpi: kpi
		};
		this.HTTP.post(this.CONF.post.stats, params).then(function(response) {
			if (response.data.error) {
				_this.ROOT.error = "PLOTTING_ERROR";
				return;
			}
			var d = response.data.data;
			_this.performance = response.data.performance;
			_this.pairs = response.data.details;
			_this.filtered_pairs = response.data.details;
			_this.current_date_filter = null;
			if (typeof d === "undefined" || !d || d.length == 0) return;
			_this.data = d;
			_this.KPI.forEach(function(kpi) {
				_this[kpi.name] = d[kpi.name];
			});
			_this.applyKPIFilters();
			_this.updateTimeFormat(_this.start_date, _this.end_date);
			_this.PLOT = $.plot(
				_this.CHART_ID,
				_this.plotting_data,
				_this.CHART_OPTIONS
			);
			_this.PLOT.draw();
			_this.tooltip_date = null;
			$(_this.TOOLTIP_ID).hide();
			_this.show_table = true;
		});
	},
	/***
	 * Update items,
	 ***/
	updateItems: function(callback) {
		var _this = this;
		var params = {
			entity: "items_view",
			key: "id_item",
			value: Number(this.ID)
		};
		var post = this.ID === -1 ? "all" : "one";
		this.HTTP.post(this.CONF.post[post], params).then(function(response) {
			var assets = response.data.rows;
			_this.items = assets;
			if (_this.ID) {
				_this.ROOT.temp.item = JSON.parse(JSON.stringify(assets[0]));
			}
			_this.search_items = _this.items;
			_this.item_filters = [];
			var zones = [];
			_this.items.forEach(function(i) {
				i.mac = i.mac_item;
				_this.item_filters.push(i.mac);
				i.zones_item = JSON.parse(i.zones_item);
				if (i.zones_item === null) {
					i.zones_item = [];
				} else {
					zones = zones.concat(
						i.zones_item.filter(function(z) {
							return zones.indexOf(z) === -1;
						})
					);
				}
				if (i.schema_item) {
					i.schema_item = JSON.parse(i.schema_item);
					if (
						undefined === i.schema_item.display ||
						i.schema_item.display === null
					) {
						//
					} else {
						_this.kpi_filters = _this.kpi_filters.concat(
							Object.keys(i.schema_item.display).filter(function(d) {
								return (
									i.schema_item.display[d] &&
									_this.kpi_filters.indexOf(d) === -1
								);
							})
						);
					}
				} else {
					i.schema_item = {};
				}
				if (i.schema_asset === null) return;
				var json = JSON.parse(i.schema_asset);
				if (
					undefined === i.schema_item.virtuals ||
					i.schema_item.virtuals === null
				) {
					i.schema_item.virtuals = {};
				}
				for (v in i.schema_item.virtuals) {
					json.attributes[v] = JSON.parse(
						JSON.stringify(i.schema_item.virtuals[v])
					);
				}
				var kpi = json.attributes;
				if (undefined === _this.ASSETS[i.id_asset.toString()]) {
					_this.ASSETS[i.id_asset.toString()] = json.attributes;
				} else {
					return;
				}
				delete kpi.latitude;
				delete kpi.longitude;
				for (k in kpi) {
					var q = kpi[k];
					if (
						q.private === true ||
						undefined === q.type ||
						q.type === null ||
						["text", "message", "direction"].indexOf(q.type) != -1
					) {
						continue;
					}
					q.name = k;
					var exists = false;
					_this.KPI.forEach(function(z) {
						if (z.name === k) exists = true;
					});
					if (exists === true) continue;
					q.color =
						_this.ROOT.sensum.constants.SENSUM_COLORS[_this.KPI.length % 32];
					_this.KPI.push(q);
				}
			});
			this.item_filter_buffer = this.item_filters;
			if (zones.length === 0) return callback(response);
			var params = {
				entity: "zone",
				key: "id_zone",
				value: zones
			};
			_this.HTTP.post(_this.CONF.post.one, params).then(function(response) {
				var data = response.data;
				if (data.error) return (_this.ROOT.error = "PLOTTING_ERROR");
				data.rows.forEach(function(z) {
					var id = z.id_zone.toString();
					_this.ZONES[id] = z;
					_this.zone_filters.push(id);
				});
				callback(response);
			});
		});
	},
	/***
	 * Update visible item,
	 ***/
	resetKPIFilters: function() {
		var _this = this;
		this.kpi_filters = [];
		this.toggleKPIFilter(null);
	},
	/***
	 * Update visible item,
	 ***/

	resetItemFilters: function() {
		var _this = this;
		this.applyZoneFilters(true);
	},
	/***
	 * Update time format
	 ***/
	updateTimeFormat: function(start_date, end_date) {
		var n = 0;
		var diff = end_date - start_date;
		while (diff < this.TIME_FORMATS[n].gt && n < this.TIME_FORMATS.length) n++;
		var barwidth = this.TIME_FORMATS[n].barWidth;
		this.CHART_OPTIONS.series.bars.barWidth = barwidth;
		this.title_format = "DD/MM/YYYY";
		if (barwidth < this.ROOT.DAY) this.title_format += " HH:mm";
		if (barwidth < this.ROOT.MINUTE) this.title_format += ":ss";
		this.angular_title_format = this.title_format
			.replace(/D/g, "d")
			.replace(/Y/g, "y");
		this.startdate_label = moment(start_date).format(this.title_format);
		this.enddate_label = moment(end_date).format(this.title_format);
		var w = $(document).width();
		var size = "xs";
		if (w >= 576) size = "sm";
		if (w >= 768) size = "md";
		if (w >= 992) size = "lg";
		//if (w > 1200) size = "xl";
		this.CHART_OPTIONS.xaxis = Object.assign(
			JSON.parse(JSON.stringify(this.CHART_OPTIONS.xaxis)),
			JSON.parse(JSON.stringify(this.TIME_FORMATS[n].sizes[size]))
		);
	},
	/***
	 *
	 ***/
	applyKPIFilters: function() {
		this.plotting_data = [];
		var _this = this;
		this.applyDateFilters(false);
		if (this.kpi_filters.length == 0) {
			this.KPI.forEach(function(kpi) {
				_this.kpi_filters.push(kpi.name);
			});
		}
		this.CHART_OPTIONS.yaxes = [
			{
				position: "left",
				axisLabel: "hola",
				ticks: 10,
				axisLabelUseCanvas: true,
				axisLabelFontSizePixels: 10,
				axisLabelFontFamily: "FreeSans",
				axisLabelPadding: 3
			}
		];
		this.KPI.forEach(function(k, i) {
			var kpi = k.name;
			if (_this.kpi_filters.indexOf(kpi) == -1) return;
			_this.CHART_OPTIONS.yaxes.push({
				position: "left",
				color: k.color,
				tickColor: "#CCC",
				ticks: 10,
				alignTicksWithAxis: 1,
				axisLabel: k.label,
				axisLabelUseCanvas: true,
				axisLabelFontSizePixels: 10,
				axisLabelFontFamily: "FreeSans",
				axisLabelPadding: 3
			});
			k.yaxis = _this.CHART_OPTIONS.yaxes.length - 1;
			_this.plotting_data.push({
				data: _this[kpi],
				label: kpi,
				alpha: k.label,
				color: k.color,
				yaxis: _this.MULTI_AXES ? k.yaxis : 1,
				shadowSize: 0
			});
		});
	},
	/***
	 *
	 ***/
	toggleKPIFilter: function(kpi) {
		var _this = this;
		this.filter_status = true;
		if (this.KPI.length == this.kpi_filters.length) this.kpi_filters = [];
		if (undefined != kpi && kpi != null) {
			var index = this.kpi_filters.indexOf(kpi);
			if (index === -1) {
				this.kpi_filters.push(kpi);
			} else {
				this.kpi_filters.splice(index, 1);
			}
		}
		this.applyKPIFilters();
		_this.PLOT = $.plot(
			_this.CHART_ID,
			_this.plotting_data,
			_this.CHART_OPTIONS
		);
		this.filter_status = false;
	},
	/***
	 *
	 ***/
	startItemFilter: function() {
		var _this = this;
		this.item_filter_buffer = this.item_filters;
	},
	/***
	 *
	 ***/
	applyItemFilter: function() {
		this.applyZoneFilters(true);
		this.item_filters = this.item_filter_buffer;
		this.plot();
	},
	/***
	 *
	 ***/
	toggleItemFilter: function(mac) {
		var _this = this;
		var len = this.items.length;
		if (len === this.item_filter_buffer.length) this.item_filter_buffer = [];
		if (typeof mac != "undefined" && mac != null) {
			var index = this.item_filter_buffer.indexOf(mac);
			if (index === -1) {
				this.item_filter_buffer.push(mac);
			} else {
				this.item_filter_buffer.splice(index, 1);
			}
		}
		if (this.item_filter_buffer.length === 0) {
			this.items.forEach(function(i) {
				_this.item_filter_buffer.push(i.mac);
			});
		}
	},
	/***
	 *
	 ***/
	applyZoneFilters: function(reset) {
		var _this = this;
		if (reset === true) {
			this.item_filter_buffer = [];
			this.items.forEach(function(i) {
				_this.item_filter_buffer.push(i.mac);
			});
		}
		this.zone_lock = [];
		this.item_filter_buffer = this.item_filter_buffer.filter(function(b) {
			var item = _this.items.filter(function(i) {
				return i.mac_item === b;
			});
			if (item.length === 0) return false;
			var zones = item[0].zones_item;
			var n = zones.length;
			for (a = 0; a < n; a++) {
				var z = zones[a].toString();
				if (_this.zone_filters.indexOf(z) === -1) continue;
				return true;
			}
			_this.zone_lock.push(b);
			return false;
		});
	},
	/***
	 *
	 ***/
	toggleZoneFilter: function(zone) {
		var _this = this;
		if (Object.keys(this.ZONES).length === this.zone_filters.length) {
			this.zone_filters = [];
		}
		if (undefined != zone && zone != null) {
			var index = this.zone_filters.indexOf(zone);
			if (index === -1) {
				this.zone_filters.push(zone);
			} else {
				this.zone_filters.splice(index, 1);
			}
		}
		if (this.zone_filters.length === 0) {
			this.zone_filters = Object.keys(this.ZONES);
		}
		this.applyItemFilter();
	},
	/***
	 *
	 ***/
	preparePlot: function(scope) {
		var _this = this;
		this.ROOT.$applyAsync(function() {
			angular
				.element(".plotting-scope")
				.removeClass(_this.ON_COLOR)
				.addClass(_this.OFF_COLOR);
			angular
				.element(".plotting-scope[data-scope=" + scope + "]")
				.removeClass(_this.OFF_COLOR)
				.addClass(_this.ON_COLOR);
		});
		$("#plotting-custom").slideUp();
		var interval = "";
		switch (scope) {
			case "today":
				interval = "day";
				break;
			case "this_week":
				interval = "isoweek";
				break;
			case "this_month":
				interval = "month";
				break;
			case "this_year":
				interval = "year";
				break;
			case "custom":
				$("#plotting-custom").slideDown();
				return;
			default:
		}
		var now = moment();
		this.start_date = now
			.clone()
			.startOf(interval)
			.valueOf();
		this.end_date = now
			.clone()
			.endOf(interval)
			.valueOf();
		this.CHART_OPTIONS.xaxis.min = this.start_date;
		this.CHART_OPTIONS.xaxis.max = this.end_date;
		this.plot();
	},
	/***
	 *
	 ***/
	prepareCustomPlot: function() {
		var values = $("#plotting-custom-interval")
			.val()
			.split(" - ");
		this.start_date = moment(values[0], "DD-MM-YYYY")
			.startOf("day")
			.valueOf();
		this.end_date = moment(values[1], "DD-MM-YYYY")
			.endOf("day")
			.valueOf();
		this.CHART_OPTIONS.xaxis.min = this.start_date;
		this.CHART_OPTIONS.xaxis.max = this.end_date;
		this.plot();
	},
	/***
	 *
	 ***/
	toggleBarGraph: function(active) {
		this.BAR_GRAPH = active;
		this.CHART_OPTIONS.series.bars.show = active;
		this.POINTS = !active;
		this.CHART_OPTIONS.series.points.show = !active;
		this.CHART_OPTIONS.series.lines.show = !active;
		this.PLOT = $.plot(this.CHART_ID, this.plotting_data, this.CHART_OPTIONS);
	},
	togglePoints: function(active) {
		this.POINTS = active;
		this.CHART_OPTIONS.series.points.show = this.POINTS;
		this.PLOT = $.plot(this.CHART_ID, this.plotting_data, this.CHART_OPTIONS);
	},
	toggleFill: function(active) {
		this.FILL = active;
		this.CHART_OPTIONS.series.lines.fill = this.FILL;
		this.PLOT = $.plot(this.CHART_ID, this.plotting_data, this.CHART_OPTIONS);
	},
	toggleMultiAxes: function(active) {
		var _this = this;
		this.MULTI_AXES = active;
		this.plotting_data = [];
		this.KPI.forEach(function(k, i) {
			var kpi = k.name;
			if (_this.kpi_filters.indexOf(kpi) == -1) return;
			_this.plotting_data.push({
				data: _this[kpi],
				label: "&nbsp;" + kpi,
				alpha: k.label,
				color: k.color,
				yaxis: _this.MULTI_AXES ? k.yaxis : 1,
				shadowSize: 0
			});
		});
		this.FILL = false;
		this.CHART_OPTIONS.series.lines.fill = this.FILL;
		//this.PLOT = $.plot(this.CHART_ID, this.plotting_data, this.CHART_OPTIONS);
		this.plot();
	},
	/***
	 *
	 ***/
	getItemName: function(mac) {
		var filter = this.items.filter(function(i) {
			return i.mac == mac;
		});
		if (filter.length === 0) {
			return this.CONF.i18n[this.ROOT.sensum.language].UNKNOWN + "#" + mac;
		}
		return filter[0].name_item;
	},
	/***
	 *
	 ***/
	applyDateFilters: function(use_tooltip) {
		var _this = this;
		if (use_tooltip) this.current_date_filter = this.tooltip_date;
		var n = _this.kpi_filters.length;
		_this.date_filter_label = "";
		/*
		if(n < _this.KPI.length && n > 0){
			_this.date_filter_label = "filtered by "+_this.kpi_filters.join(', ');
		}
		*/
		_this.filtered_pairs = _this.pairs.filter(function(p) {
			var sum = 0;
			for (k = 0; k < n; k++) {
				sum += p[_this.kpi_filters[k]];
			}
			if (n !== 0 && sum === 0) return false;
			if (
				typeof _this.current_date_filter === "undefined" ||
				!_this.current_date_filter
			)
				return true;
			return p.date === _this.current_date_filter;
		});
		_this.ROOT.$applyAsync();
		if (_this.current_date_filter) {
			_this.date_filter_label += moment(_this.current_date_filter).format(
				" [at] " + this.title_format
			);
		}
	},
	resetDateFilters: function() {
		this.tooltip_date = null;
		this.applyDateFilters(true);
	},
	getDetails: function(tooltip_date) {
		var diff = this.end_date - this.start_date;
		var unit = "day";
		if (diff > this.ROOT.DAY) {
			unit = "day";
		} else if (diff > this.ROOT.HOUR) {
			unit = "hour";
		} else {
			unit = "minute";
		}
		this.start_date = moment(tooltip_date)
			.startOf(unit)
			.valueOf();
		this.end_date = moment(tooltip_date)
			.endOf(unit)
			.valueOf();
		this.CHART_OPTIONS.xaxis.min = this.start_date;
		this.CHART_OPTIONS.xaxis.max = this.end_date;
		this.plot();
	},
	csv: function() {
		var _this = this;
		var comma = ";";
		var file = "";
		file += "line" + comma;
		file += "id" + comma;
		file += "name" + comma;
		file += "date" + comma;
		this.kpi_filters.forEach(function(kpi) {
			file += kpi + comma;
		});
		file += "\r\n";
		this.filtered_pairs.forEach(function(p, i) {
			var line = i + 1 + comma;
			line += p.mac + comma;
			line += _this.getItemName(p.mac) + comma;
			line += moment(p.date).format("YYYY-MM-DD HH:mm:ss") + comma;
			_this.kpi_filters.forEach(function(kpi) {
				var value = p[kpi];
				if (undefined === value || value === null) value = "";
				line += value + comma;
			});
			line += "\r\n";
			file += line;
		});
		href = "data:text/csv," + encodeURI(file);
		var a = document.createElement("a");
		document.body.appendChild(a);
		a.id = "sensum-download";
		a.href = href;
		a.target = "_self";
		a.download = moment().format("[device data ]YYYY-MM-DD[_]HHmmss") + ".csv";
		a.click();
		if (a.parentNode) a.parentNode.removeChild(a);
	}
};
//MODULE DEFINITION
var app = angular
	.module("plotting", ["ngRoute"])
	.controller("PlottingController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		PlottingController
	]);
