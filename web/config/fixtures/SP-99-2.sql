ALTER TABLE capability ADD COLUMN id_project INT NOT NULL COMMENT "Project.";
ALTER TABLE capability ADD COLUMN id_level INT NOT NULL COMMENT "Level.";
ALTER TABLE capability ADD COLUMN is_creator_capability TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Creation privileges.";
ALTER TABLE capability ADD COLUMN is_editor_capability TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Edition privileges.";
ALTER TABLE capability ADD COLUMN is_destroyer_capability TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Removing privileges.";
ALTER TABLE capability ADD COLUMN is_global_capability TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Global privileges.";
ALTER TABLE capability ADD UNIQUE (id_project,id_level);
ALTER TABLE capability ADD FOREIGN KEY (id_level) REFERENCES level(id_level); 
ALTER TABLE capability ADD FOREIGN KEY (id_project) REFERENCES project(id_project); 
