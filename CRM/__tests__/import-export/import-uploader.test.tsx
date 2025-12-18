import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock component - replace with actual import when component exists
const ImportUploader = ({ onFileUpload }: { onFileUpload: (file: File | null, preview: any[]) => void }) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate CSV parsing
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      const preview = lines.slice(1, 4).map((line) => {
        const values = line.split(',');
        return headers.reduce((acc, header, i) => {
          acc[header.trim()] = values[i]?.trim() || '';
          return acc;
        }, {} as Record<string, string>);
      });
      onFileUpload(file, preview);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        data-testid="file-input"
      />
    </div>
  );
};

describe('ImportUploader', () => {
  it('должен отобразить input для загрузки файла', () => {
    render(<ImportUploader onFileUpload={vi.fn()} />);
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });

  it('должен принять только CSV файлы', () => {
    render(<ImportUploader onFileUpload={vi.fn()} />);
    const input = screen.getByTestId('file-input') as HTMLInputElement;
    expect(input.accept).toBe('.csv');
  });

  it('должен вызвать onFileUpload при выборе файла', async () => {
    const user = userEvent.setup();
    const onFileUpload = vi.fn();
    render(<ImportUploader onFileUpload={onFileUpload} />);

    const fileInput = screen.getByTestId('file-input');
    const csvContent = 'Имя,Email,Телефон\nИван Иванов,ivan@example.com,+79991234567';
    const file = new File([csvContent], 'contacts.csv', { type: 'text/csv' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(onFileUpload).toHaveBeenCalled();
      expect(onFileUpload).toHaveBeenCalledWith(
        expect.any(File),
        expect.arrayContaining([
          expect.objectContaining({
            Имя: expect.any(String),
            Email: expect.any(String),
            Телефон: expect.any(String),
          }),
        ])
      );
    });
  });

  it('должен парсить CSV и передать preview данные', async () => {
    const user = userEvent.setup();
    const onFileUpload = vi.fn();
    render(<ImportUploader onFileUpload={onFileUpload} />);

    const fileInput = screen.getByTestId('file-input');
    const csvContent = `Имя,Email,Телефон
Иван Иванов,ivan@example.com,+79991234567
Петр Петров,petr@example.com,+79997654321`;
    const file = new File([csvContent], 'contacts.csv', { type: 'text/csv' });

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(onFileUpload).toHaveBeenCalled();
      const [, preview] = onFileUpload.mock.calls[0];
      expect(preview).toHaveLength(2);
      expect(preview[0]).toHaveProperty('Имя');
      expect(preview[0]).toHaveProperty('Email');
      expect(preview[0]).toHaveProperty('Телефон');
    });
  });
});

