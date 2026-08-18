/* global google */

function GeozoneController($rootScope, $scope, $http, $routeParams, $location) {
	this.ROOT = $rootScope;
	this.SCOPE = $scope;
	this.HTTP = $http;
	this.LOCATION = $location;
	this.PARAMS = $routeParams;
	this.CONF = this.ROOT.sensum.modules.geozone;
	this.MAP_CONTAINER = $("#geozone-map-container");
	this.MAP_CONTAINER_BOX = $("#geozone-map-container-box");
	this.MARKERS = [];
	this.LABEL_MARKER = null;
	this.PARENT_POLYGON = null;
	this.POLYGON = null;
	this.ZONES = {};
	this.ITEMS = {};
	this.APPLICATIONS = {};
	this.data = {
		name_zone: this.CONF.i18n[this.ROOT.sensum.language].DEFAULT_ZONE_NAME,
		color_zone: "#FF0000",
		polygon_zone: {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [[]]
			}
		},
		metadata_zone: {},
		id_application: null
	};
	this.polygon_text = "";
	this.tree_view = true;
	this.ADDRESS_MARKER = null;
	this.METADATA = {};
	this.current_metadata = null;
	this.selected_items = {};
	this.selected_items_count = 0;
	this.selected_item = null;
	this.available_items = {};
	this.MAP_DEFAULT_CENTER = {
		lat: -37.6299898,
		lng: 176.1734325
	};
	this.push_attribute = {
		remote: null,
		id_item: null,
		attribute: null,
		fields: {}
	};
	this.is_polygon = false;
	this.color_columns = 10;
	this.color_matrix = [];
	this.synchro_progress = 100;
	this.synchro_message = "";
	this.constructor();
}

