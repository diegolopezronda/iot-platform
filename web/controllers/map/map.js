/***
 * Displays a map in the view.
 * Select latitude and longitude columns from an entity,
 * and show markers.
 ***/
function MapController($rootScope, $scope, $http, $routeParams) {
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
	this.CONF = this.ROOT.sensum.modules.map.routes[
		location.pathname.replace(/\/$/g, "")
	];
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
	this.ROUTE_PARAMS = $routeParams;
	/***
	 * DOM element that displays map.
	 ***/
	this.MAP = $("#map");
	/***
	 * google maps InfoWindow
	 ***/
	this.INFOWINDOW = new google.maps.InfoWindow();
	//START-UP
	this.DIRECTION_ICONS = {
		N: "up",
		S: "down",
		W: "left",
		E: "right"
	};
	this.ZONE_COLORS = {
		OK: "#33FF33",
		FAIL: "#d81b60",
		UNKNOWN: "#EEEEEE",
		STROKE: "#333333"
	};
	/*
Match between DarkSky and Weather icons.
*/
	this.WEATHER_ICONS = {
		"clear-day": "sunny",
		"clear-night": "clear",
		rain: "rain",
		snow: "snow",
		sleet: "sleet",
		wind: "windy",
		og: "fog",
		cloudy: "cloudy",
		"partly-cloudy-day": "cloudy",
		"partly-cloudy-night": "partly-cloudy"
	};
	this.WEATHER_KPI = {
		temperature: { label: "MAP_FORECAST_TEMPERATURE", unit: "˚C", factor: 1 },
		apparentTemperature: {
			label: "MAP_FORECAST_APPARENT_TEMPERATURE",
			unit: "˚C",
			factor: 1
		},
		dewPoint: { label: "MAP_FORECAST_DEW_POINT", unit: "˚C", factor: 1 },
		humidity: { label: "MAP_FORECAST_HUMIDITY", unit: "%", factor: 100 },
		cloudCover: { label: "MAP_FORECAST_CLOUD_COVER", unit: "%", factor: 100 },
		precipIntensity: {
			label: "MAP_FORECAST_PRECIPITATION_INTENSITY",
			unit: "mm/h",
			factor: 1
		},
		precipProbability: {
			label: "MAP_FORECAST_PRECIPITATION_PROBABILITY",
			unit: "%",
			factor: 1
		},
		uvIndex: { label: "MAP_FORECAST_UV_INDEX", unit: "", factor: 1 },
		pressure: { label: "MAP_FORECAST_PRESSURE", unit: "hPa", factor: 1 },
		ozone: { label: "MAP_FORECAST_OZONE", unit: "DU", factor: 1 },
		windBearing: { label: "MAP_FORECAST_WIND_BEARING", unit: "˚", factor: 1 },
		windGust: { label: "MAP_FORECAST_WIND_GUST", unit: "kph", factor: 1 },
		windSpeed: { label: "MAP_FORECAST_WIND_SPEED", unit: "kph", factor: 1 }
	};
	this.MACS = [];
	this.DEVICES = {};
	this.device_markers = {};
	this.current_device = null;
	this.ZONES = {};
	this.zone_markers = {};
	this.current_zone = null;
	this.current_kpi = null;
	this.SUBSCRIPTORS = {};
	this.fill_opacity = 0.2;
	this.stroke_opacity = 0.2;
	this.no_attributes = true;
	this.device_comment = {
		id_user: this.ROOT.user.id_user,
		first_name_user: this.ROOT.user.first_name_user,
		last_name_user: this.ROOT.user.last_name_user,
		account_user: this.ROOT.user.account_user
	};
	this.current_zindex = 1000;
	this.constructor();
}
//PROTOTYPE DEFINITION
MapController.prototype = {
	/***
	 * Entry-point of controller.
	 ***/
	constructor: function() {
		delete this.ROOT.parent_zone;
		delete this.ROOT.map_center;
		var _this = this;
		//Sets the current header and description in local language.
		this.ROOT.page_header = this.ROOT.sensum.modules.map.i18n[
			this.ROOT.sensum.language
		].HEADER;
		this.ROOT.optional_description = this.ROOT.sensum.modules.map.i18n[
			this.ROOT.sensum.language
		].DESCRIPTION;
		//Turns off the overlay when downloading data.
		this.ROOT.overlay_times[this.CONF.post.data] = {
			times: 0,
			current_times: 0
		};
		this.ROOT.overlay_times["/forecast/"] = {
			times: 0,
			current_times: 0
		};
		this.ROOT.overlay_times["/mendelssohn/fetch/"] = {
			times: 0,
			current_times: 0
		};
		this.ROOT.overlay_times["/mendelssohn/insert/"] = {
			times: 0,
			current_times: 0
		};
		this.ROOT.overlay_times["/mozart/subscriptions/set/"] = {
			times: 0,
			current_times: 0
		};
		//Loads Google Map.
		this.showMap();
		//Downloading Zones.
		var zone_params = {
			entity: "zones_view",
			key: "id_project",
			value: this.ROOT.sensum.project.id_project
		};
		var item_params = {
			entity: "items_view",
			key: "id_project",
			value: this.ROOT.sensum.project.id_project
		};
		this.HTTP.post(this.CONF.post.zones, zone_params).then(function(response) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = data.error);
			if (data.rows.length === 0) {
				_this.ROOT.warning = "MAP_NO_ZONES";
			}
			//Deploying zones in the map using their geojson.
			var bounds = new google.maps.LatLngBounds();
			data.rows.forEach(function(r, zindex) {
				//item_params.value.push(r.id_zone);
				r.name_metadata = JSON.parse(r.name_metadata);
				r.schema_metadata = JSON.parse(r.schema_metadata);
				r.metadata_zone = JSON.parse(r.metadata_zone);
				r.polygon_zone = JSON.parse(r.polygon_zone);
				r._level = 0;
				var words = r.name_zone.length * 4;
				var marker = new MarkerWithLabel({
					//map: _this.map,
					zIndex: ++_this.current_zindex,
					icon: {
						url: "/img/markers/null.png",
						size: new google.maps.Size(32, 32),
						scaledSize: new google.maps.Size(16, 16)
						//labelOrigin: new google.maps.Point(8, 24),
					},
					labelInBackground: true,
					//labelContent: r.name_zone,
					labelAnchor: new google.maps.Point(words, 16),
					labelClass: "map-label map-label-dark map-zone-label"
				});
				marker.zone_data = {};
				for (d in r) {
					marker.zone_data[d] = r[d];
				}
				_this.zone_markers[r.id_zone.toString()] = marker;
				if (undefined === r.polygon_zone || r.polygon_zone === null) {
					_this.ZONES[r.id_zone.toString()] = r;
					return;
				}
				for (var m in r.schema_metadata) {
					r.schema_metadata[m].unit = _this.formatUnit(
						r.schema_metadata[m].unit
					);
				}
				r.polygon_zone.properties.id = r.id_zone;
				r.color_zone;
				if (!r.color_zone) {
					r.color_zone =
						"#" + Math.floor(16777215 - 15728639 * Math.random()).toString(16);
				}
				var color = r.color_zone;
				r._polygon = new google.maps.Polygon({
					strokeColor: color,
					strokeOpacity: _this.stroke_opacity,
					fillColor: color,
					fillOpacity: _this.fill_opacity
				});
				r._polyline = new google.maps.Polyline({
					strokeColor: color,
					strokeOpacity: 0.4
				});
				var path = [];
				var poly_bounds = new google.maps.LatLngBounds();
				var is_multipolygon = r.polygon_zone.geometry.type === "MultiPolygon";
				if (is_multipolygon) {
					r.polygon_zone.geometry.coordinates.forEach(function(c) {
						c.forEach(function(k) {
							k.forEach(function(g) {
								var latlng = { lat: g[1], lng: g[0] };
								poly_bounds.extend(latlng);
								path.push(latlng);
							});
						});
					});
				} else {
					r.polygon_zone.geometry.coordinates[0].forEach(function(c) {
						var latlng = { lat: c[1], lng: c[0] };
						poly_bounds.extend(latlng);
						path.push(latlng);
					});
				}
				bounds.union(poly_bounds);
				r._polyline.setPath(path);
				r._polygon.setPath(path);
				_this.zone_markers[r.id_zone.toString()].setPosition(
					poly_bounds.getCenter()
				);
				r.items_zone = [];
				_this.ZONES[r.id_zone.toString()] = r;
				r._polygon.addListener("click", function() {
					_this.updateZoneInfoWindow(_this.zone_markers[r.id_zone.toString()]);
					_this.ROOT.$applyAsync();
				});
			});
			_this.ZONE_BOUNDS = bounds;
			if (bounds.isEmpty() === false) _this.map.fitBounds(bounds);
			//Loading devices.
			_this.HTTP.post(_this.CONF.post.items, item_params).then(function(
				response
			) {
				var data = response.data;
				if (data.error) return (_this.ROOT.error = data.error);
				if (data.rows.length === 0) {
					_this.ROOT.warning = "MAP_NO_ITEMS";
				}
				data.rows.forEach(function(r, i) {
					r.latitude_item = Number(r.latitude_item);
					r.longitude_item = Number(r.longitude_item);
					r.is_motion_item = Boolean(r.is_motion_item);
					if (r.is_motion_item === false) {
						bounds.extend({
							lat: r.latitude_item,
							lng: r.longitude_item
						});
					}
					if (r.zones_item === null) {
						r.zones_item = [];
					} else {
						r.zones_item = JSON.parse(r.zones_item);
					}
					r.zones_item.forEach(function(z) {
						var zone = _this.ZONES[z.toString()];
						if (undefined === zone || zone === null) return;
						if (undefined === zone.items_zone || zone.items_zone === null) {
							_this.ZONES[z.toString()].items_zone = [];
						}
						_this.ZONES[z.toString()].items_zone.push(r.mac_item.toString());
					});
					r.schema_asset = JSON.parse(r.schema_asset);
					if (undefined === r.schema_item || r.schema_item === null) {
						r.schema_item = {
							attributes: {}
						};
					} else {
						r.schema_item = JSON.parse(r.schema_item);
						if (
							undefined === r.schema_item.attributes ||
							r.schema_item.attributes === null
						) {
							r.schema_item.attributes = {};
						}
						if (
							undefined === r.schema_item.display ||
							r.schema_item.display === null
						) {
							r.schema_item.display = {};
						}
					}
					r.schema_item.general_configuration = true;
					if (
						undefined === r.schema_item.display.latitude ||
						r.schema_item.display.latitude === null ||
						r.schema_item.display.latitude === false
					) {
						delete r.schema_asset.attributes.latitude;
					}
					if (
						undefined === r.schema_item.display.longitude ||
						r.schema_item.display.longitude === null ||
						r.schema_item.display.longitude === false
					) {
						delete r.schema_asset.attributes.longitude;
					}
					if (
						undefined === r.schema_item.virtuals ||
						r.schema_item.virtuals === null
					) {
						r.schema_item.virtuals = {};
					}
					for (v in r.schema_item.virtuals) {
						r.schema_asset.attributes[v] = JSON.parse(
							JSON.stringify(r.schema_item.virtuals[v])
						);
					}
					for (a in r.schema_asset.attributes) {
						var asset_attr = r.schema_asset.attributes[a];
						var item_attr = r.schema_item.attributes[a];
						//If private we delete it;
						if (asset_attr.private === true) {
							delete r.schema_asset.attributes[a];
							delete r.schema_item.attributes[a];
							continue;
						}
						if (
							undefined === r.schema_item.display[a] ||
							r.schema_item.display[a] === null
						) {
							r.schema_item.display[a] = true;
						}
						//If origin is not defined. so we assume listener
						if (undefined === asset_attr.origin || asset_attr.origin === null) {
							r.schema_asset.attributes[a].origin = "listener";
						}
						//If user haven't started the config, we create it.
						if (undefined === item_attr || item_attr === null) {
							r.schema_item.attributes[a] = {
								configuration: true
							};
							item_attr = r.schema_item.attributes[a];
						}
						//If applies for having limits, we evaluate them.
						if (
							asset_attr.type === "number" &&
							asset_attr.origin === "listener"
						) {
							if (
								undefined === item_attr.min ||
								undefined === item_attr.max ||
								item_attr.min === null ||
								item_attr.max === null
							) {
								r.schema_item.attributes[a].configuration = false;
								r.schema_item.general_configuration = false;
							} else {
								r.schema_item.attributes[a].configuration = true;
							}
							r.schema_item.attributes[a].applicable = true;
						} else {
							r.schema_item.attributes[a].configuration = false;
							r.schema_item.attributes[a].applicable = false;
						}
						//If it has unit - show it;
						r.schema_asset.attributes[a].unit = _this.formatUnit(
							asset_attr.unit
						);
					}
					r.comments = [];
					_this.DEVICES[r.mac_item.toString()] = r;
					_this.MACS.push(r.mac_item);
				});
				if (bounds.isEmpty() === false) _this.map.fitBounds(bounds);
				//Get subscriptions
				_this.SUBSCRIPTIONS = {};
				_this.HTTP.post(_this.CONF.post.subscriptions).then(function(response) {
					var data = response.data;
					if (data.error) return (_this.ROOT.error = "MAP_SUBSCRIPTION_ERROR");
					data.rows.forEach(function(r) {
						var mac = r.mac_item.toString();
						_this.SUBSCRIPTIONS[mac] = {
							email: Boolean(r.is_email_subscriptor),
							sms: Boolean(r.is_sms_subscriptor)
						};
					});
					_this.MACS.forEach(function(m) {
						var mac = m.toString();
						if (undefined != _this.SUBSCRIPTIONS[mac]) return;
						_this.SUBSCRIPTIONS[mac] = {
							email: false,
							sms: false
						};
					});
					_this.prepareLevels();
					_this.showLevel();
					_this.monitorDevices();
				});
			});
		});
	},
	formatUnit: function(unit) {
		if (undefined === unit || unit === null) return null;
		var unit_split = unit.split("");
		unit_split.forEach(function(u, i) {
			unit_split[i] = isNaN(Number(u)) ? u : u.sup();
		});
		unit = unit_split.join("");
		return unit;
	},
	/***
	 *
	 ***/
	toggleLevel: function() {
		var index = this.selected_level.value + 1;
		if (index === this.LEVELS.length) index = 0;
		this.selected_level = this.LEVELS[index];
		this.showLevel();
	},
	showLevel: function() {
		this.VISIBLE_ZONES = {};
		for (z in this.ZONES) {
			var diff = this.ZONES[z]._level - this.selected_level.value;
			switch (diff) {
				case 0:
					if (
						!(
							undefined === this.ZONES[z].polygon_zone ||
							this.ZONES[z].polygon_zone === null
						)
					) {
						this.ZONES[z]._polygon.setMap(this.map);
						this.ZONES[z]._polyline.setMap(null);
						this.zone_markers[z].setMap(this.map);
					}
					this.VISIBLE_ZONES[z] = this.ZONES[z];
					continue;
				case -1:
					if (
						!(
							undefined === this.ZONES[z].polygon_zone ||
							this.ZONES[z].polygon_zone === null
						)
					) {
						this.ZONES[z]._polygon.setMap(null);
						this.ZONES[z]._polyline.setMap(this.map);
						this.zone_markers[z].setMap(null);
					}
					continue;
				default:
					if (
						!(
							undefined === this.ZONES[z].polygon_zone ||
							this.ZONES[z].polygon_zone === null
						)
					) {
						this.ZONES[z]._polygon.setMap(null);
						this.ZONES[z]._polyline.setMap(null);
						this.zone_markers[z].setMap(null);
					}
			}
		}
	},
	/***
	 *
	 ***/
	prepareLevels: function() {
		this.MAX_LEVEL = 0;
		for (z in this.ZONES) {
			var zone = this.ZONES[z];
			if (undefined === zone.parent_zone || zone.parent_zone === null) {
				continue;
			} else {
				this.ZONES[z]._level += 1;
				this.MAX_LEVEL = Math.max(this.ZONES[z]._level, this.MAX_LEVEL);
			}
			for (s in this.ZONES) {
				var sone = this.ZONES[s];
				if (sone.parent_zone === zone.id_zone) {
					this.ZONES[s]._level += 1;
					this.MAX_LEVEL = Math.max(this.ZONES[s]._level, this.MAX_LEVEL);
				}
			}
		}
		this.LEVELS = [];
		var LEVEL = "Level #";
		for (k = 0; k <= this.MAX_LEVEL; k++)
			this.LEVELS.push({ name: LEVEL + (k + 1), value: k });
		this.selected_level = this.LEVELS[0];
	},
	/***
	 * Displays an empty map.
	 ***/
	showMap: function() {
		var _this = this;
		this.MAP.height($("html:first").height() - 195);
		this.map = new google.maps.Map(this.MAP[0], this.CONF.google_map);
		this.CONF.styles.forEach(function(s) {
			var style = _this.ROOT.sensum.modules.map.styles[s];
			var google_style = new google.maps.StyledMapType(style, { name: s });
			_this.map.mapTypes.set(s, google_style);
			//_this.map.setMapTypeId(s);
		});
		_this.INFOWINDOW.setContent($("#map-infowindow")[0]);
		_this.INFOWINDOW.addListener("closeclick", function() {
			_this.INFOWINDOW.close();
			delete _this.current_device;
			delete _this.current_zone;
			delete _this.ROOT.parent_zone;
			_this.ROOT.$applyAsync();
		});
		this.map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(
			$("#third-party-copyright")[0]
		);
		if (window.screen.width >= 768) {
			//if (this.ROOT.is_mobile === false && $(document).width() < 1024) {
			this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(
				$("#map-current-marker")[0]
			);
			this.map.controls[google.maps.ControlPosition.TOP_LEFT].push(
				$("#map-select")[0]
			);
		}
		this.map.addListener("maptypeid_changed", function() {
			var clazz =
				_this.map.getMapTypeId() === google.maps.MapTypeId.SATELLITE ||
				_this.map.getMapTypeId() === google.maps.MapTypeId.HYBRID
					? "dark"
					: "light";
			for (d in _this.zone_markers) {
				_this.zone_markers[d].set(
					"labelClass",
					"map-marker-label map-label map-label-" + clazz
				);
			}
			for (d in _this.device_markers) {
				_this.device_markers[d].set(
					"labelClass",
					"map-label map-label-" + clazz
				);
			}
		});
		this.map.addListener("center_changed", function() {
			_this.ROOT.map_center = _this.map.getCenter();
		});
		$(".sidebar").on("shown.bs.collapse", function() {
			google.maps.event.trigger(_this.map, "resize");
		});
		$(".sidebar").on("hidden.bs.collapse", function() {
			google.maps.event.trigger(_this.map, "resize");
		});
	},
	monitorDevices: function() {
		var _this = this;
		var SUBSCRIBE = "comment/published/";
		var SAVED = "comment/saved/";
		this.ROOT.device_messages = [];
		this.ROOT.MQTT = new Mosquitto();
		this.ROOT.MQTT.connect(this.ROOT.MQTT_WEBSOCKET_SERVER);
		this.ROOT.MQTT.onmessage = function(topic, buffer) {
			var data = JSON.parse(buffer.toString());
			var m = data.mac.toString();
			data.date = moment(data.date).format("YYYY-MMM-DD hh:mm:ss");
			if (!(data.hash === _this.DEVICES[m].hash_item)) return;
			_this.DEVICES[m].comments.push(data);
			if (data.id_user !== _this.ROOT.user.id_user || data.old === false) {
				_this.ROOT.device_messages.push(data);
			}
			//_this.ROOT.$applyAsync();
		};
		_this.MACS.forEach(function(m, i) {
			_this.ROOT.MQTT.subscribe(SUBSCRIBE + m.toString(), 0);
			_this.ROOT.MQTT.subscribe(
				SUBSCRIBE + m.toString() + "/" + _this.ROOT.user.account_user,
				0
			);
			_this.ROOT.MQTT.publish(
				SAVED + m.toString() + "/" + _this.ROOT.user.account_user,
				JSON.stringify({ mac: m }),
				0,
				false
			);
		});
		//Information
		this.loadDeviceMarkers(true);
		if (this.CONF.interval) {
			this.ROOT.intervals.push(
				setInterval(function() {
					_this.loadDeviceMarkers(false);
				}, _this.CONF.interval * _this.ROOT.SECOND)
			);
		}
	},
	/***
	 * Obtain markers positions from database.
	 * Each marker will contain a field for row data,
	 ***/
	loadDeviceMarkers: function(point) {
		var _this = this;
		var params = { macs: this.MACS };
		this.HTTP.post(this.CONF.post.data, params).then(function(response) {
			var data = response.data;
			if (typeof data === _this.U || !data) {
				return;
			}
			data.forEach(function(item) {
				_this.createOrUpdateDeviceMarker(item);
			});
			_this.calculateZoneStatus();
			_this.colorZones();
			if (
				point === true &&
				undefined != _this.ROOT.temp.map_device &&
				_this.ROOT.temp.map_device != null
			) {
				try {
					_this.selected_device = JSON.parse(
						JSON.stringify(_this.DEVICES[_this.ROOT.temp.map_device.toString()])
					);
					_this.selectDevice();
				} catch (e) {}
			}
		});
	},
	/***
	 * Creates a new marker.
	 *
	 * @param row The marker information.
	 ***/
	createOrUpdateDeviceMarker: function(data) {
		var _this = this;
		var latitude = data.latitude;
		var longitude = data.longitude;
		if (
			undefined === latitude ||
			undefined === longitude ||
			latitude === null ||
			longitude === null ||
			latitude === 0 ||
			longitude === 0
		) {
			latitude = data.latitude_item;
			longitude = data.longitude_item;
		}
		var position = { lat: latitude, lng: longitude };
		var marker = this.device_markers[data.mac.toString()];
		var device = this.DEVICES[data.mac.toString()];
		var name = device.name_item;
		if (typeof marker === this.U) {
			var words = name.length * 3;
			marker = new MarkerWithLabel({
				zIndex: ++_this.current_zindex,
				animation: google.maps.Animation.DROP,
				labelContent: name,
				labelAnchor: new google.maps.Point(words, 0),
				labelClass: "map-label map-label-dark",
				labelStyle: { "font-size": "10pt" }
			});
			marker.setTitle(name);
			marker.addListener("click", function() {
				_this.updateDeviceInfoWindow(this);
				//_this.map.setZoom(_this.CONF.zoom_in);
				_this.map.setCenter(this.getPosition());
				_this.ROOT.$applyAsync();
			});
		}
		marker.setPosition(position);
		marker.device_data = data;
		marker.device_data.values = {};
		marker.device_data._status = {};
		var image = device.schema_asset.icon;
		var attributes = device.schema_asset.attributes;
		marker.device_data._general_status = true;
		for (a in attributes) {
			var item_attr = device.schema_item.attributes[a];
			marker.device_data.values[a] = marker.device_data[a];
			if (undefined === marker.device_data.values[a])
				delete marker.device_data.values[a];
			var value = marker.device_data.values[a];
			delete marker.device_data[a];
			if (item_attr.configuration === false) {
				if (item_attr.applicable === true) {
					marker.device_data._status[a] = null;
				} else {
					marker.device_data._status[a] = true;
				}
			} else if (
				undefined === value ||
				value === null ||
				value < item_attr.min ||
				value > item_attr.max
			) {
				marker.device_data._status[a] = false;
				marker.device_data._general_status = false;
			} else {
				marker.device_data._status[a] = true;
			}
		}
		if (device.schema_item.general_configuration === false) {
			image = "accesdenied";
		} else if (marker.device_data._general_status === false) {
			image = "caution";
		}
		marker.setIcon({
			url: "/img/markers/" + image + ".png",
			size: new google.maps.Size(32, 32),
			scaledSize: new google.maps.Size(32, 32)
			//labelOrigin: new google.maps.Point(16, 36),
		});
		marker.device_data._attributes = this.DEVICES[
			data.mac.toString()
		].schema_asset.attributes;
		marker.setMap(this.map);
		this.device_markers[data.mac.toString()] = marker;
		if (
			undefined != _this.current_device &&
			_this.current_device != null &&
			_this.current_device.mac === data.mac
		) {
			_this.INFOWINDOW.setOptions({ disableAutoPan: true });
			_this.updateDeviceInfoWindow(marker);
		}
	},
	/***
	 * Updates and show markers infowindow
	 ***/
	updateDeviceInfoWindow: function(marker) {
		if (undefined === marker || marker === null) {
			this.ROOT.error = "MAP_FATAL_ERROR";
			return false;
		}
		var _this = this;
		var data = marker.device_data;
		if (
			undefined === this.current_device ||
			this.current_device === null ||
			this.current_device.mac != data.mac
		) {
			_this.INFOWINDOW.setOptions({ disableAutoPan: true });
			_this.INFOWINDOW.open(_this.map, marker);
		}
		delete this.current_zone;
		this.current_device = { empty: false };
		if (Object.keys(data.values).length === 0) this.current_device.empty = true;
		this.current_device.latitude = marker.getPosition().lat();
		this.current_device.longitude = marker.getPosition().lng();
		this.current_device.mac = data.mac;
		this.current_device.key = this.DEVICES[data.mac.toString()].key_item;
		this.current_device._motion = this.DEVICES[
			data.mac.toString()
		].is_motion_item;
		this.current_device._asset =
			this.DEVICES[data.mac.toString()].manufacturer_asset +
			"-" +
			this.DEVICES[data.mac.toString()].model_asset +
			"-" +
			this.DEVICES[data.mac.toString()].name_asset;
		this.current_device._motion = this.DEVICES[
			data.mac.toString()
		].is_motion_item;
		this.current_device._driver = this.DEVICES[
			data.mac.toString()
		].schema_asset.driver;
		this.current_device.id_asset = this.DEVICES[data.mac.toString()].id_asset;
		this.current_device._name = this.DEVICES[data.mac.toString()].name_item;
		this.current_device._date = new Date(Date.parse(data._date));
		this.current_device._limits = data.schema_item.attributes;
		this.current_device._status = data._status;
		for (k in data._attributes) {
			_this.current_device[k] = data.values[k];
		}
		_this.current_device.sf = data.values.sf;
		_this.current_device._latlng = data._latlng;
		_this.current_device._attributes = data._attributes;
		_this.current_device._display = this.DEVICES[
			data.mac.toString()
		].schema_item.display;
		_this.no_attributes = Object.keys(data._attributes).length === 0;
		_this.current_device._icon = marker.getIcon().url;
		this.current_label = this.current_device._name;
		this.current_icon = "fa fa-map-marker";
		return true;
	},
	/***
	 * Clicks a marker.
	 ***/
	selectDevice: function() {
		if (undefined === this.selected_device || this.selected_device === null)
			return;
		delete this.current_zone;
		delete this.ROOT.parent_zone;
		var marker = this.device_markers[this.selected_device.mac_item.toString()];
		var is_focused = this.updateDeviceInfoWindow(marker);
		if (is_focused === false) return;
		//this.map.setZoom(this.CONF.zoom_in);
		this.map.setCenter(marker.getPosition());
	},
	/***
	 * Clicks a marker.
	 ***/
	selectZone: function() {
		if (undefined === this.selected_zone || this.selected_zone === null) return;
		delete this.current_device;
		var marker = this.zone_markers[this.selected_zone.id_zone.toString()];
		this.updateZoneInfoWindow(marker);
	},
	/***
	 * Updates and show zones infowindow
	 ***/
	updateZoneInfoWindow: function(marker) {
		var _this = this;
		this.current_zone = {};
		this.current_icon = "fa fa-fw fa-map";
		this.current_label = marker.zone_data.name_zone;
		this.INFOWINDOW.setOptions({ disableAutoPan: false });
		delete this.current_device;
		var data = marker.zone_data;
		data.metadata = data.metadata_zone;
		var id_parent = data.parent_zone;
		if (id_parent) {
			data.parent_zone = {};
			for (a in this.ZONES[id_parent.toString()]) {
				data.parent_zone[a] = this.ZONES[id_parent.toString()][a];
			}
		}
		this.ROOT.parent_zone = data.id_zone;
		for (d in data) {
			_this.current_zone[d] = data[d];
		}
		this.current_zone._name = data.name_zone;
		var bounds = new google.maps.LatLngBounds();
		if (
			undefined === _this.ZONES[data.id_zone.toString()].polygon_zone ||
			_this.ZONES[data.id_zone.toString()].polygon_zone === null
		) {
			_this.INFOWINDOW.close();
			return;
		}
		this.ZONES[data.id_zone.toString()]._polyline
			.getPath()
			.forEach(function(p) {
				bounds.extend(p);
			});
		this.map.fitBounds(bounds);
		_this.INFOWINDOW.open(_this.map, marker);
		_this.current_zone._display = true;
	},
	clearKPIZoneFilter: function() {
		delete this.current_kpi;
		this.colorZones(null);
	},
	colorZones: function(kpi) {
		var _this = this;
		this.stroke_opacity = 0.6;
		this.fill_opacity = 0.6;
		var id_asset = null;
		if (undefined === kpi || kpi === null) {
			if (undefined != this.current_kpi && this.current_kpi != null) {
				kpi = this.current_kpi.kpi;
				id_asset = this.current_kpi.id_asset;
			}
		} else if (
			undefined != this.current_device &&
			this.current_device != null
		) {
			var device = this.DEVICES[this.current_device.mac.toString()];
			this.current_kpi = {
				id_asset: device.id_asset.toString(),
				asset: device.name_asset,
				kpi: kpi,
				name: this.current_device._attributes[kpi].label
			};
			id_asset = this.current_kpi.id_asset;
			$('a[data-target="#health"]').click();
		}
		try {
			this.overall_health.fail = 0;
			this.overall_health.ok = 0;
			for (z in this.ZONES) {
				if (undefined === this.ZONES[z]._health) this.ZONES[z]._health = null;
				var color = this.ZONE_COLORS.UNKNOWN;
				var current = this.ZONES[z].current_status;
				var s = current.status;
				var ok = current.ok;
				var fail = current.fail;
				if (this.current_kpi) {
					if (undefined === current.assets[id_asset]) {
						s = null;
						ok = 0;
						fail = 0;
					} else {
						var v = current.assets[id_asset][kpi];
						s = v.status;
						ok = v.ok;
						fail = v.fail;
					}
				}
				if (s === true) {
					this.overall_health.ok += ok;
					color = this.ZONE_COLORS.OK;
				} else if (s === false) {
					this.overall_health.fail += fail;
					color = this.ZONE_COLORS.FAIL;
				}
				if (
					!(
						undefined === this.ZONES[z].polygon_zone ||
						this.ZONES[z].polygon_zone === null
					)
				) {
					this.ZONES[z]._polygon.setOptions({
						strokeColor: this.ZONE_COLORS.STROKE,
						fillColor: color,
						strokeOpacity: this.stroke_opacity,
						fillOpacity: this.fill_opacity
					});
				}
			}
			this.overall_health.unknown =
				this.overall_health.count -
				(this.overall_health.ok + this.overall_health.fail);
		} catch (e) {}
	},
	/***
	 * Calculates the overall status per zone, and the overall asset status per zone.
	 ***/
	calculateZoneStatus: function() {
		var _this = this;
		this.overall_health = {
			count: 0,
			fail: 0,
			ok: 0,
			unknown: 0
		};
		for (z in this.ZONES) {
			this.ZONES[z].current_status = {
				count: 0,
				status: true,
				fail: 0,
				ok: 0,
				assets: {}
			};
		}
		for (d in this.DEVICES) {
			var a = this.DEVICES[d].id_asset.toString();
			//var z = this.DEVICES[d].id_zone.toString();
			var zones = this.DEVICES[d].zones_item;
			if (undefined === this.device_markers[d]) {
				continue;
			}
			var data = this.device_markers[d].device_data;
			//ZONE_BUG
			if (undefined === zones || zones === null) {
				continue;
			}
			zones.forEach(function(zone) {
				var z = zone.toString();
				if (undefined === _this.ZONES[z] || _this.ZONES[z] === null) {
					return;
				}
				if (undefined === _this.ZONES[z].current_status) {
					return;
				}
				if (undefined === _this.ZONES[z].current_status.assets[a]) {
					_this.ZONES[z].current_status.assets[a] = {};
					for (kpi in _this.DEVICES[d].schema_asset.attributes) {
						_this.ZONES[z].current_status.assets[a][kpi] = {
							count: 0,
							status: true,
							fail: 0,
							ok: 0
						};
					}
				}
				++_this.ZONES[z].current_status.count;
				++_this.overall_health.count;
				if (data._general_status === false) {
					_this.ZONES[z].current_status.status = false;
					++_this.ZONES[z].current_status.fail;
					++_this.overall_health.fail;
				} else {
					++_this.ZONES[z].current_status.ok;
					++_this.overall_health.ok;
				}
				for (kpi in _this.DEVICES[d].schema_asset.attributes) {
					if (data._status[kpi] === false) {
						_this.ZONES[z].current_status.assets[a][kpi].status = false;
						++_this.ZONES[z].current_status.assets[a][kpi].fail;
					} else {
						++_this.ZONES[z].current_status.assets[a][kpi].ok;
					}
				}
			});
		}
		for (z in this.ZONES) {
			var s = this.ZONES[z].current_status.status;
			var parent_zone = this.ZONES[z].parent_zone;
			if (undefined === parent_zone || parent_zone === null) continue;
			this.ZONES[parent_zone].current_status.status =
				s === false ? false : this.ZONES[parent_zone].current_status.status;
		}
	},
	/***
	 * In mobile devices, scroll to box footer
	 ***/
	scrollTo: function(selector) {
		$("html, body").animate(
			{
				scrollTop: $(selector).offset().top
			},
			500
		);
	},
	/***
	 * In mobile devices, scroll to top
	 ***/
	scrollToTop: function() {
		$("html, body").animate(
			{
				scrollTop: 0
			},
			500
		);
	},
	toggleOpacity: function(plus) {
		var _this = this;
		var n = plus === true ? 0.1 : -0.1;
		if (
			(plus === true &&
				(this.fill_opacity === 1 || this.stroke_opacity === 1)) ||
			(plus === false && (this.fill_opacity === 0 || this.stroke_opacity === 0))
		)
			return;
		this.fill_opacity += n;
		this.stroke_opacity += n;
		this.map.data.forEach(function(feature) {
			_this.map.data.overrideStyle(feature, {
				strokeOpacity: _this.stroke_opacity,
				fillOpacity: _this.fill_opacity
			});
		});
	},
	toggleZoom: function(plus) {
		var _this = this;
		var n = plus === true ? 1 : -1;
		this.map.setZoom(this.map.getZoom() + n);
	},
	toggleMap: function() {
		var last_type = this.map.getMapTypeId();
		var keys = Object.keys(this.map.mapTypes.gm_accessors_);
		var index = keys.indexOf(last_type) + 1;
		if (index === keys.length) index = 0;
		this.map.setMapTypeId(keys[index]);
	},
	sanitize: function(text, id) {
		if (
			typeof this.current_device === "undefined" ||
			this.current_device === null
		) {
			return text.replace(":id", id);
		}
		return text.replace(
			":id",
			this.DEVICES[this.current_device.mac.toString()].id_item
		);
	},
	sendComment: function() {
		var _this = this;
		var PUBLISH = "comment/sent/";
		this.device_comment.date = new Date().getTime();
		var mac = this.current_device.mac;
		this.device_comment.mac = mac;
		this.device_comment.hash = this.DEVICES[mac.toString()].hash_item;
		var topic = PUBLISH + mac;
		var message = JSON.stringify(this.device_comment);
		this.ROOT.MQTT.publish(topic, message, 0, false);
		this.device_comment.message = "";
	},
	updateSubscription: function(media, active) {
		var _this = this;
		var mac = this.current_device.mac;
		var data = {
			id_item: this.DEVICES[this.current_device.mac.toString()].id_item
		};
		data["is_" + media + "_subscriptor"] = active;
		this.HTTP.post(this.CONF.post.update_subscription, data).then(function(
			response
		) {
			var data = response.data;
			if (data.error) return (_this.ROOT.error = "MAP_SUBSCRIPTION_ERROR");
			_this.SUBSCRIPTIONS[_this.current_device.mac.toString()][media] = active;
			$("#map-alerts-button").click();
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("map", ["ngRoute"])
	.controller("MapController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		MapController
	]);
