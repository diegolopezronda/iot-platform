/*
ALTER TABLE project ADD COLUMN parent_project INT DEFAULT NULL COMMENT "ID of the reseller project.";
*/
ALTER TABLE project ADD CONSTRAINT FOREIGN KEY (parent_project) REFERENCES project (id_project) ON UPDATE CASCADE ON DELETE SET NULL;
