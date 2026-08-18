
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

/*!40000 DROP DATABASE IF EXISTS `sensum`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `sensum` /*!40100 DEFAULT CHARACTER SET latin1 */;

USE `sensum`;
DROP TABLE IF EXISTS `application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `application` (
  `id_application` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `name_application` varchar(255) NOT NULL COMMENT 'Name of application.',
  `company_application` varchar(255) NOT NULL COMMENT 'Application vendor.',
  `schema_application` text NOT NULL COMMENT 'Information to gain access to application.',
  PRIMARY KEY (`id_application`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `asset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset` (
  `id_asset` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_asset` varchar(255) NOT NULL COMMENT 'Human readable ID of asset.',
  `schema_asset` text,
  `is_public_asset` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Define if everybody can create items from this asset.',
  `id_user` int(11) NOT NULL DEFAULT '1' COMMENT 'The owner of the asset.',
  `is_trusted_asset` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Defines if the device is Sensum Trusted.',
  `tags_asset` text COMMENT 'tags.',
  `manufacturer_asset` varchar(255) NOT NULL DEFAULT 'Unknown' COMMENT 'Name of the company who builts the hardware.',
  `model_asset` varchar(255) NOT NULL DEFAULT 'Unknown' COMMENT 'Generic identifier of hardware.',
  `date_asset` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update.',
  `id_carrier` int(11) NOT NULL DEFAULT '1' COMMENT 'Carrier.',
  PRIMARY KEY (`id_asset`),
  UNIQUE KEY `name_asset_UNIQUE` (`name_asset`),
  KEY `id_user` (`id_user`),
  KEY `id_carrier` (`id_carrier`),
  CONSTRAINT `asset_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `asset_ibfk_2` FOREIGN KEY (`id_carrier`) REFERENCES `carrier` (`id_carrier`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=211 DEFAULT CHARSET=utf8 COMMENT='Items abstraction list.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `assets_view`;
/*!50001 DROP VIEW IF EXISTS `assets_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `assets_view` AS SELECT 
 1 AS `id_asset`,
 1 AS `name_asset`,
 1 AS `schema_asset`,
 1 AS `manufacturer_asset`,
 1 AS `model_asset`,
 1 AS `date_asset`,
 1 AS `tags_asset`,
 1 AS `is_trusted_asset`,
 1 AS `is_public_asset`,
 1 AS `id_user`,
 1 AS `account_user`,
 1 AS `name_user`,
 1 AS `first_name_user`,
 1 AS `last_name_user`,
 1 AS `email_user`,
 1 AS `cellphone_user`,
 1 AS `metadata_user`,
 1 AS `is_system_user`,
 1 AS `id_carrier`,
 1 AS `name_carrier`,
 1 AS `code_carrier`,
 1 AS `key_carrier`,
 1 AS `base_carrier`,
 1 AS `is_system_carrier`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `capabilities_view`;
