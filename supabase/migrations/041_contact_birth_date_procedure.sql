-- ============================================================
-- 041_contact_birth_date_procedure
--
-- Adds optional dermatology-specific contact details. DATE stores a
-- birthday without timezone shifts; procedure_details intentionally
-- remains free text because a contact may have a performed procedure,
-- a quoted procedure, or both in the same short description.
--
-- Idempotent — safe to re-run.
-- ============================================================

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS procedure_details TEXT;

COMMENT ON COLUMN contacts.birth_date IS
  'Optional contact date of birth. Stored as a calendar date without timezone.';

COMMENT ON COLUMN contacts.procedure_details IS
  'Optional description of the procedure performed or quoted for the contact.';