GeozoneController.prototype = {
	constructor: function() {
		//$("#sensum-geozone-loading-modal").modal("show");
		var _this = this;
		this.ROOT.sensum.constants.SENSUM_COLORS.forEach(function(c, i) {
			if (i % _this.color_columns === 0) {
				_this.color_matrix.push([]);
			}
			_this.color_matrix[_this.color_matrix.length - 1].push(c.toUpperCase());
		});
		this.ID = this.PARAMS.id;
		if (!(undefined === this.ID || this.ID === null)) {
			this.ID = Number(this.ID);
		}
		/*
		this.ROOT.overlay_times["/mozart/list"] = {
			times: 0,
			current_times: 0
		};
		this.ROOT.overlay_times["/mozart/where"] = {
			times: 0,
			current_times: 0
		};
*/
		this.ROOT.overlay_times["/sallieri/info"] = {
			times: 0,
			current_times: 0
		};
		this.getItems();
	},
	getItems: function() {
		var _this = this;
		var params = {
			entity: "items_view"
		};
		this.HTTP.post("/mozart/select", params).then(function(response) {
			var data = response.data;
			if (data.error != null) return (_this.ROOT.error = "GEOZONE_ERROR");
			var rows = data.rows;
			if (rows === 0) return (_this.ROOT.warning = "GEOZONE_NO_ROWS");
			rows.forEach(function(r) {
				if (r.id_project !== _this.ROOT.sensum.project.id_project) return;
				var i = r.id_item.toString();
				r.zones_item = JSON.parse(r.zones_item);
				r.schema_asset = JSON.parse(r.schema_asset);
				r.schema_item = JSON.parse(r.schema_item);
				for (v in r.schema_item.virtuals) {
					r.schema_asset.attributes[v] = JSON.parse(
						JSON.stringify(r.schema_item.virtuals[v])
					);
				}
				_this.ITEMS[i] = r;
				_this.available_items[i] = {
					id: i,
					id_item: r.id_item,
					name_item: r.name_item,
					metadata: Boolean(r.is_metadata_stock),
					id_asset: r.id_asset,
					schema_stock: {
						remote: {}
					}
				};
				for (a in r.schema_asset.attributes) {
					_this.available_items[i].schema_stock.remote[a] = {
						item: null,
						attribute: null
					};
				}
				if (
					undefined === _this.ID ||
					_this.ID === null ||
					r.zones_item === null ||
					r.zones_item.indexOf(_this.ID) === -1
				) {
					if (_this.available_items[i].metadata === true) {
						delete _this.ITEMS[i];
						delete _this.available_items[i];
					}
					return;
				}
			});
			_this.getStock();
		});
	},
	getStock: function() {
		if (undefined === this.ID) {
			this.getApplications();
			return;
		}
		var _this = this;
		var params = {
			entity: "stock",
			key: "id_zone",
			value: this.ID
		};
		this.HTTP.post("/mozart/where", params).then(function(response) {
			var data = response.data;
			if (data.error != null) return (_this.ROOT.error = "GEOZONE_ERROR");
			var rows = data.rows;
			if (rows === 0) return (_this.ROOT.warning = "GEOZONE_NO_ROWS");
			rows.forEach(function(r) {
				var i = r.id_item.toString();
				r.schema_stock = JSON.parse(r.schema_stock);
				++_this.selected_items_count;
				_this.selected_items[i] = JSON.parse(
					JSON.stringify(_this.available_items[i])
				);
				_this.selected_items[i].schema_stock = JSON.parse(
					JSON.stringify(r.schema_stock)
				);
				delete _this.available_items[i];
			});
			_this.getApplications();
		});
	},
	getApplications: function() {
		var _this = this;
		var params = {
			entity: "application"
		};
		this.HTTP.post("/mozart/list", params).then(function(response) {
			var data = response.data;
			if (data.error != null) return (_this.ROOT.error = "GEOZONE_ERROR");
			var rows = data.rows;
			if (rows === 0) return (_this.ROOT.warning = "GEOZONE_NO_ROWS");
			rows.forEach(function(r) {
				r.schema_application = JSON.parse(r.schema_application);
				_this.APPLICATIONS[r.id_application.toString()] = r;
			});
			_this.getMetadata();
		});
	},
	getMetadata: function() {
		var _this = this;
		var params = {
			entity: "metadata"
		};
		this.HTTP.post("/mozart/list", params).then(function(response) {
			var data = response.data;
			if (data.error != null) return (_this.ROOT.error = "GEOZONE_ERROR");
			var rows = data.rows;
			if (rows === 0) return (_this.ROOT.warning = "GEOZONE_NO_ROWS");
			var metadata = [];
			rows.forEach(function(r) {
				r.name_metadata = JSON.parse(r.name_metadata);
				r.schema_metadata = JSON.parse(r.schema_metadata);
				r.is_visible_metadata = Boolean(r.is_visible_metadata);
				r.assets = {};
				_this.METADATA[r.id_metadata.toString()] = r;
				metadata.push(r.id_metadata);
			});
			var params = {
				entity: "metastocks_view",
				key: "id_metadata",
				value: metadata
			};
			_this.HTTP.post("/mozart/where", params).then(function(response) {
				var data = response.data;
				if (data.error != null) return (_this.ROOT.error = "GEOZONE_ERROR");
				var rows = data.rows;
				rows.forEach(function(r) {
					_this.METADATA[r.id_metadata.toString()].assets[
						r.id_asset.toString()
					] = r;
				});
				_this.getZones();
			});
		});
	},
	getZones: function() {
		var _this = this;
		var params = {
			entity: "zones_view",
			key: "id_project",
			value: this.ROOT.sensum.project.id_project
		};
		this.HTTP.post(this.CONF.post.get, params).then(function(response) {
			$("#sensum-geozone-loading-modal").modal("hide");
			var data = response.data;
			if (data.error != null) return (_this.ROOT.error = "GEOZONE_ERROR");
			var rows = data.rows;
			if (rows === 0) return (_this.ROOT.warning = "GEOZONE_NO_ROWS");
			rows.forEach(function(r, i) {
				for (k in r) {
					if (
						k.indexOf("_zone") === -1 &&
						k != "id_metadata" &&
						k != "id_application" &&
						k != "id_member"
					) {
						delete r[k];
						delete rows[i][k];
					}
				}
				r.polygon_zone = JSON.parse(r.polygon_zone);
				r.metadata_zone = JSON.parse(r.metadata_zone);
				if (r.metadata_zone === null) {
					r.metadata_zone = {};
				}
				r.color_zone = r.color_zone;
				r._label = r.name_zone + " (#" + r.id_zone + ")";
				_this.ZONES[r.id_zone.toString()] = r;
			});
			if (undefined === _this.ID || _this.ID === null) {
				var parent_zone = _this.ROOT.parent_zone;
				if (undefined != parent_zone && parent_zone != null) {
					_this.data.parent_zone = _this.ZONES[parent_zone.toString()];
				}
				_this.deploy(true);
				return;
			}
			var row = _this.ZONES[_this.ID.toString()];
			for (f in row) _this.data[f] = row[f];
			if (!(_this.data.parent_zone === null)) {
				_this.data.parent_zone = _this.ZONES[_this.data.parent_zone.toString()];
			}
			delete _this.ZONES[_this.ID.toString()];
			_this.deploy(false);
		});
	},
	deploy: function(recenter) {
		var _this = this;
		this.ROOT.page_header = this.ID ? "Edit zone" : "New zone";
		this.ROOT.optional_description = this.CONF.i18n[
			this.ROOT.sensum.language
		].DESCRIPTION;
		$(".map-colorpicker").colorpicker();
		$(".map-colorpicker").on("changeColor", function(e) {
			_this.data.color_zone = e.color.toHex().toUpperCase();
			_this.updateZoneColor();
		});
		this.MAP_CONTAINER.height($(window).height() - 240);
		var style = this.ROOT.sensum.constants.SENSUM_CORE_MAP;
		var google_style = new google.maps.StyledMapType(style, {
			name: "sensum"
		});
		this.CONF.google_map.mapTypeId = "sensum";
		this.MAP = new google.maps.Map(this.MAP_CONTAINER[0], this.CONF.google_map);
		this.MAP.mapTypes.set("sensum", google_style);
		this.MAP_CONTAINER_BOX.on("shown.bs.collapse", function() {
			google.maps.event.trigger(_this.MAP, "resize");
			_this.panParentZone();
		});
		this.PARENT_POLYGON = new google.maps.Polyline({
			strokeOpacity: 1,
			strokeWeight: 2
		});
		this.PARENT_POLYGON.setMap(this.MAP);
		this.drawParentZone();
		_this.POLYGON = new google.maps.Polygon({
			paths: [],
			strokeColor: _this.data.color_zone,
			fillColor: _this.data.color_zone,
			strokeOpacity: 0.4,
			fillOpacity: 0.4,
			strokeWeight: 2
		});
		_this.POLYGON.setMap(_this.MAP);
		this.MAP.addListener("click", function(e) {
			_this.addMarker(e.latLng);
		});
		this.ADDRESS_MARKER = new google.maps.Marker({
			map: _this.MAP,
			position: _this.MAP.getCenter()
		});
		this.ADDRESS_MARKER.setMap(null);
		this.LABEL_MARKER = new google.maps.Marker({
			map: _this.MAP,
			position: _this.MAP.getCenter(),
			icon: {
				url: "/img/markers/star-3.png",
				size: new google.maps.Size(32, 32),
				scaledSize: new google.maps.Size(16, 16),
				labelOrigin: new google.maps.Point(8, 24)
			},
			label: {
				text: _this.data.name_zone,
				color: "#FFFFFF",
				fontSize: "8pt",
				fontFamily: "Roboto"
			}
		});
		if (recenter === true) {
			var center = this.MAP.getCenter().toJSON();
			if (this.data.parent_zone) {
				this.panParentZone();
				this.updatePolygonText();
				return;
			}
			if (undefined != this.ROOT.map_center && this.ROOT.map_center != null) {
				center = this.ROOT.map_center.toJSON();
			}
			var K = 0.00009;
			var A = center.lng;
			var B = center.lat;
			this.data.polygon_zone.geometry.coordinates[0].push([A - K, B - K]);
			this.data.polygon_zone.geometry.coordinates[0].push([A + K, B - K]);
			this.data.polygon_zone.geometry.coordinates[0].push([A + K, B + K]);
			this.data.polygon_zone.geometry.coordinates[0].push([A - K, B + K]);
			this.data.polygon_zone.geometry.coordinates[0].push([A - K, B - K]);
		}
		if (
			this.data.polygon_zone === null ||
			undefined === this.data.polygon_zone.geometry ||
			this.data.polygon_zone.geometry === null ||
			undefined === this.data.polygon_zone.geometry.coordinates ||
			this.data.polygon_zone.geometry.coordinates === null ||
			this.data.polygon_zone.geometry.coordinates.length === 0
		) {
			return;
		}
		var bounds = new google.maps.LatLngBounds();
		this.data.polygon_zone.geometry.coordinates[0].forEach(function(c) {
			bounds.extend({ lng: c[0], lat: c[1] });
		});
		this.MAP.fitBounds(bounds);
		this.updatePolygonText();
	},
	addMarker: function(latlng) {
		var _this = this;
		var marker = new google.maps.Marker({
			position: latlng,
			map: _this.MAP,
			draggable: true,
			label: "•"
		});
		marker.addListener("mouseover", function(e) {
			marker.setLabel("X");
		});
		marker.addListener("mouseout", function(e) {
			marker.setLabel("•");
		});
		marker.addListener("drag", function(e) {
			_this.redrawPolygon();
		});
		marker.addListener("click", function(e) {
			marker.setMap(null);
			_this.MARKERS.splice(_this.MARKERS.indexOf(marker), 1);
			_this.redrawPolygon();
		});
		_this.MARKERS.push(marker);
		_this.redrawPolygon();
	},
	redrawPolygon: function() {
		this.is_polygon = false;
		var path = [];
		var geojson_path = [];
		var bounds = new google.maps.LatLngBounds();
		this.MARKERS.forEach(function(m) {
			var position = m.getPosition().toJSON();
			path.push(position);
			bounds.extend(position);
			geojson_path.push([position.lng, position.lat]);
		});
		if (geojson_path.length != 0) {
			geojson_path.push(geojson_path[0]);
		}
		if (geojson_path.length > 3) this.is_polygon = true;
		this.POLYGON.setPath(path);
		this.data.metadata_zone.computed_area = Number(
			google.maps.geometry.spherical
				.computeArea(this.POLYGON.getPath())
				.toFixed(0)
		);
		this.LABEL_MARKER.setPosition(bounds.getCenter());
		this.data.polygon_zone = {
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [[]]
			}
		};
		if (undefined === geojson_path || geojson_path === null) {
			this.data.polygon_zone.geometry.coordinates[0] = [];
		} else {
			this.data.polygon_zone.geometry.coordinates[0] = geojson_path;
		}
		this.polygon_text = JSON.stringify(this.data.polygon_zone, null, 2);
		this.ROOT.$applyAsync();
	},
	updateZoneName: function() {
		this.LABEL_MARKER.setLabel(this.data.name_zone);
	},
	updateZoneColor: function() {
		this.POLYGON.setOptions({
			strokeColor: this.data.color_zone,
			fillColor: this.data.color_zone
		});
	},
	updatePolygonJSON: function() {
		try {
			var parsed = JSON.parse(this.polygon_text);
			this.data.polygon_zone = parsed;
			var coordinates = this.data.polygon_zone.geometry.coordinates[0];
			if (coordinates[0] != coordinates[coordinates.length - 1]) {
				this.data.polygon_zone.geometry.coordinates[0].push(coordinates[0]);
			}
			this.updateMarkers();
		} catch (e) {
			this.updatePolygonText();
		}
	},
	updatePolygonText: function() {
		var coordinates = this.data.polygon_zone.geometry.coordinates[0];
		if (coordinates[0] != coordinates[coordinates.length - 1]) {
			this.data.polygon_zone.geometry.coordinates[0].push(coordinates[0]);
		}
		this.polygon_text = JSON.stringify(this.data.polygon_zone, null, 2);
		this.updateMarkers();
	},
	updateMarkers: function() {
		var _this = this;
		this.MARKERS.forEach(function(m) {
			m.setMap(null);
		});
		this.MARKERS = [];
		var last_latlng = this.data.polygon_zone.geometry.coordinates[0].length - 1;
		this.data.polygon_zone.geometry.coordinates[0].forEach(function(c, i) {
			if (i === last_latlng) return;
			_this.addMarker({ lng: c[0], lat: c[1] });
		});
	},
	setTreeView: function(tree) {
		this.tree_view = tree;
	},
	submit: function() {
		var _this = this;
		this.instanceMetaAssets(function() {
			_this.updateZone();
		});
	},
	updateZone: function() {
		var _this = this;
		var url = this.CONF.post.add;
		var params = {
			entity: "zone",
			row: {}
		};
		if (this.ID) {
			url = this.CONF.post.edit;
			params.id = Number(this.ID);
			params.primary = "id_zone";
		} else {
			params.row.id_member = this.ROOT.user.id_member;
		}
		for (d in this.data) {
			if (d.indexOf("_") === 0) continue;
			params.row[d] = this.data[d];
		}
		if (undefined != params.row.parent_zone && params.row.parent_zone != null) {
			params.row.parent_zone = params.row.parent_zone.id_zone;
		}
		if (
			this.METADATA[this.data.id_metadata.toString()].is_visible_metadata ===
			true
		) {
			params.row.polygon_zone = JSON.stringify(params.row.polygon_zone);
		} else {
			params.row.polygon_zone = null;
		}
		params.row.metadata_zone = JSON.stringify(params.row.metadata_zone);
		this.transaction = true;
		this.HTTP.post(url, params).then(function(response) {
			var data = response.data;
			if (data.error != null) {
				_this.ROOT.error = "GEOZONE_ERROR";
				_this.transaction = false;
				_this.error = true;
				return;
			}
			if (data.rows.length === 0) {
				_this.warning = true;
				_this.transaction = false;
				_this.ROOT.warning = "GEOZONE_NO_ROWS";
				return;
			}
			var id_zone =
				undefined === _this.ID || _this.ID === null
					? data.rows.insertId
					: _this.ID;
			var params = {
				id_zone: id_zone,
				items: Object.keys(_this.selected_items)
			};
			if (params.items.length === 0) {
				_this.ROOT.success = "GEOZONE_SUCCESS";
				_this.transaction = false;
				_this.success = true;
				return;
			}
			params.items.forEach(function(v, i) {
				params.items[i] = [
					Number(v),
					_this.selected_items[v].metadata,
					"'" + JSON.stringify(_this.selected_items[v].schema_stock) + "'"
				];
			});
			_this.HTTP.post(_this.CONF.post.stocks, params).then(function(response) {
				var data = response.data;
				_this.transaction = false;
				if (data.error != null) {
					_this.ROOT.error = "GEOZONE_ERROR";
					_this.error = true;
					return;
				}
				if (data.rows.length === 0) {
					_this.warning = true;
					_this.ROOT.warning = "GEOZONE_NO_ROWS";
					return;
				}
				_this.ROOT.success = "GEOZONE_SUCCESS";
				_this.success = true;
			});
		});
	},
	instanceMetaAssets: function(callback) {
		//TODO REPAIR QUERY
		callback();
		return;
		var _this = this;
		var latitude = -37;
		var longitude = 176;
		if (undefined != this.POLYGON && this.POLYGON != null) {
			var path = this.POLYGON.getPath();
			if (undefined != path && path != null) {
				var bounds = new google.maps.LatLngBounds();
				path.forEach(function(c) {
					bounds.extend(c);
				});
				var center = bounds.getCenter();
				latitude = center.lat();
				longitude = center.lng();
			}
		}
		var assets = {};
		var meta_assets = this.METADATA[this.data.id_metadata].assets;
		for (i in this.selected_items) {
			var item = this.selected_items[i];
			var id_asset = item.id_asset.toString();
			var asset = meta_assets[id_asset];
			if (item.metadata === true && undefined != asset && asset != null) {
				delete meta_assets[id_asset];
			}
		}
		var item_rows = [];
		for (m in meta_assets) {
			var meta_asset = meta_assets[m];
			item_rows.push({
				name_item: this.data.name_zone + " " + meta_asset.name_asset,
				latitude_item: latitude,
				longitude_item: longitude,
				schema_item: JSON.stringify({ attributes: {} }),
				id_asset: Number(m),
				id_timezone: 340,
				id_carrier: 1,
				id_member: this.ROOT.user.id_member,
				name_asset: meta_asset.name_asset,
				name_project: this.ROOT.sensum.project.name_project,
				name_timezone: "Pacific/Auckland"
			});
		}
		if (item_rows.length === 0) {
			callback();
			return;
		}
		var params = {
			rows: item_rows
		};
		this.HTTP.post("/mozart/items/batch/", params).then(function(response) {
			var data = response.data;
			if (data.error) {
				return callback();
			}
			data.output.forEach(function(r, i) {
				var id = r.id_item;
				_this.selected_items[id.toString()] = {
					id: id.toString(),
					id_item: id,
					name_item: r.name_item,
					metadata: true,
					id_asset: r.id_asset
				};
			});
			callback();
			return;
		});
	},
	remove: function() {
		if (!this.ID) return;
		var _this = this;
		var url = this.CONF.post.remove;
		var params = {
			entity: "zone",
			id: Number(this.ID),
			primary: "id_zone"
		};
		$("#geozone-modal").on("hidden.bs.modal", function() {
			$(".modal-backdrop").remove();
			$("body").removeClass("modal-open");
			_this.HTTP.post(url, params).then(function(response) {
				var data = response.data;
				if (data.error != null) {
					return (_this.ROOT.error = "GEOZONE_" + data.error.code);
				}
				if (data.rows.length === 0) {
					return (_this.ROOT.warning = "GEOZONE_NO_ROWS");
				}
				_this.ROOT.saved_success = "GEOZONE_SUCCESS";
				_this.LOCATION.path("/dashboard/");
			});
		});
	},
	findAddress: function() {
		var _this = this;
		var place = this.address.replace(/\s/g, "+");
		var GEOGOOGLE =
			"https://maps.googleapis.com/maps/api/geocode/json?address=";
		var url = GEOGOOGLE + place;

		this.HTTP.get(url).then(function(response) {
			var data = response.data.results;
			_this.addresses = data;
		});
	},
	centerMap: function(latlng) {
		this.MAP.setCenter(latlng);
		this.ADDRESS_MARKER.setMap(this.MAP);
		this.ADDRESS_MARKER.setPosition(latlng);
	},
	clearMarkers: function() {
		this.data.polygon_zone.geometry.coordinates[0] = [];
		this.updatePolygonText();
		this.redrawPolygon();
	},
	drawParentZone: function() {
		var path = [];
		var zone = this.data.parent_zone;
		if (undefined === zone || zone === null) {
			this.PARENT_POLYGON.setPath(path);
			return;
		}
		this.PARENT_POLYGON.setOptions({
			strokeColor: zone.color_zone
		});
		zone.polygon_zone.geometry.coordinates[0].forEach(function(c, i) {
			path.push({ lng: c[0], lat: c[1] });
		});
		this.PARENT_POLYGON.setPath(path);
	},
	panParentZone: function() {
		if (
			(undefined === this.PARENT_POLYGON ||
				this.PARENT_POLYGON === null ||
				this.PARENT_POLYGON.getPath().length === 0) &&
			(undefined === this.POLYGON ||
				this.POLYGON === null ||
				this.POLYGON.getPath().length === 0)
		) {
			this.MAP.setCenter(this.MAP_DEFAULT_CENTER);
			return;
		}
		var bounds = new google.maps.LatLngBounds();
		if (
			undefined === this.PARENT_POLYGON ||
			this.PARENT_POLYGON === null ||
			this.PARENT_POLYGON.getPath().length === 0
		) {
			this.POLYGON.getPath().forEach(function(c) {
				bounds.extend(c);
			});
			this.MAP.fitBounds(bounds);
			return;
		}
		this.PARENT_POLYGON.getPath().forEach(function(c) {
			bounds.extend(c);
		});
		this.MAP.fitBounds(bounds);
	},
	addItem: function() {
		var i = this.selected_item.id;
		this.selected_item = null;
		this.selected_items[i] = {};
		for (k in this.available_items[i]) {
			this.selected_items[i][k] = this.available_items[i][k];
		}
		delete this.available_items[i];
		++this.selected_items_count;
	},
	removeItem: function(i) {
		this.available_items[i] = {};
		for (k in this.selected_items[i]) {
			this.available_items[i][k] = this.selected_items[i][k];
		}
		delete this.selected_items[i];
		--this.selected_items_count;
	},

	getWebServiceDevices: function() {
		var _this = this;
		var params = {
			info: this.data.metadata_zone._application,
			rest: this.APPLICATIONS[this.data.id_application.toString()]
				.schema_application.rest,
			list: "items"
		};
		this.HTTP.post("/sallieri/info", params).then(function(response) {
			var rows = response.data;
			if (rows.error) {
				$("#sensum-geozone-synchro-modal").modal("hide");
				return (_this.ROOT.warning = "GEOZONE_SYNCHRONIZE_ERROR");
			}
			if (
				undefined === _this.data.metadata_zone._remote ||
				_this.data.metadata_zone._remote === null
			) {
				_this.data.metadata_zone._remote = {};
			}
			if (Object.keys(rows).length === 0) {
				$("#sensum-geozone-synchro-modal").modal("hide");
				return (_this.ROOT.warning = "GEOZONE_SYNCHRONIZE_ERROR");
			}

			_this.data.metadata_zone._remote = JSON.parse(JSON.stringify(rows));
			_this.getWebServiceAttributes(Object.keys(rows));
		});
	},
	getWebServiceAttributes: function(devices) {
		var _this = this;
		var params = {
			info: this.data.metadata_zone._application,
			rest: this.APPLICATIONS[this.data.id_application.toString()]
				.schema_application.rest,
			list: "attributes"
		};
		params.info.item = devices[0];
		this.HTTP.post("/sallieri/info", params).then(function(response) {
			var rows = response.data;
			if (rows.error) {
				$("#sensum-geozone-synchro-modal").modal("hide");
				return (_this.ROOT.warning = "GEOZONE_SYNCHRONIZE_ERROR");
			}
			delete rows.nodeType; //EnteliWeb
			if (
				undefined === _this.data.metadata_zone._remote[params.info.item] ||
				_this.data.metadata_zone._remote[params.info.item] === null
			) {
				_this.data.metadata_zone._remote[params.info.item] = {};
			}

			for (r in rows) {
				if (
					r.indexOf("binary-value") === -1 &&
					r.indexOf("analog-value") === -1
				) {
					delete rows[r];
				}
			}
			_this.data.metadata_zone._remote[
				params.info.item
			]._attributes = JSON.parse(JSON.stringify(rows));
			_this.getWebServiceFields(devices[0], Object.keys(rows), function() {
				devices.shift();
				if (devices.length > 0) {
					_this.getWebServiceAttributes(devices);
				} else {
					$("#sensum-geozone-synchro-modal").modal("hide");
					_this.data.metadata_zone._synchro = true;
				}
			});
		});
	},
	getWebServiceFields: function(device, attributes, callback) {
		var _this = this;
		var params = {
			info: this.data.metadata_zone._application,
			rest: this.APPLICATIONS[this.data.id_application.toString()]
				.schema_application.rest,
			list: "fields"
		};
		params.info.item = device;
		params.info.attribute = attributes[0];
		this.synchro_message = params.info.attribute;
		this.HTTP.post("/sallieri/info", params).then(function(response) {
			var rows = response.data;
			if (rows.error) {
				$("#sensum-geozone-synchro-modal").modal("hide");
				return (_this.ROOT.warning = "GEOZONE_SYNCHRONIZE_ERROR");
			}
			if (
				undefined ===
					_this.data.metadata_zone._remote[params.info.item]._attributes[
						params.info.attribute
					] ||
				_this.data.metadata_zone._remote[params.info.item]._attributes[
					params.info.attribute
				] === null
			) {
				_this.data.metadata_zone._remote[params.info.item]._attributes[
					params.info.attribute
				] = {};
			}
			try {
				_this.data.metadata_zone._remote[params.info.item]._attributes[
					params.info.attribute
				]._fields = JSON.parse(JSON.stringify(rows));
			} catch (e) {}
			attributes.shift();
			if (attributes.length > 0) {
				_this.getWebServiceFields(device, attributes, callback);
			} else {
				callback();
			}
		});
	},
	updatePushFields: function() {
		this.push_attribute.fields = JSON.parse(
			JSON.stringify(
				this.ITEMS[this.push_attribute.id_item.toString()].schema_asset
					.attributes[this.push_attribute.attribute]
			)
		);
	},
	pushField: function() {
		var _this = this;
		var info = JSON.parse(JSON.stringify(this.data.metadata_zone._application));
		for (a in this.push_attribute.fields) {
			info[a] = this.push_attribute.fields[a];
		}
		//DELTA
		var remote = JSON.parse(
			JSON.stringify(
				this.data.metadata_zone._remote[this.push_attribute.remote]._attributes
			)
		);
		var index = 1;
		var indexes = [];
		this.ROOT.warning = null;
		for (b in remote) {
			if (b.indexOf("analog-value,") === 0) {
				indexes.push(Number(b.split(",")[1]));
				if (info.label === remote[b].displayName) {
					this.ROOT.warning = "GEOZONE_PUSH_DUPLICATE_NAME";
					return;
				}
			}
		}
		while (indexes.indexOf(index) != -1) {
			++index;
		}
		info.object_identifier = "analog-value," + index;
		var params = {
			info: info,
			rest: this.APPLICATIONS[this.data.id_application.toString()]
				.schema_application.rest,
			list: "push"
		};
		this.HTTP.post("/sallieri/info", params).then(function(response) {
			var rows = response.data;
			if (rows.error && rows.error != "-1") {
				$("#sensum-geozone-push-modal").modal("hide");
				return (_this.ROOT.warning = "GEOZONE_SYNCHRONIZE_ERROR");
			}
			$("#sensum-geozone-push-modal").modal("hide");
			$("#sensum-geozone-synchro-modal").modal("show");

			_this.selected_items[
				_this.push_attribute.id_item.toString()
			].schema_stock.remote[_this.push_attribute.attribute] = {
				item: _this.push_attribute.remote,
				attribute: info.object_identifier
			};

			window.setTimeout(function() {
				_this.getWebServiceDevices();
			}, 1000);
		});
	}
};
//MODULE DEFINITION
var app = angular
	.module("geozone", ["ngRoute"])
	.controller("GeozoneController", [
		"$rootScope",
		"$scope",
		"$http",
		"$routeParams",
		"$location",
		GeozoneController
	]);