/*!50001 DROP VIEW IF EXISTS `capabilities_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `capabilities_view` AS SELECT 
 1 AS `id_capability`,
 1 AS `is_creator_capability`,
 1 AS `is_editor_capability`,
 1 AS `is_destroyer_capability`,
 1 AS `is_global_capability`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `parent_project`,
 1 AS `grandparent_project`,
 1 AS `id_level`,
 1 AS `name_level`,
 1 AS `is_successor_level`,
 1 AS `is_system_level`,
 1 AS `tables_level`,
 1 AS `schema_level`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `capability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `capability` (
  `id_capability` int(11) NOT NULL AUTO_INCREMENT,
  `id_project` int(11) NOT NULL COMMENT 'Project.',
  `id_level` int(11) NOT NULL COMMENT 'Level.',
  `is_creator_capability` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Creation privileges.',
  `is_editor_capability` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Edition privileges.',
  `is_destroyer_capability` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Removing privileges.',
  `is_global_capability` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Global privileges.',
  PRIMARY KEY (`id_capability`),
  UNIQUE KEY `id_project` (`id_project`,`id_level`),
  KEY `id_level` (`id_level`),
  CONSTRAINT `capability_ibfk_1` FOREIGN KEY (`id_level`) REFERENCES `level` (`id_level`),
  CONSTRAINT `capability_ibfk_2` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`)
) ENGINE=InnoDB AUTO_INCREMENT=503 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `carrier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `carrier` (
  `id_carrier` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_carrier` varchar(45) NOT NULL COMMENT 'Name.',
  `code_carrier` varchar(45) NOT NULL COMMENT 'Key.',
  `is_system_carrier` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Determine is the carrier is public.',
  `key_carrier` varchar(16) DEFAULT NULL COMMENT 'Identifier.',
  `base_carrier` int(11) NOT NULL DEFAULT '16' COMMENT 'Base.',
  PRIMARY KEY (`id_carrier`),
  UNIQUE KEY `name_carrier` (`name_carrier`),
  UNIQUE KEY `code_carrier` (`code_carrier`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `collaborator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `collaborator` (
  `id_collaborator` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `id_zone` int(11) NOT NULL COMMENT 'ID of the zone.',
  `id_user` int(11) DEFAULT NULL COMMENT 'ID of the user.',
  PRIMARY KEY (`id_collaborator`),
  KEY `fk_collaborator_user1_idx` (`id_user`),
  KEY `fk_collaborator_zone1_idx` (`id_zone`),
  CONSTRAINT `collaborator_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `collaborator_ibfk_2` FOREIGN KEY (`id_zone`) REFERENCES `zone` (`id_zone`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8 COMMENT='List of user associated to zones.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `collaborators_view`;
/*!50001 DROP VIEW IF EXISTS `collaborators_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `collaborators_view` AS SELECT 
 1 AS `id_user`,
 1 AS `account_user`,
 1 AS `first_name_user`,
 1 AS `last_name_user`,
 1 AS `email_user`,
 1 AS `cellphone_user`,
 1 AS `id_zone`,
 1 AS `name_zone`,
 1 AS `polygon_zone`,
 1 AS `color_zone`,
 1 AS `id_member`,
 1 AS `id_owner`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `event` (
  `id_event` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `start_date_event` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_date_event` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `interval_event` bigint(21) NOT NULL COMMENT 'Interval of time between messages.',
  `is_monday_event` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if event should be triggered on Mondays (according client timezone).',
  `is_tuesday_event` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if event should be triggered on Thuesdays (according client timezone).',
  `is_wednesday_event` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if event should be triggered on Wednesdays (according client timezone).',
  `is_thursday_event` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if event should be triggered on Thursdays (according client timezone).',
  `is_friday_event` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if event should be triggered on Fridays (according client timezone).',
  `is_saturday_event` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if event should be triggered on Saturdays (according client timezone).',
  `is_sunday_event` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if event should be triggered on Sundays (according client timezone).',
  `id_item` int(11) NOT NULL COMMENT 'ID of event emmiter item.',
  `control_event` text NOT NULL COMMENT 'The message to be sended to th device.',
  `is_repeat_event` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Defines if event should be taken as iteration.',
  `is_forever_event` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Defines if event should be taken as an eternal iteration.',
  `timezone_event` int(2) NOT NULL DEFAULT '12' COMMENT 'Timezone of the event',
  PRIMARY KEY (`id_event`),
  KEY `fk_event_item1_idx` (`id_item`),
  CONSTRAINT `fk_event_item1` FOREIGN KEY (`id_item`) REFERENCES `item` (`id_item`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=178 DEFAULT CHARSET=utf8 COMMENT='Scheduled JSON messages to be sended to specific items.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feedback` (
  `id_feedback` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `date_feedback` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date.',
  `message_feedback` text NOT NULL COMMENT 'Contents of the feedback',
  `id_user` int(11) NOT NULL COMMENT 'Author of the feedback.',
  PRIMARY KEY (`id_feedback`),
  KEY `feedback_ibfk_1` (`id_user`),
  CONSTRAINT `feedback_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `item` (
  `id_item` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_item` varchar(255) NOT NULL COMMENT 'Human readable ID of item.',
  `mac_item` bigint(20) NOT NULL COMMENT 'Sensum serial number of Item.',
  `id_asset` int(11) NOT NULL COMMENT 'ID of software treatment group for data received from this item.',
  `latitude_item` decimal(10,7) NOT NULL DEFAULT '0.0000000' COMMENT 'Initial latitude of item.',
  `longitude_item` decimal(10,7) NOT NULL DEFAULT '0.0000000' COMMENT 'Initial longitude of item.',
  `schema_item` text COMMENT 'Customization of asset.',
  `id_timezone` int(11) NOT NULL DEFAULT '340' COMMENT 'TZ database timezone.',
  `hash_item` varchar(255) DEFAULT NULL COMMENT 'Device password.',
  `id_member` int(11) NOT NULL DEFAULT '1' COMMENT 'The owner of the device.',
  `is_motion_item` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Defines is the device is attached to a vehicle.',
  `key_item` varchar(255) DEFAULT NULL COMMENT 'DevEUI, DevAddress or ID Sigfox',
  `id_carrier` int(11) NOT NULL DEFAULT '1' COMMENT 'Carrier.',
  `parent_item` int(11) DEFAULT NULL COMMENT 'Data host item.',
  PRIMARY KEY (`id_item`),
  UNIQUE KEY `mac_item` (`mac_item`),
  UNIQUE KEY `hash_item` (`hash_item`),
  UNIQUE KEY `key_item` (`key_item`,`id_carrier`),
  KEY `fk_item_asset1_idx` (`id_asset`),
  KEY `id_member` (`id_member`),
  KEY `id_timezone` (`id_timezone`),
  KEY `id_carrier` (`id_carrier`),
  KEY `parent_item` (`parent_item`),
  CONSTRAINT `item_ibfk_3` FOREIGN KEY (`id_asset`) REFERENCES `asset` (`id_asset`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `item_ibfk_4` FOREIGN KEY (`id_member`) REFERENCES `member` (`id_member`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `item_ibfk_6` FOREIGN KEY (`id_timezone`) REFERENCES `timezone` (`id_timezone`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `item_ibfk_7` FOREIGN KEY (`id_carrier`) REFERENCES `carrier` (`id_carrier`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `item_ibfk_8` FOREIGN KEY (`parent_item`) REFERENCES `item` (`id_item`)
) ENGINE=InnoDB AUTO_INCREMENT=411 DEFAULT CHARSET=utf8 COMMENT='List of available physical devices.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `items_view`;
/*!50001 DROP VIEW IF EXISTS `items_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `items_view` AS SELECT 
 1 AS `id_item`,
 1 AS `name_item`,
 1 AS `mac_item`,
 1 AS `key_item`,
 1 AS `latitude_item`,
 1 AS `longitude_item`,
 1 AS `schema_item`,
 1 AS `hash_item`,
 1 AS `is_motion_item`,
 1 AS `id_asset`,
 1 AS `name_asset`,
 1 AS `schema_asset`,
 1 AS `manufacturer_asset`,
 1 AS `model_asset`,
 1 AS `date_asset`,
 1 AS `id_carrier`,
 1 AS `name_carrier`,
 1 AS `code_carrier`,
 1 AS `key_carrier`,
 1 AS `base_carrier`,
 1 AS `is_system_carrier`,
 1 AS `zones_item`,
 1 AS `is_metadata_stock`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`,
 1 AS `id_member`,
 1 AS `id_user`,
 1 AS `mac_parent_item`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `level`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `level` (
  `id_level` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_level` varchar(255) NOT NULL COMMENT 'Human readable ID of level.',
  `is_system_level` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Defines is the level is reserved for system users.',
  `tables_level` text NOT NULL COMMENT 'List of db tables availables for this level.',
  `is_successor_level` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Indicates if subchildren can access to the level.',
  `schema_level` text COMMENT 'Configuration.',
  PRIMARY KEY (`id_level`),
  UNIQUE KEY `name_level_UNIQUE` (`name_level`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8 COMMENT='Hierarchy groups of website privileges management.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `link` (
  `id_link` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_link` varchar(255) NOT NULL COMMENT 'Label of the link.',
  `icon_link` varchar(255) NOT NULL DEFAULT 'chain' COMMENT 'Name of font-awesome icon to be placed aside to label.',
  `url_link` varchar(255) NOT NULL COMMENT 'URL to be displayed.',
  `id_project` int(11) DEFAULT NULL COMMENT 'ID of project associated to this link.',
  `id_level` int(11) NOT NULL COMMENT 'ID of level of privileges required to see the link.',
  PRIMARY KEY (`id_link`),
  KEY `fk_link_project1_idx` (`id_project`),
  KEY `fk_link_level1_idx` (`id_level`),
  CONSTRAINT `fk_link_level1` FOREIGN KEY (`id_level`) REFERENCES `level` (`id_level`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_link_project1` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8 COMMENT='Available menus for each project for navigation along the application.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `links_view`;
/*!50001 DROP VIEW IF EXISTS `links_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `links_view` AS SELECT 
 1 AS `id_link`,
 1 AS `name_link`,
 1 AS `icon_link`,
 1 AS `url_link`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `list`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `list` (
  `id_list` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `name_list` varchar(255) NOT NULL COMMENT 'Familiar ID',
  `json_list` text NOT NULL COMMENT 'Contents of list in JSON Format.',
  PRIMARY KEY (`id_list`),
  UNIQUE KEY `name_list` (`name_list`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `member` (
  `id_member` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `id_user` int(11) NOT NULL COMMENT 'User',
  `id_project` int(11) NOT NULL COMMENT 'Project',
  `hash_member` varchar(255) DEFAULT NULL COMMENT 'API Key',
  PRIMARY KEY (`id_member`),
  UNIQUE KEY `id_user` (`id_user`,`id_project`),
  UNIQUE KEY `hash_member` (`hash_member`),
  KEY `id_project` (`id_project`),
  CONSTRAINT `member_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `member_ibfk_2` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=382 DEFAULT CHARSET=latin1 COMMENT='Users associated to projects.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `members_view`;
/*!50001 DROP VIEW IF EXISTS `members_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `members_view` AS SELECT 
 1 AS `id_member`,
 1 AS `hash_member`,
 1 AS `id_user`,
 1 AS `account_user`,
 1 AS `name_user`,
 1 AS `first_name_user`,
 1 AS `last_name_user`,
 1 AS `email_user`,
 1 AS `cellphone_user`,
 1 AS `metadata_user`,
 1 AS `is_system_user`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`,
 1 AS `zones_member`,
 1 AS `zones_collaborator`,
 1 AS `items_member`,
 1 AS `items_collaborator`,
 1 AS `id_parent_project`,
 1 AS `name_parent_project`,
 1 AS `url_parent_project`,
 1 AS `date_parent_project`,
 1 AS `home_parent_project`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `metadata` (
  `id_metadata` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `name_metadata` text NOT NULL COMMENT 'I18N JSON name of the metadata (commonly business name).',
  `schema_metadata` text NOT NULL COMMENT 'Structure of metadata.',
  `is_visible_metadata` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Defines is the metadata is geographic.',
  PRIMARY KEY (`id_metadata`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1 COMMENT='Defines the structure of Zone metadata.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `metadata_view`;
/*!50001 DROP VIEW IF EXISTS `metadata_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `metadata_view` AS SELECT 
 1 AS `id_metadata`,
 1 AS `name_metadata`,
 1 AS `is_visible_metadata`,
 1 AS `schema_metadata`,
 1 AS `assets_metadata`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `metastock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `metastock` (
  `id_metadata` int(11) NOT NULL COMMENT 'Id of metadata.',
  `id_asset` int(11) NOT NULL COMMENT 'Id of asset.',
  PRIMARY KEY (`id_metadata`,`id_asset`),
  KEY `id_asset` (`id_asset`),
  CONSTRAINT `metastock_ibfk_1` FOREIGN KEY (`id_metadata`) REFERENCES `metadata` (`id_metadata`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `metastock_ibfk_2` FOREIGN KEY (`id_asset`) REFERENCES `asset` (`id_asset`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='List of assets that include a metadata';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `metastocks_view`;
/*!50001 DROP VIEW IF EXISTS `metastocks_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `metastocks_view` AS SELECT 
 1 AS `id_metadata`,
 1 AS `name_metadata`,
 1 AS `is_visible_metadata`,
 1 AS `schema_metadata`,
 1 AS `id_asset`,
 1 AS `name_asset`,
 1 AS `schema_asset`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `module`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `module` (
  `id_module` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_module` varchar(255) NOT NULL COMMENT 'Name of angular module (not controller).',
  `configuration_module` longtext NOT NULL,
  PRIMARY KEY (`id_module`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8 COMMENT='List of angular module customizations for each project.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `network`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `network` (
  `id_network` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_network` varchar(255) NOT NULL COMMENT 'Display name.',
  `code_network` varchar(255) NOT NULL COMMENT 'Code name.',
  `schema_network` text NOT NULL COMMENT 'Message format.',
  `id_carrier` int(11) NOT NULL COMMENT 'Carrier.',
  PRIMARY KEY (`id_network`),
  UNIQUE KEY `name_network` (`name_network`),
  UNIQUE KEY `code_network` (`code_network`),
  KEY `id_carrier` (`id_carrier`),
  CONSTRAINT `network_ibfk_1` FOREIGN KEY (`id_carrier`) REFERENCES `carrier` (`id_carrier`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `privilege`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `privilege` (
  `id_privilege` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `id_member` int(11) NOT NULL COMMENT 'privileged member.',
  `id_level` int(11) NOT NULL COMMENT 'Type of privilege.',
  `is_creator_privilege` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Can create new records.',
  `is_editor_privilege` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Can edit records.',
  `is_destroyer_privilege` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Can delete records.',
  `is_global_privilege` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indicates if the user can access to all or owned entities.',
  PRIMARY KEY (`id_privilege`),
  UNIQUE KEY `id_member` (`id_member`,`id_level`,`is_creator_privilege`,`is_editor_privilege`,`is_destroyer_privilege`),
  KEY `id_level` (`id_level`),
  CONSTRAINT `privilege_ibfk_1` FOREIGN KEY (`id_member`) REFERENCES `member` (`id_member`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `privilege_ibfk_2` FOREIGN KEY (`id_level`) REFERENCES `level` (`id_level`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1086 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `privileges_view`;
/*!50001 DROP VIEW IF EXISTS `privileges_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `privileges_view` AS SELECT 
 1 AS `id_privilege`,
 1 AS `is_creator_privilege`,
 1 AS `is_editor_privilege`,
 1 AS `is_destroyer_privilege`,
 1 AS `is_global_privilege`,
 1 AS `id_member`,
 1 AS `id_user`,
 1 AS `first_name_user`,
 1 AS `email_user`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `id_level`,
 1 AS `name_level`,
 1 AS `is_successor_level`,
 1 AS `is_system_level`,
 1 AS `tables_level`,
 1 AS `schema_level`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project` (
  `id_project` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_project` varchar(255) NOT NULL COMMENT 'Name of project.',
  `url_project` varchar(225) NOT NULL COMMENT 'Entry point of application.',
  `date_project` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Start date of project.',
  `home_project` varchar(255) DEFAULT NULL COMMENT 'Relative URI of template for home page of project',
  `is_public_project` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Define if everybody can access to this project.',
  `schema_project` text COMMENT 'Configuration of project',
  `parent_project` int(11) DEFAULT NULL COMMENT 'ID of the reseller project.',
  PRIMARY KEY (`id_project`),
  UNIQUE KEY `name_project_UNIQUE` (`name_project`),
  UNIQUE KEY `url_project_UNIQUE` (`url_project`),
  KEY `parent_project` (`parent_project`),
  CONSTRAINT `project_ibfk_1` FOREIGN KEY (`parent_project`) REFERENCES `project` (`id_project`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8 COMMENT='List of software project per company.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `projects_view`;
/*!50001 DROP VIEW IF EXISTS `projects_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `projects_view` AS SELECT 
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`,
 1 AS `parent_project`,
 1 AS `grandparent_project`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `protocol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `protocol` (
  `id_protocol` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_protocol` varchar(255) NOT NULL COMMENT 'Alias.',
  `code_protocol` varchar(255) NOT NULL COMMENT 'Codename.',
  PRIMARY KEY (`id_protocol`),
  UNIQUE KEY `name_protocol` (`name_protocol`),
  UNIQUE KEY `code_protocol` (`code_protocol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `route`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `route` (
  `id_route` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `url_route` varchar(255) NOT NULL COMMENT 'Path of the route.',
  `controller_as_route` varchar(255) NOT NULL COMMENT 'Alias of controller associated to this route.',
  `template_url_route` varchar(255) NOT NULL COMMENT 'Where the view is hosted (don''t include: root folder, extension of file).',
  `id_module` int(11) NOT NULL COMMENT 'ID of module-controller that hosts this route.',
  `is_system_route` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Restrict the route access to system users.',
  `is_editor_route` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Define if the routes need edition privileges.',
  `is_creator_route` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Define if the routes need creation privileges.',
  `is_destroyer_route` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Define if the routes need destruction (yeah) privileges.',
  `id_project` int(11) DEFAULT NULL COMMENT 'Project.',
  `id_level` int(11) NOT NULL DEFAULT '1' COMMENT 'Type of user who can see this.',
  `template_route` longtext COMMENT 'JSON that contents the HTML format of page.',
  PRIMARY KEY (`id_route`),
  KEY `fk_route_module1_idx` (`id_module`),
  KEY `id_project` (`id_project`),
  KEY `id_level` (`id_level`),
  CONSTRAINT `fk_route_module1` FOREIGN KEY (`id_module`) REFERENCES `module` (`id_module`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `route_ibfk_1` FOREIGN KEY (`id_project`) REFERENCES `project` (`id_project`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `route_ibfk_2` FOREIGN KEY (`id_level`) REFERENCES `level` (`id_level`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8 COMMENT='List of angular routes.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `routes_view`;
/*!50001 DROP VIEW IF EXISTS `routes_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `routes_view` AS SELECT 
 1 AS `id_route`,
 1 AS `url_route`,
 1 AS `controller_as_route`,
 1 AS `template_url_route`,
 1 AS `id_module`,
 1 AS `name_module`,
 1 AS `configuration_module`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `server`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `server` (
  `id_server` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `address_server` varchar(255) NOT NULL COMMENT 'IP address, MQTT address or HTTP address of server.',
  `is_secure_server` tinyint(1) NOT NULL COMMENT 'Encrypted server.',
  `schema_server` text NOT NULL COMMENT 'Credentials and topics.',
  `id_network` int(11) NOT NULL COMMENT 'Network.',
  `id_protocol` int(11) NOT NULL COMMENT 'Protocol used.',
  PRIMARY KEY (`id_server`),
  KEY `id_network` (`id_network`),
  KEY `id_protocol` (`id_protocol`),
  CONSTRAINT `server_ibfk_1` FOREIGN KEY (`id_network`) REFERENCES `network` (`id_network`),
  CONSTRAINT `server_ibfk_2` FOREIGN KEY (`id_protocol`) REFERENCES `protocol` (`id_protocol`) ON DELETE NO ACTION ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `servers_view`;
/*!50001 DROP VIEW IF EXISTS `servers_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `servers_view` AS SELECT 
 1 AS `id_server`,
 1 AS `address_server`,
 1 AS `is_secure_server`,
 1 AS `schema_server`,
 1 AS `id_protocol`,
 1 AS `name_protocol`,
 1 AS `code_protocol`,
 1 AS `id_network`,
 1 AS `name_network`,
 1 AS `code_network`,
 1 AS `schema_network`,
 1 AS `id_carrier`,
 1 AS `name_carrier`,
 1 AS `code_carrier`,
 1 AS `base_carrier`,
 1 AS `is_system_carrier`,
 1 AS `key_carrier`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock` (
  `id_zone` int(11) NOT NULL COMMENT 'Zone ID.',
  `id_item` int(11) NOT NULL COMMENT 'Item ID.',
  `is_metadata_stock` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Defines if this item was associated by a zone.',
  `schema_stock` text COMMENT 'Connection data from device.',
  PRIMARY KEY (`id_zone`,`id_item`),
  KEY `id_item` (`id_item`),
  CONSTRAINT `stock_ibfk_2` FOREIGN KEY (`id_zone`) REFERENCES `zone` (`id_zone`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `stock_ibfk_3` FOREIGN KEY (`id_item`) REFERENCES `item` (`id_item`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stocks_view`;
/*!50001 DROP VIEW IF EXISTS `stocks_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `stocks_view` AS SELECT 
 1 AS `is_metadata_stock`,
 1 AS `id_item`,
 1 AS `name_item`,
 1 AS `mac_item`,
 1 AS `latitude_item`,
 1 AS `longitude_item`,
 1 AS `schema_item`,
 1 AS `hash_item`,
 1 AS `id_asset`,
 1 AS `name_asset`,
 1 AS `manufacturer_asset`,
 1 AS `model_asset`,
 1 AS `date_asset`,
 1 AS `schema_asset`,
 1 AS `zones_item`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `subscriptor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscriptor` (
  `id_user` int(11) NOT NULL COMMENT 'Subscriptor ID.',
  `id_item` int(11) NOT NULL COMMENT 'Device ID.',
  `is_email_subscriptor` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Allows to receive emails',
  `is_sms_subscriptor` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Allows to receive SMS',
  PRIMARY KEY (`id_user`,`id_item`),
  KEY `id_item` (`id_item`),
  CONSTRAINT `subscriptor_ibfk_1` FOREIGN KEY (`id_item`) REFERENCES `item` (`id_item`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `subscriptor_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subscriptors_view`;
/*!50001 DROP VIEW IF EXISTS `subscriptors_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `subscriptors_view` AS SELECT 
 1 AS `is_sms_subscriptor`,
 1 AS `is_email_subscriptor`,
 1 AS `id_user`,
 1 AS `account_user`,
 1 AS `first_name_user`,
 1 AS `last_name_user`,
 1 AS `email_user`,
 1 AS `cellphone_user`,
 1 AS `id_item`,
 1 AS `name_item`,
 1 AS `mac_item`,
 1 AS `latitude_item`,
 1 AS `longitude_item`,
 1 AS `schema_item`,
 1 AS `hash_item`,
 1 AS `id_asset`,
 1 AS `name_asset`,
 1 AS `manufacturer_asset`,
 1 AS `model_asset`,
 1 AS `date_asset`,
 1 AS `schema_asset`,
 1 AS `id_member`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `template` (
  `id_template` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_template` varchar(255) NOT NULL COMMENT 'Human-readabale alias for template.',
  `schema_template` text NOT NULL COMMENT 'Template format.',
  `is_system_template` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'Defines wheter the template is a Sensum Core Template.',
  `id_user` int(11) NOT NULL DEFAULT '1' COMMENT 'Owner of the template.',
  PRIMARY KEY (`id_template`),
  UNIQUE KEY `name_template` (`name_template`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `template_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `user` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `timezone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `timezone` (
  `id_timezone` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_timezone` varchar(255) NOT NULL COMMENT 'Name of Timezone in IANA tz database',
  `utc_timezone` varchar(6) NOT NULL COMMENT 'Standard Time UTC offset in hour and minutes',
  `utc_dst_timezone` varchar(6) NOT NULL COMMENT 'Daylight Saving Time UTC offset in hour and minutes',
  PRIMARY KEY (`id_timezone`)
) ENGINE=InnoDB AUTO_INCREMENT=375 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `id_user` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `account_user` varchar(45) NOT NULL COMMENT 'Username used to login.',
  `password_user` varchar(255) NOT NULL COMMENT 'Password used to login.',
  `email_user` varchar(45) NOT NULL COMMENT 'E-mail.',
  `first_name_user` varchar(45) DEFAULT 'Sensumian' COMMENT 'First name (or two names).',
  `last_name_user` varchar(45) DEFAULT 'Sensumian' COMMENT 'First name (or two names).',
  `cellphone_user` varchar(24) DEFAULT NULL COMMENT 'Cellphone of the user.',
  `metadata_user` text COMMENT 'Meta-data of user; custom fields.',
  `is_system_user` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Defines whether the user needs membership.',
  `date_user` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date user was created.',
  `is_verified_user` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Indicates if user e-mail was verified.',
  `hash_user` varchar(255) DEFAULT NULL COMMENT 'Verification hash.',
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `account_user_UNIQUE` (`account_user`),
  UNIQUE KEY `email_user_UNIQUE` (`email_user`)
) ENGINE=InnoDB AUTO_INCREMENT=294 DEFAULT CHARSET=utf8 COMMENT='List of application users.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users_view`;
/*!50001 DROP VIEW IF EXISTS `users_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `users_view` AS SELECT 
 1 AS `id_user`,
 1 AS `account_user`,
 1 AS `first_name_user`,
 1 AS `last_name_user`,
 1 AS `email_user`,
 1 AS `cellphone_user`,
 1 AS `metadata_user`,
 1 AS `is_system_user`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `webservices_view`;
/*!50001 DROP VIEW IF EXISTS `webservices_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `webservices_view` AS SELECT 
 1 AS `is_metadata_stock`,
 1 AS `schema_stock`,
 1 AS `id_zone`,
 1 AS `name_zone`,
 1 AS `metadata_zone`,
 1 AS `id_item`,
 1 AS `name_item`,
 1 AS `mac_item`,
 1 AS `key_item`,
 1 AS `latitude_item`,
 1 AS `longitude_item`,
 1 AS `schema_item`,
 1 AS `hash_item`,
 1 AS `id_asset`,
 1 AS `name_asset`,
 1 AS `manufacturer_asset`,
 1 AS `model_asset`,
 1 AS `date_asset`,
 1 AS `schema_asset`,
 1 AS `id_application`,
 1 AS `name_application`,
 1 AS `company_application`,
 1 AS `schema_application`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `zone`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `zone` (
  `id_zone` int(11) NOT NULL AUTO_INCREMENT COMMENT 'ID.',
  `name_zone` varchar(255) NOT NULL COMMENT 'Human readable ID of the zone.',
  `polygon_zone` longtext COMMENT 'GeoJSON boundary of the zone.',
  `color_zone` varchar(16) DEFAULT NULL COMMENT 'Color of the area of zone.',
  `parent_zone` int(11) DEFAULT NULL COMMENT 'ID of the parent zone.',
  `metadata_zone` longtext COMMENT 'Meta-data of zone. Different for each business.',
  `id_metadata` int(11) NOT NULL DEFAULT '1' COMMENT 'Structure of the metadata.',
  `id_member` int(11) NOT NULL DEFAULT '1' COMMENT 'The owner of the zone',
  `id_application` int(11) DEFAULT NULL COMMENT 'Indicates the external service',
  PRIMARY KEY (`id_zone`),
  KEY `parent_zone` (`parent_zone`),
  KEY `id_metadata` (`id_metadata`),
  KEY `id_member` (`id_member`),
  KEY `id_application` (`id_application`),
  CONSTRAINT `zone_ibfk_1` FOREIGN KEY (`parent_zone`) REFERENCES `zone` (`id_zone`),
  CONSTRAINT `zone_ibfk_2` FOREIGN KEY (`id_metadata`) REFERENCES `metadata` (`id_metadata`),
  CONSTRAINT `zone_ibfk_3` FOREIGN KEY (`id_member`) REFERENCES `member` (`id_member`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `zone_ibfk_4` FOREIGN KEY (`id_application`) REFERENCES `application` (`id_application`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8 COMMENT='List of physical areas separated per project where items can perform taks.';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `zones_view`;
/*!50001 DROP VIEW IF EXISTS `zones_view`*/;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
/*!50001 CREATE VIEW `zones_view` AS SELECT 
 1 AS `id_zone`,
 1 AS `name_zone`,
 1 AS `polygon_zone`,
 1 AS `color_zone`,
 1 AS `metadata_zone`,
 1 AS `parent_zone`,
 1 AS `id_metadata`,
 1 AS `name_metadata`,
 1 AS `is_visible_metadata`,
 1 AS `schema_metadata`,
 1 AS `id_application`,
 1 AS `name_application`,
 1 AS `company_application`,
 1 AS `schema_application`,
 1 AS `id_member`,
 1 AS `id_user`,
 1 AS `id_project`,
 1 AS `name_project`,
 1 AS `url_project`,
 1 AS `date_project`,
 1 AS `home_project`*/;
