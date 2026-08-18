const child_process = require("child_process");
const fs = require("fs");
//Timezone
const moment = require("moment-timezone");
const TIMEZONE = "Pacific/Auckland";
//Monitor configuration
const config = require("./config/monitor");
//PM2
const pm2 = require("pm2");
const PM2_LIMITS = require("./config/pm2.json");
//MQTT
const MQTT_TOPIC = "sensum/monitor/info";
const mqtt = require("mqtt");
const mqtt_config = require("./config/mqtt");
const mqtt_client = mqtt.connect(mqtt_config.publish);
const df_template = ["total", "used", "available", "percent"];
const memory_units = ["KB", "MB", "GB"];
const time_diffs = ["seconds", "minutes", "hours", "days"];

function monitorService(service_name) {
	var service = child_process.spawnSync(
		"systemctl",
		["status", service_name + ".service"],
		{ shell: true }
	);
	if (service.error) {
		console.log(service.error);
		console.log(service);
		//sendEmail("Service monitor", "fucked");
		return null;
	}
	var killer = child_process.spawnSync("kill", [service.pid]);
	output = {};
	var stdout = service.stdout
		.toString()
		.replace(/^[●]{0,1}\s*/gm, "")
		.split("\n");
	stdout.pop();
	var header = stdout[0].split(".service - ");
	output.name = header[0];
	output.description = header[1];
	stdout.shift();
	var dotted = true;
	while (stdout.length > 0) {
		var split = stdout[0].split(": ");
		var field = split[0].toLowerCase().replace(/\s/g, "_");
		if ((dotted = split.length < 2)) break;
		output[field] = split[1];
		stdout.shift();
		if (field === "cgroup") break;
	}
	output.is_active = false;
	if (output.active.indexOf("active (running) ") === 0) output.is_active = true;
	output.logs = stdout;
	return output;
}

function monitorDiskSpace() {
	var unit = "G";
	var df = child_process.spawnSync("df", ["/dev/xvda1", "-B", unit]);
	if (df.error) {
		//sendEmail("Disk check", "fucked");
		return null;
	}
	var stdout = df.stdout
		.toString()
		.split("\n")[1]
		.replace(/dev|xvda1|\s|\/|%/g, "")
		.split("G");
	var output = {};
	df_template.forEach(function(o, i) {
		output[o] = Number(stdout[i]);
	});
	output.unit = unit + "B";
	output.valid = output.percent < config.disk_percent;
	return output;
}

function monitorMachine() {
	var output = {
		daemons: {},
		apps: {}
	};
	output.disk = monitorDiskSpace();
	config.daemons.forEach(function(p) {
		output.daemons[p] = monitorService(p);
	});
	pm2.connect(function(error) {
		if (error) {
			//sendEmail("PM2 Connection", "fucked");
			return;
		}
		pm2.list(function(error, processes) {
			if (error) {
				//sendEmail("PM2 List", "fucked");
				return;
			}
			if (processes.length === 0) {
				//sendEmail("PM2", "Clear process list");
				return;
			}
			var apps_status = {};
			config.apps.forEach(function(p) {
				apps_status[p] = false;
			});
			processes.forEach(function(p) {
				var data = {};
				data.name = p.name;
				data.pid = p.pid;
				data.pm_id = p.pm_id;
				data.bytes = p.monit.memory;
				data.memory = p.monit.memory + "B";
				for (n = 0; n < memory_units.length; n++) {
					var unit = memory_units[n];
					var value = Math.floor(data.bytes / Math.pow(1024, n + 1));
					if (value === 0) break;
					data.memory = value.toString() + unit;
				}
				data.cpu = p.monit.cpu;
				data.uptime = p.pm2_env.pm_uptime;
				for (n = 0; n < time_diffs.length; n++) {
					var key = time_diffs[n];
					var diff = moment().diff(moment(data.uptime), key);
					if (diff === 0) break;
					data.duration = diff.toString() + key.charAt(0).toUpperCase();
				}
				data.unstable_restarts = p.pm2_env.unstable_restarts;
				data.restart_time = p.pm2_env.restart_time;
				data.status = p.pm2_env.status;
				output.apps[p.name.replace(/-/g, "_")] = data;
			});
			output.date = new Date().getTime();
			output.server = config.server;
			output.hash = config.hash;
			output.interval = config.interval;
			console.log(MQTT_TOPIC);
			mqtt_client.publish(MQTT_TOPIC, JSON.stringify(output));
		});
	});
}

mqtt_client.on("connect", function() {
	console.log("connected locally");
	mqtt_client.subscribe("sensum/monitor/request");
	monitorMachine();
	var INTERVAL = setInterval(function() {
		monitorMachine();
	}, config.interval);
});

mqtt_client.on("message", function(topic, buffer) {
	var data = JSON.parse(buffer.toString());
	var topic_array = topic.split("/");
	topic_array.shift();
	topic_array.shift();
	var type = topic_array.join("/");
	switch (type) {
		case "request":
			if (data.hash != config.hash) break;
			monitorMachine();
			break;
		default:
		//one
	}
});
