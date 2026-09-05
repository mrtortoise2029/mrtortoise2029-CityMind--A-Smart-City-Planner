USE citymind;

-- Legacy projects predate authentication. Assign them to the oldest active planner
-- before making ownership mandatory. This migration intentionally fails if no user
-- exists, because an ownerless private planning project must not be exposed.
UPDATE planning_projects p
JOIN (SELECT MIN(id) AS id FROM users WHERE is_active = TRUE) owner ON owner.id IS NOT NULL
SET p.owner_user_id = owner.id
WHERE p.owner_user_id IS NULL;

ALTER TABLE planning_projects
  DROP FOREIGN KEY fk_planning_project_owner,
  MODIFY COLUMN owner_user_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_planning_project_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE RESTRICT;
