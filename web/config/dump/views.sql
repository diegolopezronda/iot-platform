CREATE OR REPLACE VIEW links_view AS
	SELECT
		l.id_link,
		l.name_link,
		l.icon_link,
		l.url_link,
		p.id_project,
		p.name_project,
		p.url_project,
		p.date_project,
		p.home_project
	FROM link AS l
	LEFT JOIN project AS p ON p.id_project = l.id_project
;
CREATE OR REPLACE VIEW routes_view AS
	SELECT
		r.id_route,
		r.url_route,
		r.controller_as_route,
		r.template_url_route,
		m.id_module,
		m.name_module,
		m.configuration_module,
		p.id_project,
		p.name_project,
		p.url_project,
		p.date_project,
		p.home_project
	FROM route AS r
	INNER JOIN module AS m ON m.id_module = r.id_module
	LEFT JOIN project AS p ON p.id_project = r.id_project
;
CREATE OR REPLACE VIEW projects_view AS
	SELECT  
	p.id_project,
	p.name_project,
	p.url_project,
	p.date_project,
	p.home_project,
	p.parent_project,
	q.parent_project as grandparent_project
	FROM project AS p
	LEFT JOIN project AS q ON q.id_project = p.parent_project
;
CREATE OR REPLACE VIEW zones_view AS 
	SELECT
	z.id_zone,
	z.name_zone,
	z.polygon_zone,
	z.color_zone,
	z.metadata_zone,
	z.parent_zone,
	m.id_metadata,
	m.name_metadata,
	m.is_visible_metadata,
	m.schema_metadata,
	a.id_application,
	a.name_application,
	a.company_application,
	a.schema_application,
	x.id_member,
	u.id_user,
	p.id_project,
	p.name_project,
	p.url_project,
	p.date_project,
	p.home_project
	FROM zone AS z
	INNER JOIN member AS x ON x.id_member = z.id_member
	INNER JOIN user AS u ON u.id_user = x.id_user
	INNER JOIN metadata AS m ON m.id_metadata = z.id_metadata
	INNER JOIN project AS p ON p.id_project = x.id_project
	LEFT JOIN application AS a ON a.id_application = z.id_application
;
CREATE OR REPLACE VIEW items_view AS 
	SELECT
	i.id_item,
	i.name_item,
	i.mac_item,
	i.key_item,
	i.latitude_item,
	i.longitude_item,
	i.schema_item,
	i.hash_item,
	i.is_motion_item,
	a.id_asset,
	a.name_asset,
	a.schema_asset,
	a.manufacturer_asset,
	a.model_asset,
	a.date_asset,
	c.id_carrier,
	c.name_carrier,
	c.code_carrier,
	c.key_carrier,
	c.base_carrier,
	c.is_system_carrier,
	CONCAT("[",GROUP_CONCAT(s.id_zone),"]") AS zones_item,
	MAX(s.is_metadata_stock) AS is_metadata_stock,
	p.id_project,
	p.name_project,
	p.url_project,
	p.date_project,
	p.home_project,
	m.id_member,
	u.id_user,
	y.mac_item AS 'mac_parent_item'
	FROM item AS i
	INNER JOIN asset AS a ON a.id_asset = i.id_asset
	INNER JOIN carrier AS c ON c.id_carrier = a.id_carrier
	INNER JOIN member AS m ON m.id_member = i.id_member
	INNER JOIN user AS u ON u.id_user = m.id_user
	INNER JOIN project AS p ON p.id_project = m.id_project
	LEFT JOIN stock AS s ON s.id_item = i.id_item
	LEFT JOIN item AS y ON y.id_item = i.parent_item
	GROUP BY i.id_item
;
CREATE OR REPLACE VIEW stocks_view AS 
	SELECT
	s.is_metadata_stock,
	i.id_item,
	i.name_item,
	i.mac_item,
	i.latitude_item,
	i.longitude_item,
	i.schema_item,
	i.hash_item,
	a.id_asset,
	a.name_asset,
	a.manufacturer_asset,
	a.model_asset,
	a.date_asset,
	a.schema_asset,
	CONCAT("[",GROUP_CONCAT(s.id_zone),"]") AS zones_item,
	p.id_project,
	p.name_project,
	p.url_project,
	p.date_project,
	p.home_project
	FROM stock AS s
	INNER JOIN item AS i ON i.id_item = s.id_item
	INNER JOIN asset AS a ON a.id_asset = i.id_asset
	INNER JOIN member AS m ON m.id_member = i.id_member
	INNER JOIN project AS p ON p.id_project = m.id_project
	GROUP BY id_item
;

