
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
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS before_insert_capability */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sensum`@`localhost`*/ /*!50003 TRIGGER before_insert_capability BEFORE INSERT ON capability
FOR EACH ROW
BEGIN
	SET @id_parent = (
		SELECT parent_project FROM project WHERE id_project = NEW.id_project)
	;
	IF @id_parent IS NOT NULL THEN
		SET @creator = (
			SELECT is_creator_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		SET @editor = ( 
			SELECT is_editor_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		SET @destroyer = (
			SELECT is_destroyer_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		SET @global = (
			SELECT is_global_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		SET @capability = (
			SELECT id_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		IF @capability IS NULL THEN
			SET NEW.id_project = NULL;
			SET NEW.id_level = null;
		ELSE
			SET NEW.is_creator_capability = NEW.is_creator_capability*@creator;
			SET NEW.is_editor_capability = NEW.is_editor_capability*@editor;
			SET NEW.is_destroyer_capability = NEW.is_destroyer_capability*@destroyer;
			SET NEW.is_global_capability = NEW.is_global_capability*@global;
		END IF;
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS before_update_capability */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sensum`@`localhost`*/ /*!50003 TRIGGER before_update_capability BEFORE UPDATE ON capability
FOR EACH ROW
BEGIN
	SET @id_parent = (
		SELECT parent_project FROM project WHERE id_project = NEW.id_project
	);
	IF @id_parent IS NOT NULL THEN
		SET @creator = (
			SELECT is_creator_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		SET @editor = (
			SELECT is_editor_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		SET @destroyer = (
			SELECT is_destroyer_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		SET @global = (
			SELECT is_global_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		SET @capability = (
			SELECT id_capability FROM capability 
			WHERE id_project = @id_parent AND id_level = NEW.id_level
		);
		IF @capability IS NOT NULL THEN
			SET NEW.is_creator_capability = NEW.is_creator_capability*@creator;
			SET NEW.is_editor_capability = NEW.is_editor_capability*@editor;
			SET NEW.is_destroyer_capability = NEW.is_destroyer_capability*@destroyer;
			SET NEW.is_global_capability = NEW.is_global_capability*@global;
		END IF;
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS after_update_capability */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sensum`@`localhost`*/ /*!50003 TRIGGER after_update_capability AFTER UPDATE ON capability
FOR EACH ROW
BEGIN
	UPDATE privilege 
	SET id_level = NEW.id_level 
	WHERE id_member IN (
		SELECT id_member 
		FROM member 
		WHERE id_project IN (
			SELECT id_project 
			FROM project 
			WHERE id_project = NEW.id_project OR parent_project = NEW.id_project
		)
	)
	AND id_level = NEW.id_level
	;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS after_delete_capability */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sensum`@`localhost`*/ /*!50003 TRIGGER after_delete_capability AFTER DELETE ON capability
FOR EACH ROW
BEGIN
	DELETE FROM privilege 
	WHERE 
	id_level NOT IN (
		SELECT id_level FROM capability WHERE id_project = OLD.id_project
	) 
	AND id_member IN (
		SELECT id_member FROM member WHERE id_project IN (
			SELECT id_project 
			FROM project 
			WHERE id_project = OLD.id_project OR parent_project = OLD.id_project
		) 
	)
	;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS before_insert_item */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sensum`@`localhost`*/ /*!50003 TRIGGER before_insert_item BEFORE INSERT ON item
	FOR EACH ROW
		BEGIN
			IF NEW.hash_item IS NULL THEN 
				SET @hash = (
					SELECT MD5(RAND()+UNIX_TIMESTAMP())
				);
				SET NEW.hash_item = @hash; 
			END IF;
			IF NEW.mac_item IS NULL THEN 
				SET @mac = (SELECT FLOOR(1 + RAND() * 100000000 ) FROM DUAL);
				SET NEW.mac_item = @mac; 
			END IF;
		END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS before_update_item */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sensum`@`localhost`*/ /*!50003 TRIGGER before_update_item BEFORE UPDATE ON item
	FOR EACH ROW
		BEGIN
			IF NEW.hash_item IS NULL THEN 
				SET @hash = (
					SELECT MD5(RAND()+UNIX_TIMESTAMP())
				);
				SET NEW.hash_item = @hash; 
			END IF;
		END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS before_insert_privilege */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sensum`@`localhost`*/ /*!50003 TRIGGER before_insert_privilege BEFORE INSERT ON privilege
FOR EACH ROW
BEGIN
	SET @id_project = (
		SELECT id_project FROM member WHERE id_member = NEW.id_member
	);
	SET @creator = (
		SELECT is_creator_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	SET @editor = (
		SELECT is_editor_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	SET @destroyer = (
		SELECT is_destroyer_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	SET @global = (
		SELECT is_global_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	SET @capability = (
		SELECT id_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	IF @capability IS NULL THEN
		SET NEW.id_member = NULL;
		SET NEW.id_level = NULL;
	ELSE
		SET NEW.is_creator_privilege = NEW.is_creator_privilege*@creator;
		SET NEW.is_editor_privilege = NEW.is_editor_privilege*@editor;
		SET NEW.is_destroyer_privilege = NEW.is_destroyer_privilege*@destroyer;
		SET NEW.is_global_privilege = NEW.is_global_privilege*@global;
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8 */ ;
/*!50003 SET character_set_results = utf8 */ ;
/*!50003 SET collation_connection  = utf8_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION' */ ;
/*!50032 DROP TRIGGER IF EXISTS before_update_privilege */;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`sensum`@`localhost`*/ /*!50003 TRIGGER before_update_privilege BEFORE UPDATE ON privilege
FOR EACH ROW
BEGIN
	SET @id_project = (
		SELECT id_project FROM member WHERE id_member = NEW.id_member
	);
	SET @creator = (
		SELECT is_creator_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	SET @editor = (
		SELECT is_editor_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	SET @destroyer = (
		SELECT is_destroyer_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	SET @global = (
		SELECT is_global_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	SET @capability = (
		SELECT id_capability FROM capability 
		WHERE id_project = @id_project AND id_level = NEW.id_level
	);
	IF @capability IS NOT NULL THEN
		SET NEW.is_creator_privilege = NEW.is_creator_privilege*@creator;
		SET NEW.is_editor_privilege = NEW.is_editor_privilege*@editor;
		SET NEW.is_destroyer_privilege = NEW.is_destroyer_privilege*@destroyer;
		SET NEW.is_global_privilege = NEW.is_global_privilege*@global;
	END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

