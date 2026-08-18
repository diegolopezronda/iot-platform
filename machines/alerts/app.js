//MySQL
const mysql = require('mysql2');
const mysql_config = require('./config/mysql');
const mysql_client = mysql.createConnection(mysql_config);
const SUBSCRIPTORS_QUERY = 'SELECT * FROM subscriptors_view WHERE mac_item =';
//MQTT
const mqtt = require('mqtt');
const mqtt_config = require('./config/mqtt');
const mqtt_client = mqtt.connect(mqtt_config);

mqtt_client.on('connect', function() {
	mqtt_client.subscribe('alerts/+');
});

mqtt_client.on('message', function(topic, buffer) {
	var message = JSON.parse(buffer.toString());
	var topic_array = topic.split('/');
	var mac = Number(topic_array[1]);
	console.log(message);
	var kpi_content = '';
	var table = '';
	for (k in message.kpi) {
		var kpi = message.kpi[k];
		var value = message.values[k];
		var current_status = message.current_status[k];
		var status_color = current_status ? '#CCFFCC' : '#FFCCCC';
		var status_name = current_status ? 'OK' : 'WRONG';
		if (undefined === kpi.unit || kpi.unit === null) kpi.unit = '';
		if (undefined === kpi.min || kpi.min === null) {
			kpi.unit = '';
			kpi.min = 'any';
		}
		if (undefined === kpi.max || kpi.max === null) {
			kpi.unit = '';
			kpi.max = 'any';
		}
		table +=
			"<tr style='background:" +
			status_color +
			"'>" +
			'<td>' +
			kpi.name +
			'</td>' +
			'<td>' +
			kpi.min +
			'' +
			kpi.unit +
			'</td>' +
			'<td>' +
			kpi.max +
			'' +
			kpi.unit +
			'</td>' +
			'<td>' +
			value +
			'' +
			kpi.unit +
			'</td>' +
			"<td style='text-align:center;background:" +
			status_color +
			"'>" +
			status_name +
			'</td>' +
			'</tr>';
		kpi_content +=
			',' +
			kpi.name +
			' (' +
			(current_status ? 'OK' : '!') +
			'): ' +
			value +
			kpi.unit +
			' (' +
			kpi.min +
			' - ' +
			kpi.max +
			')';
	}
	kpi_content = kpi_content.substring(1);
	var year_date = new Date().getFullYear();
	mysql_client.query(SUBSCRIPTORS_QUERY + mac, function(error, rows, fields) {
		if (error) console.error('MYSQL ERROR');
		if (rows.length === 0) return console.error('NO SUBSCRIPTORS');
		rows.forEach(function(r, i) {
			console.log('--SUBSCRIPTOR--');
			console.log(r);
			var data = {
				from: r.name_project,
				to: r.email_user,
				domain: r.url_project.replace(/^(www\.|http:\/\/|https:\/\/)/g, ''),
				subject: 'Alert',
				params: {
					first_name_user: r.first_name_user,
					name_company: r.name_company,
					id_project: r.id_project,
					mac_item: mac,
					name_item:r.name_item,
					data_table: table,
					date: year_date
				}
			};
			if (r.is_email_subscriptor === 1) {
				mqtt_client.publish(
					'email/alert',
					JSON.stringify(data),
					{ qos: 2 },
					function(error) {
						if (error) return console.error('ALERT ERROR');
						console.log('TRIGGERED EMAIL to <' + data.to + '>');
					}
				);
			}
			if (r.is_sms_subscriptor === 1 && r.cellphone_user) {
				var sms = {
					to: r.cellphone_user,
					params: {
						first_name_user: r.first_name_user,
						name_item: r.name_item,
						mac_item: r.mac_item,
						url: r.url_project,
						kpi_content: kpi_content
					}
				};
				mqtt_client.publish(
					'sms/alert',
					JSON.stringify(sms),
					{ qos: 2 },
					function(error) {
						if (error) return console.error('ALERT ERROR');
						console.log('TRIGGERED SMS to <' + sms.to + '>');
					}
				);
			}
		});
	});
});