CREATE OR REPLACE VIEW webservices_view AS 
	SELECT
	s.is_metadata_stock,
	s.schema_stock,
	z.id_zone,
	z.name_zone,
	z.metadata_zone,
	i.id_item,
	i.name_item,
	i.mac_item,
	i.key_item,
	i.latitude_item,
	i.longitude_item,
	i.schema_item,
	i.hash_item,
	a.id_asset,
	a.name_asset,
	a.manufacturer_asset,
	a.model_asset,
	a.date_asset,
	a.schema_asset,
	x.id_application,
	x.name_application,
	x.company_application,
	x.schema_application	
	FROM stock AS s
	INNER JOIN zone AS z ON z.id_zone = s.id_zone
	INNER JOIN application AS x ON x.id_application = z.id_application
	INNER JOIN item AS i ON i.id_item = s.id_item
	INNER JOIN asset AS a ON a.id_asset = i.id_asset
	WHERE z.id_application IS NOT NULL
;

CREATE OR REPLACE VIEW collaborators_view AS 
	SELECT
	u.id_user,
	u.account_user,
	u.first_name_user,
	u.last_name_user,
	u.email_user,
	u.cellphone_user,
	z.id_zone,
	z.name_zone,
	z.polygon_zone,
	z.color_zone,
	m.id_member,
	m.id_user AS 'id_owner',
	p.id_project,
	p.name_project,
	p.url_project,
	p.date_project,
	p.home_project
	FROM collaborator AS k
	INNER JOIN user AS u ON u.id_user = k.id_user
	INNER JOIN zone AS z ON z.id_zone = k.id_zone
	INNER JOIN member AS m ON m.id_member = z.id_member
	INNER JOIN project AS p ON p.id_project = m.id_project
;
CREATE OR REPLACE VIEW users_view AS 
	SELECT
	u.id_user,
	u.account_user,
	u.first_name_user,
	u.last_name_user,
	u.email_user,
	u.cellphone_user,
	u.metadata_user,
	u.is_system_user
	FROM user AS u
;
CREATE OR REPLACE VIEW subscriptors_view AS
	SELECT
	s.is_sms_subscriptor,
	s.is_email_subscriptor,
	u.id_user,
	u.account_user,
	u.first_name_user,
	u.last_name_user,
	u.email_user,
	u.cellphone_user,
	i.id_item,
	i.name_item,
	i.mac_item,
	i.latitude_item,
	i.longitude_item,
	i.schema_item,
	i.hash_item,
	a.id_asset,
	a.name_asset,
	a.manufacturer_asset,
	a.model_asset,
	a.date_asset,
	a.schema_asset,
	m.id_member,
	p.id_project,
	p.name_project,
	p.url_project,
	p.date_project,
	p.home_project
	FROM subscriptor AS s
	INNER JOIN user AS u ON u.id_user = s.id_user
	INNER JOIN item AS i ON i.id_item = s.id_item
	INNER JOIN member AS m ON m.id_member = i.id_member
	INNER JOIN project AS p ON p.id_project = m.id_project
	INNER JOIN asset AS a ON a.id_asset = i.id_asset
;
/*
CREATE OR REPLACE VIEW invoices_view AS
	SELECT
	i.id_invoice,
	i.currency_invoice,
	i.tax_invoice,
	i.date_invoice,
	s.name_service,
	s.price_service
	FROM service AS s
	INNER JOIN invoice AS i ON i.id_invoice = s.id_invoice
;
CREATE OR REPLACE VIEW metastocks_view AS 
	SELECT
	m.id_metadata,
	m.name_metadata,
	m.is_visible_metadata,
	m.schema_metadata,
	a.id_asset,
	a.name_asset,
	a.schema_asset
	FROM metastock AS x
	INNER JOIN metadata AS m ON m.id_metadata = x.id_metadata
	INNER JOIN asset AS a ON a.id_asset = x.id_asset
;
CREATE OR REPLACE VIEW metadata_view AS 
	SELECT
	m.id_metadata,
	m.name_metadata,
	m.is_visible_metadata,
	m.schema_metadata,
	CONCAT("[",GROUP_CONCAT(a.schema_asset),"]") AS assets_metadata
	FROM metadata AS m
	LEFT JOIN metastock AS x ON x.id_metadata = m.id_metadata
	LEFT JOIN asset AS a ON a.id_asset = x.id_asset
	GROUP BY m.id_metadata
;
*/
CREATE OR REPLACE VIEW members_view AS
  SELECT
  m.id_member,
  m.hash_member,
  u.id_user,
  u.account_user,
	CONCAT(u.first_name_user,' ',u.last_name_user) AS name_user,
  u.first_name_user,
  u.last_name_user,
  u.email_user,
  u.cellphone_user,
  u.metadata_user,
  u.is_system_user,
  p.id_project,
  p.name_project,
  p.url_project,
  p.date_project,
  p.home_project,
	CONCAT("[",GROUP_CONCAT(DISTINCT z.id_zone),"]") AS zones_member,
	CONCAT("[",GROUP_CONCAT(DISTINCT c.id_zone),"]") AS zones_collaborator,
	CONCAT("[",GROUP_CONCAT(DISTINCT i.id_item),"]") AS items_member,
	CONCAT("[",GROUP_CONCAT(DISTINCT s.id_item),"]") AS items_collaborator,
  x.id_project AS 'id_parent_project',
  x.name_project AS 'name_parent_project',
  x.url_project AS 'url_parent_project',
  x.date_project AS 'date_parent_project',
  x.home_project AS 'home_parent_project'
  FROM member AS m
  INNER JOIN user AS u ON u.id_user = m.id_user
  INNER JOIN project AS p ON p.id_project = m.id_project
  LEFT JOIN zone AS z ON z.id_member = m.id_member
  LEFT JOIN item AS i ON i.id_member = m.id_member
  LEFT JOIN collaborator AS c ON c.id_user = m.id_user 
	LEFT JOIN stock AS s ON s.id_zone = c.id_zone
  LEFT JOIN project AS x ON x.id_project = p.parent_project
	GROUP BY m.id_member;
