/*
ALTER TABLE user MODIFY id_company INT DEFAULT NULL COMMENT "Company.";
DROP TABLE IF EXISTS privilege;
CREATE TABLE privilege (
	id_privilege INT NOT NULL PRIMARY KEY AUTO_INCREMENT COMMENT "ID.",
	id_member INT NOT NULL  COMMENT "privileged member.",
	id_level INT NOT NULL COMMENT "Type of privilege.",
	is_creator_privilege TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Can create new records.",
	is_editor_privilege TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Can edit records.",
	is_destroyer_privilege TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Can delete records.",
	is_global_privilege TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Indicates if the user can access to all or owned entities.",
	UNIQUE KEY(id_member,id_level,is_creator_privilege,is_editor_privilege,is_destroyer_privilege)
);
ALTER TABLE privilege ADD CONSTRAINT FOREIGN KEY (id_member) REFERENCES member(id_member) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE privilege ADD CONSTRAINT FOREIGN KEY (id_level) REFERENCES level(id_level) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE level ADD COLUMN is_system_level TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Defines is the level is reserved for system users.";
ALTER TABLE level ADD COLUMN tables_level TEXT NOT NULL COMMENT "List of db tables availables for this level.";
ALTER TABLE route ADD COLUMN id_level INT NOT NULL DEFAULT 1 COMMENT "Type of user who can see this.";
ALTER TABLE route ADD CONSTRAINT FOREIGN KEY (id_level) REFERENCES level(id_level) ON UPDATE CASCADE ON DELETE NO ACTION;
ALTER TABLE zone ADD COLUMN id_member INT NOT NULL DEFAULT 1 COMMENT 'The owner of the zone';
ALTER TABLE zone ADD CONSTRAINT FOREIGN KEY (id_member) REFERENCES member(id_member) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE collaborator ADD COLUMN id_member INT NOT NULL COMMENT "Collaborator ID.";
*/
ALTER TABLE collaborator MODIFY id_member INT DEFAULT NULL COMMENT "Collaborator ID.";
ALTER TABLE collaborator ADD CONSTRAINT FOREIGN KEY (id_member) REFERENCES member(id_member) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE collaborator MODIFY id_user int(11) DEFAULT NULL COMMENT 'ID of the user.';
ALTER TABLE asset ADD COLUMN tags_asset TEXT DEFAULT NULL COMMENT "tags.";
