-- PostgreSQL requires explicit casts when assigning text literals to the HealthGoalStatus enum.
-- This repair migration is intentionally a no-op for databases where the prior
-- migration has already been applied; the source migration itself must be fixed
-- so fresh shadow databases can replay the migration chain cleanly.

SELECT 1;
