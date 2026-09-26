import type { ImportSummary } from '@deckup/shared';
import { IMPORT_MAX_BYTES } from '@deckup/shared';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button } from '../../components/ui/button';
import { Field, FormError } from '../../components/ui/field';
import { Modal } from '../../components/ui/modal';
import { ApiError } from '../../lib/api-client';
import { useImportCards } from './hooks';

export interface ImportCardsModalProps {
  deckId: string;
  open: boolean;
  onClose: () => void;
}

const FILE_INPUT_CLASSES =
  'block w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 ' +
  'file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-slate-100 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500';

export function ImportCardsModal({ deckId, open, onClose }: ImportCardsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importCards = useImportCards(deckId);

  const close = () => {
    setFile(null);
    setImportedFile(null);
    setSummary(null);
    setError(null);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Choose a CSV file first');
      return;
    }

    if (file.size > IMPORT_MAX_BYTES) {
      setError('The CSV file must be at most 1 MB');
      return;
    }

    setError(null);

    try {
      const result = await importCards.mutateAsync(file);
      setSummary(result);
      setImportedFile(file);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to import the file');
    }
  };

  const isImported = summary !== null && file === importedFile;

  return (
    <Modal open={open} title="Import cards from CSV" onClose={close}>
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        <FormError message={error ?? undefined} />

        <Field
          label="CSV file"
          htmlFor="import-file"
          hint="Columns: front, back, hint, difficulty, tags. Up to 1 MB and 1 000 rows."
        >
          <input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            className={FILE_INPUT_CLASSES}
            onChange={(event) => {
              const selected = event.target.files?.[0] ?? null;

              setImportedFile(null);
              setSummary(null);

              if (selected && selected.size > IMPORT_MAX_BYTES) {
                setFile(null);
                setError('The CSV file must be at most 1 MB');
                return;
              }

              setError(null);
              setFile(selected);
            }}
          />
        </Field>

        {summary ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm"
          >
            <p className="text-slate-200">
              {summary.imported} {summary.imported === 1 ? 'card' : 'cards'} imported
              {summary.skipped > 0 ? ` · ${summary.skipped} skipped` : ''}
            </p>

            {summary.notice ? (
              <p className="mt-2 text-xs text-amber-300">{summary.notice}</p>
            ) : null}

            {summary.duplicateRows.length > 0 ? (
              <p className="mt-2 text-xs text-amber-300">
                Duplicated rows: {summary.duplicateRows.join(', ')}
              </p>
            ) : null}

            {summary.errors.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 text-xs text-rose-300">
                {summary.errors.map((rowError, index) => (
                  <li key={`${rowError.row}-${rowError.message}-${index}`}>
                    Row {rowError.row}: {rowError.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
          <Button type="submit" disabled={importCards.isPending || isImported}>
            {importCards.isPending ? 'Importing…' : isImported ? 'Imported' : 'Import'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