SET character_set_client = @saved_cs_client;

USE `sensum`;
/*!50001 DROP VIEW IF EXISTS `assets_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `assets_view` AS select `a`.`id_asset` AS `id_asset`,`a`.`name_asset` AS `name_asset`,`a`.`schema_asset` AS `schema_asset`,`a`.`manufacturer_asset` AS `manufacturer_asset`,`a`.`model_asset` AS `model_asset`,`a`.`date_asset` AS `date_asset`,`a`.`tags_asset` AS `tags_asset`,`a`.`is_trusted_asset` AS `is_trusted_asset`,`a`.`is_public_asset` AS `is_public_asset`,`u`.`id_user` AS `id_user`,`u`.`account_user` AS `account_user`,concat(`u`.`first_name_user`,' ',`u`.`last_name_user`) AS `name_user`,`u`.`first_name_user` AS `first_name_user`,`u`.`last_name_user` AS `last_name_user`,`u`.`email_user` AS `email_user`,`u`.`cellphone_user` AS `cellphone_user`,`u`.`metadata_user` AS `metadata_user`,`u`.`is_system_user` AS `is_system_user`,`c`.`id_carrier` AS `id_carrier`,`c`.`name_carrier` AS `name_carrier`,`c`.`code_carrier` AS `code_carrier`,`c`.`key_carrier` AS `key_carrier`,`c`.`base_carrier` AS `base_carrier`,`c`.`is_system_carrier` AS `is_system_carrier` from ((`asset` `a` join `user` `u` on((`u`.`id_user` = `a`.`id_user`))) join `carrier` `c` on((`c`.`id_carrier` = `a`.`id_carrier`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `capabilities_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `capabilities_view` AS select `c`.`id_capability` AS `id_capability`,`c`.`is_creator_capability` AS `is_creator_capability`,`c`.`is_editor_capability` AS `is_editor_capability`,`c`.`is_destroyer_capability` AS `is_destroyer_capability`,`c`.`is_global_capability` AS `is_global_capability`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`parent_project` AS `parent_project`,`q`.`parent_project` AS `grandparent_project`,`l`.`id_level` AS `id_level`,`l`.`name_level` AS `name_level`,`l`.`is_successor_level` AS `is_successor_level`,`l`.`is_system_level` AS `is_system_level`,`l`.`tables_level` AS `tables_level`,`l`.`schema_level` AS `schema_level` from (((`capability` `c` join `project` `p` on((`p`.`id_project` = `c`.`id_project`))) join `level` `l` on((`l`.`id_level` = `c`.`id_level`))) left join `project` `q` on((`q`.`id_project` = `p`.`parent_project`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `collaborators_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `collaborators_view` AS select `u`.`id_user` AS `id_user`,`u`.`account_user` AS `account_user`,`u`.`first_name_user` AS `first_name_user`,`u`.`last_name_user` AS `last_name_user`,`u`.`email_user` AS `email_user`,`u`.`cellphone_user` AS `cellphone_user`,`z`.`id_zone` AS `id_zone`,`z`.`name_zone` AS `name_zone`,`z`.`polygon_zone` AS `polygon_zone`,`z`.`color_zone` AS `color_zone`,`m`.`id_member` AS `id_member`,`m`.`id_user` AS `id_owner`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project` from ((((`collaborator` `k` join `user` `u` on((`u`.`id_user` = `k`.`id_user`))) join `zone` `z` on((`z`.`id_zone` = `k`.`id_zone`))) join `member` `m` on((`m`.`id_member` = `z`.`id_member`))) join `project` `p` on((`p`.`id_project` = `m`.`id_project`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `items_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `items_view` AS select `i`.`id_item` AS `id_item`,`i`.`name_item` AS `name_item`,`i`.`mac_item` AS `mac_item`,`i`.`key_item` AS `key_item`,`i`.`latitude_item` AS `latitude_item`,`i`.`longitude_item` AS `longitude_item`,`i`.`schema_item` AS `schema_item`,`i`.`hash_item` AS `hash_item`,`i`.`is_motion_item` AS `is_motion_item`,`a`.`id_asset` AS `id_asset`,`a`.`name_asset` AS `name_asset`,`a`.`schema_asset` AS `schema_asset`,`a`.`manufacturer_asset` AS `manufacturer_asset`,`a`.`model_asset` AS `model_asset`,`a`.`date_asset` AS `date_asset`,`c`.`id_carrier` AS `id_carrier`,`c`.`name_carrier` AS `name_carrier`,`c`.`code_carrier` AS `code_carrier`,`c`.`key_carrier` AS `key_carrier`,`c`.`base_carrier` AS `base_carrier`,`c`.`is_system_carrier` AS `is_system_carrier`,concat('[',group_concat(`s`.`id_zone` separator ','),']') AS `zones_item`,max(`s`.`is_metadata_stock`) AS `is_metadata_stock`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project`,`m`.`id_member` AS `id_member`,`u`.`id_user` AS `id_user`,`y`.`mac_item` AS `mac_parent_item` from (((((((`item` `i` join `asset` `a` on((`a`.`id_asset` = `i`.`id_asset`))) join `carrier` `c` on((`c`.`id_carrier` = `a`.`id_carrier`))) join `member` `m` on((`m`.`id_member` = `i`.`id_member`))) join `user` `u` on((`u`.`id_user` = `m`.`id_user`))) join `project` `p` on((`p`.`id_project` = `m`.`id_project`))) left join `stock` `s` on((`s`.`id_item` = `i`.`id_item`))) left join `item` `y` on((`y`.`id_item` = `i`.`parent_item`))) group by `i`.`id_item` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `links_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `links_view` AS select `l`.`id_link` AS `id_link`,`l`.`name_link` AS `name_link`,`l`.`icon_link` AS `icon_link`,`l`.`url_link` AS `url_link`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project` from (`link` `l` left join `project` `p` on((`p`.`id_project` = `l`.`id_project`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `members_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `members_view` AS select `m`.`id_member` AS `id_member`,`m`.`hash_member` AS `hash_member`,`u`.`id_user` AS `id_user`,`u`.`account_user` AS `account_user`,concat(`u`.`first_name_user`,' ',`u`.`last_name_user`) AS `name_user`,`u`.`first_name_user` AS `first_name_user`,`u`.`last_name_user` AS `last_name_user`,`u`.`email_user` AS `email_user`,`u`.`cellphone_user` AS `cellphone_user`,`u`.`metadata_user` AS `metadata_user`,`u`.`is_system_user` AS `is_system_user`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project`,concat('[',group_concat(distinct `z`.`id_zone` separator ','),']') AS `zones_member`,concat('[',group_concat(distinct `c`.`id_zone` separator ','),']') AS `zones_collaborator`,concat('[',group_concat(distinct `i`.`id_item` separator ','),']') AS `items_member`,concat('[',group_concat(distinct `s`.`id_item` separator ','),']') AS `items_collaborator`,`x`.`id_project` AS `id_parent_project`,`x`.`name_project` AS `name_parent_project`,`x`.`url_project` AS `url_parent_project`,`x`.`date_project` AS `date_parent_project`,`x`.`home_project` AS `home_parent_project` from (((((((`member` `m` join `user` `u` on((`u`.`id_user` = `m`.`id_user`))) join `project` `p` on((`p`.`id_project` = `m`.`id_project`))) left join `zone` `z` on((`z`.`id_member` = `m`.`id_member`))) left join `item` `i` on((`i`.`id_member` = `m`.`id_member`))) left join `collaborator` `c` on((`c`.`id_user` = `m`.`id_user`))) left join `stock` `s` on((`s`.`id_zone` = `c`.`id_zone`))) left join `project` `x` on((`x`.`id_project` = `p`.`parent_project`))) group by `m`.`id_member` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `metadata_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `metadata_view` AS select `m`.`id_metadata` AS `id_metadata`,`m`.`name_metadata` AS `name_metadata`,`m`.`is_visible_metadata` AS `is_visible_metadata`,`m`.`schema_metadata` AS `schema_metadata`,concat('[',group_concat(`a`.`schema_asset` separator ','),']') AS `assets_metadata` from ((`metadata` `m` left join `metastock` `x` on((`x`.`id_metadata` = `m`.`id_metadata`))) left join `asset` `a` on((`a`.`id_asset` = `x`.`id_asset`))) group by `m`.`id_metadata` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `metastocks_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `metastocks_view` AS select `m`.`id_metadata` AS `id_metadata`,`m`.`name_metadata` AS `name_metadata`,`m`.`is_visible_metadata` AS `is_visible_metadata`,`m`.`schema_metadata` AS `schema_metadata`,`a`.`id_asset` AS `id_asset`,`a`.`name_asset` AS `name_asset`,`a`.`schema_asset` AS `schema_asset` from ((`metastock` `x` join `metadata` `m` on((`m`.`id_metadata` = `x`.`id_metadata`))) join `asset` `a` on((`a`.`id_asset` = `x`.`id_asset`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `privileges_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `privileges_view` AS select `p`.`id_privilege` AS `id_privilege`,`p`.`is_creator_privilege` AS `is_creator_privilege`,`p`.`is_editor_privilege` AS `is_editor_privilege`,`p`.`is_destroyer_privilege` AS `is_destroyer_privilege`,`p`.`is_global_privilege` AS `is_global_privilege`,`m`.`id_member` AS `id_member`,`u`.`id_user` AS `id_user`,`u`.`first_name_user` AS `first_name_user`,`u`.`email_user` AS `email_user`,`g`.`id_project` AS `id_project`,`g`.`name_project` AS `name_project`,`g`.`url_project` AS `url_project`,`l`.`id_level` AS `id_level`,`l`.`name_level` AS `name_level`,`l`.`is_successor_level` AS `is_successor_level`,`l`.`is_system_level` AS `is_system_level`,`l`.`tables_level` AS `tables_level`,`l`.`schema_level` AS `schema_level` from ((((`privilege` `p` join `member` `m` on((`m`.`id_member` = `p`.`id_member`))) join `project` `g` on((`g`.`id_project` = `m`.`id_project`))) join `user` `u` on((`u`.`id_user` = `m`.`id_user`))) join `level` `l` on((`l`.`id_level` = `p`.`id_level`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `projects_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `projects_view` AS select `p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project`,`p`.`parent_project` AS `parent_project`,`q`.`parent_project` AS `grandparent_project` from (`project` `p` left join `project` `q` on((`q`.`id_project` = `p`.`parent_project`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `routes_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `routes_view` AS select `r`.`id_route` AS `id_route`,`r`.`url_route` AS `url_route`,`r`.`controller_as_route` AS `controller_as_route`,`r`.`template_url_route` AS `template_url_route`,`m`.`id_module` AS `id_module`,`m`.`name_module` AS `name_module`,`m`.`configuration_module` AS `configuration_module`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project` from ((`route` `r` join `module` `m` on((`m`.`id_module` = `r`.`id_module`))) left join `project` `p` on((`p`.`id_project` = `r`.`id_project`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `servers_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `servers_view` AS select `s`.`id_server` AS `id_server`,`s`.`address_server` AS `address_server`,`s`.`is_secure_server` AS `is_secure_server`,`s`.`schema_server` AS `schema_server`,`p`.`id_protocol` AS `id_protocol`,`p`.`name_protocol` AS `name_protocol`,`p`.`code_protocol` AS `code_protocol`,`n`.`id_network` AS `id_network`,`n`.`name_network` AS `name_network`,`n`.`code_network` AS `code_network`,`n`.`schema_network` AS `schema_network`,`c`.`id_carrier` AS `id_carrier`,`c`.`name_carrier` AS `name_carrier`,`c`.`code_carrier` AS `code_carrier`,`c`.`base_carrier` AS `base_carrier`,`c`.`is_system_carrier` AS `is_system_carrier`,`c`.`key_carrier` AS `key_carrier` from (((`server` `s` join `protocol` `p` on((`p`.`id_protocol` = `s`.`id_protocol`))) join `network` `n` on((`n`.`id_network` = `s`.`id_network`))) join `carrier` `c` on((`c`.`id_carrier` = `n`.`id_carrier`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `stocks_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `stocks_view` AS select `s`.`is_metadata_stock` AS `is_metadata_stock`,`i`.`id_item` AS `id_item`,`i`.`name_item` AS `name_item`,`i`.`mac_item` AS `mac_item`,`i`.`latitude_item` AS `latitude_item`,`i`.`longitude_item` AS `longitude_item`,`i`.`schema_item` AS `schema_item`,`i`.`hash_item` AS `hash_item`,`a`.`id_asset` AS `id_asset`,`a`.`name_asset` AS `name_asset`,`a`.`manufacturer_asset` AS `manufacturer_asset`,`a`.`model_asset` AS `model_asset`,`a`.`date_asset` AS `date_asset`,`a`.`schema_asset` AS `schema_asset`,concat('[',group_concat(`s`.`id_zone` separator ','),']') AS `zones_item`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project` from ((((`stock` `s` join `item` `i` on((`i`.`id_item` = `s`.`id_item`))) join `asset` `a` on((`a`.`id_asset` = `i`.`id_asset`))) join `member` `m` on((`m`.`id_member` = `i`.`id_member`))) join `project` `p` on((`p`.`id_project` = `m`.`id_project`))) group by `i`.`id_item` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `subscriptors_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `subscriptors_view` AS select `s`.`is_sms_subscriptor` AS `is_sms_subscriptor`,`s`.`is_email_subscriptor` AS `is_email_subscriptor`,`u`.`id_user` AS `id_user`,`u`.`account_user` AS `account_user`,`u`.`first_name_user` AS `first_name_user`,`u`.`last_name_user` AS `last_name_user`,`u`.`email_user` AS `email_user`,`u`.`cellphone_user` AS `cellphone_user`,`i`.`id_item` AS `id_item`,`i`.`name_item` AS `name_item`,`i`.`mac_item` AS `mac_item`,`i`.`latitude_item` AS `latitude_item`,`i`.`longitude_item` AS `longitude_item`,`i`.`schema_item` AS `schema_item`,`i`.`hash_item` AS `hash_item`,`a`.`id_asset` AS `id_asset`,`a`.`name_asset` AS `name_asset`,`a`.`manufacturer_asset` AS `manufacturer_asset`,`a`.`model_asset` AS `model_asset`,`a`.`date_asset` AS `date_asset`,`a`.`schema_asset` AS `schema_asset`,`m`.`id_member` AS `id_member`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project` from (((((`subscriptor` `s` join `user` `u` on((`u`.`id_user` = `s`.`id_user`))) join `item` `i` on((`i`.`id_item` = `s`.`id_item`))) join `member` `m` on((`m`.`id_member` = `i`.`id_member`))) join `project` `p` on((`p`.`id_project` = `m`.`id_project`))) join `asset` `a` on((`a`.`id_asset` = `i`.`id_asset`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `users_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `users_view` AS select `u`.`id_user` AS `id_user`,`u`.`account_user` AS `account_user`,`u`.`first_name_user` AS `first_name_user`,`u`.`last_name_user` AS `last_name_user`,`u`.`email_user` AS `email_user`,`u`.`cellphone_user` AS `cellphone_user`,`u`.`metadata_user` AS `metadata_user`,`u`.`is_system_user` AS `is_system_user` from `user` `u` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `webservices_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `webservices_view` AS select `s`.`is_metadata_stock` AS `is_metadata_stock`,`s`.`schema_stock` AS `schema_stock`,`z`.`id_zone` AS `id_zone`,`z`.`name_zone` AS `name_zone`,`z`.`metadata_zone` AS `metadata_zone`,`i`.`id_item` AS `id_item`,`i`.`name_item` AS `name_item`,`i`.`mac_item` AS `mac_item`,`i`.`key_item` AS `key_item`,`i`.`latitude_item` AS `latitude_item`,`i`.`longitude_item` AS `longitude_item`,`i`.`schema_item` AS `schema_item`,`i`.`hash_item` AS `hash_item`,`a`.`id_asset` AS `id_asset`,`a`.`name_asset` AS `name_asset`,`a`.`manufacturer_asset` AS `manufacturer_asset`,`a`.`model_asset` AS `model_asset`,`a`.`date_asset` AS `date_asset`,`a`.`schema_asset` AS `schema_asset`,`x`.`id_application` AS `id_application`,`x`.`name_application` AS `name_application`,`x`.`company_application` AS `company_application`,`x`.`schema_application` AS `schema_application` from ((((`stock` `s` join `zone` `z` on((`z`.`id_zone` = `s`.`id_zone`))) join `application` `x` on((`x`.`id_application` = `z`.`id_application`))) join `item` `i` on((`i`.`id_item` = `s`.`id_item`))) join `asset` `a` on((`a`.`id_asset` = `i`.`id_asset`))) where (`z`.`id_application` is not null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `zones_view`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8 */;
/*!50001 SET character_set_results     = utf8 */;
/*!50001 SET collation_connection      = utf8_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`sensum`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `zones_view` AS select `z`.`id_zone` AS `id_zone`,`z`.`name_zone` AS `name_zone`,`z`.`polygon_zone` AS `polygon_zone`,`z`.`color_zone` AS `color_zone`,`z`.`metadata_zone` AS `metadata_zone`,`z`.`parent_zone` AS `parent_zone`,`m`.`id_metadata` AS `id_metadata`,`m`.`name_metadata` AS `name_metadata`,`m`.`is_visible_metadata` AS `is_visible_metadata`,`m`.`schema_metadata` AS `schema_metadata`,`a`.`id_application` AS `id_application`,`a`.`name_application` AS `name_application`,`a`.`company_application` AS `company_application`,`a`.`schema_application` AS `schema_application`,`x`.`id_member` AS `id_member`,`u`.`id_user` AS `id_user`,`p`.`id_project` AS `id_project`,`p`.`name_project` AS `name_project`,`p`.`url_project` AS `url_project`,`p`.`date_project` AS `date_project`,`p`.`home_project` AS `home_project` from (((((`zone` `z` join `member` `x` on((`x`.`id_member` = `z`.`id_member`))) join `user` `u` on((`u`.`id_user` = `x`.`id_user`))) join `metadata` `m` on((`m`.`id_metadata` = `z`.`id_metadata`))) join `project` `p` on((`p`.`id_project` = `x`.`id_project`))) left join `application` `a` on((`a`.`id_application` = `z`.`id_application`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

