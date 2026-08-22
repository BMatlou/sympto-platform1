"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { healthJournalService } from "@/services/health-journal.service";

import type {
  CreateHealthJournalDto,
  HealthJournal,
} from "@/types/health-journal";

export function useHealthJournal() {
  const [entries, setEntries] = useState<
    HealthJournal[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const loadEntries = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);

        const result =
          await healthJournalService.getAll();

        setEntries(result.data);
      } catch (error) {
        console.error(
          "Failed to load health journals:",
          error,
        );

        setError(
          "Failed to load your health journal.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const createEntry = useCallback(
    async (
      dto: CreateHealthJournalDto,
    ) => {
      try {
        setSaving(true);
        setError(null);

        const entry =
          await healthJournalService.create(dto);

        setEntries((current) => [
          entry,
          ...current,
        ]);

        return entry;
      } catch (error) {
        console.error(
          "Failed to create health journal:",
          error,
        );

        setError(
          "Failed to save your journal entry.",
        );

        throw error;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      dto: Partial<CreateHealthJournalDto>,
    ) => {
      try {
        setSaving(true);
        setError(null);

        const updatedEntry =
          await healthJournalService.update(
            id,
            dto,
          );

        setEntries((current) =>
          current.map((entry) =>
            entry.id === id
              ? updatedEntry
              : entry,
          ),
        );

        return updatedEntry;
      } catch (error) {
        console.error(
          "Failed to update health journal:",
          error,
        );

        setError(
          "Failed to update your journal entry.",
        );

        throw error;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      try {
        setSaving(true);
        setError(null);

        await healthJournalService.remove(id);

        setEntries((current) =>
          current.filter(
            (entry) => entry.id !== id,
          ),
        );
      } catch (error) {
        console.error(
          "Failed to delete health journal:",
          error,
        );

        setError(
          "Failed to delete your journal entry.",
        );

        throw error;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return {
    entries,
    loading,
    saving,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    reload: loadEntries,
  };
}