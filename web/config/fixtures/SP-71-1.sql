DROP TABLE IF EXISTS member;
CREATE TABLE IF NOT EXISTS member (
	id_member INT NOT NULL PRIMARY KEY AUTO_INCREMENT COMMENT 'ID.',
	id_user INT NOT NULL COMMENT 'User',
	id_project INT NOT NULL COMMENT 'Project',
	hash_member VARCHAR(255) DEFAULT NULL UNIQUE KEY COMMENT 'API Key',
	UNIQUE KEY (id_user,id_project)
) COMMENT='Users associated to projects.';
ALTER TABLE member ADD FOREIGN KEY (id_user) REFERENCES user(id_user) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE member ADD FOREIGN KEY (id_project) REFERENCES project(id_project) ON UPDATE CASCADE ON DELETE CASCADE;
INSERT INTO member (id_user,id_project,hash_member) SELECT id_user,id_project,MD5(CONCAT(NOW(),id_user,id_project)) FROM collaborators_view AS c ON DUPLICATE KEY UPDATE id_user = c.id_user;
