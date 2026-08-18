DROP TRIGGER IF EXISTS project_after_insert;
DROP TRIGGER IF EXISTS before_insert_capability;
DROP TRIGGER IF EXISTS after_insert_capability;
DROP TRIGGER IF EXISTS before_update_capability;
DROP TRIGGER IF EXISTS after_update_capability;
DROP TRIGGER IF EXISTS before_delete_capability;
DROP TRIGGER IF EXISTS after_delete_capability;
DROP TRIGGER IF EXISTS before_insert_privilege;
DROP TRIGGER IF EXISTS before_update_privilege;
DELIMITER //
CREATE TRIGGER before_insert_capability BEFORE INSERT ON capability
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
END; //
DELIMITER ;
DELIMITER //
CREATE TRIGGER before_update_capability BEFORE UPDATE ON capability
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
END; //
DELIMITER ;
/***
AFTER DELETE
***/
DELIMITER //
CREATE TRIGGER after_delete_capability AFTER DELETE ON capability
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
END; //
DELIMITER ;
/***
AFTER UPDATE
***/
DELIMITER //
CREATE TRIGGER after_update_capability AFTER UPDATE ON capability
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
END; //
DELIMITER ;
DELIMITER //
CREATE TRIGGER before_update_privilege BEFORE UPDATE ON privilege
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
END; //
DELIMITER ;
DELIMITER //
CREATE TRIGGER before_insert_privilege BEFORE INSERT ON privilege
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
END; //
DELIMITER ;