;
CREATE OR REPLACE VIEW privileges_view AS
  SELECT
	p.id_privilege,
	p.is_creator_privilege,
	p.is_editor_privilege,
	p.is_destroyer_privilege,
	p.is_global_privilege,
	m.id_member,
	u.id_user,
	u.first_name_user,
	u.email_user,
	g.id_project,
	g.name_project,
	g.url_project,
	l.id_level,
	l.name_level,
	l.is_successor_level,
	l.is_system_level,
	l.tables_level,
	l.schema_level
	FROM privilege AS p
	INNER JOIN member AS m ON m.id_member = p.id_member
	INNER JOIN project AS g ON g.id_project = m.id_project
	INNER JOIN user AS u ON u.id_user = m.id_user
	INNER JOIN level AS l ON l.id_level = p.id_level
;
CREATE OR REPLACE VIEW assets_view AS
  SELECT
	a.id_asset,
	a.name_asset,
	a.schema_asset,
	a.manufacturer_asset,
	a.model_asset,
	a.date_asset,
	a.tags_asset,
	a.is_trusted_asset,
	a.is_public_asset,
  u.id_user,
  u.account_user,
	CONCAT(u.first_name_user,' ',u.last_name_user) AS name_user,
  u.first_name_user,
  u.last_name_user,
  u.email_user,
  u.cellphone_user,
  u.metadata_user,
  u.is_system_user,
	c.id_carrier,
	c.name_carrier,
	c.code_carrier,
	c.key_carrier,
	c.base_carrier,
	c.is_system_carrier
	FROM asset AS a
	INNER JOIN user AS u ON u.id_user = a.id_user
	INNER JOIN carrier AS c ON c.id_carrier = a.id_carrier
;
CREATE OR REPLACE VIEW capabilities_view AS
  SELECT
	c.id_capability,
	c.is_creator_capability,
	c.is_editor_capability,
	c.is_destroyer_capability,
	c.is_global_capability,
	p.id_project,
	p.name_project,
	p.url_project,
	p.parent_project,
	q.parent_project AS grandparent_project,
	l.id_level,
	l.name_level,
	l.is_successor_level,
	l.is_system_level,
	l.tables_level,
	l.schema_level
	FROM capability AS c
	INNER JOIN project AS p ON p.id_project = c.id_project
	INNER JOIN level AS l ON l.id_level = c.id_level
	LEFT JOIN project AS q ON q.id_project = p.parent_project
;
CREATE OR REPLACE VIEW servers_view AS
	SELECT
		s.id_server,
		s.address_server,
		s.is_secure_server,
		s.schema_server,
		p.id_protocol,
		p.name_protocol,
		p.code_protocol,
		n.id_network,
		n.name_network,
		n.code_network,
		n.schema_network,
		c.id_carrier,
		c.name_carrier,
		c.code_carrier,
		c.base_carrier,
		c.is_system_carrier,
		c.key_carrier
	FROM server AS s
	INNER JOIN protocol AS p ON p.id_protocol = s.id_protocol
	INNER JOIN network AS n ON n.id_network = s.id_network
	INNER JOIN carrier AS c ON c.id_carrier = n.id_carrier
;
