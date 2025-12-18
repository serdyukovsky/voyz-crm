import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock component - replace with actual import when component exists
// This is a simplified version for testing
const ColumnMappingForm = ({
  columns,
  onMappingChange,
  onStartImport,
  isImporting = false,
}: {
  columns: string[];
  onMappingChange?: (mapping: Record<string, string>) => void;
  onStartImport?: (mapping: Record<string, string>) => void;
  isImporting?: boolean;
}) => {
  const [mapping, setMapping] = React.useState<Record<string, string>>({});

  const handleFieldChange = (column: string, field: string) => {
    const newMapping = { ...mapping, [column]: field };
    setMapping(newMapping);
    onMappingChange?.(newMapping);
  };

  return (
    <div data-testid="mapping-form">
      <div data-testid="mapping-columns">{columns.length}</div>
      {columns.map((col) => (
        <div key={col} data-testid={`mapping-${col}`}>
          <label>{col}</label>
          <select
            onChange={(e) => handleFieldChange(col, e.target.value)}
            data-testid={`select-${col}`}
            value={mapping[col] || ''}
          >
            <option value="">Select field</option>
            <option value="fullName">Full Name</option>
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="position">Position</option>
          </select>
        </div>
      ))}
      <button
        onClick={() => onStartImport?.(mapping)}
        disabled={isImporting}
        data-testid="start-import-button"
      >
        {isImporting ? 'Importing...' : 'Start Import'}
      </button>
    </div>
  );
};

describe('ColumnMappingForm', () => {
  const columns = ['Имя', 'Email', 'Телефон'];

  it('должен отобразить форму mapping', () => {
    render(<ColumnMappingForm columns={columns} />);
    expect(screen.getByTestId('mapping-form')).toBeInTheDocument();
  });

  it('должен отобразить select для каждой колонки', () => {
    render(<ColumnMappingForm columns={columns} />);
    columns.forEach((col) => {
      expect(screen.getByTestId(`select-${col}`)).toBeInTheDocument();
    });
  });

  it('должен вызвать onMappingChange при изменении mapping', async () => {
    const user = userEvent.setup();
    const onMappingChange = vi.fn();
    render(<ColumnMappingForm columns={columns} onMappingChange={onMappingChange} />);

    const select = screen.getByTestId('select-Имя');
    await user.selectOptions(select, 'fullName');

    await waitFor(() => {
      expect(onMappingChange).toHaveBeenCalled();
      expect(onMappingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          Имя: 'fullName',
        })
      );
    });
  });

  it('должен отобразить кнопку Start Import', () => {
    render(<ColumnMappingForm columns={columns} />);
    expect(screen.getByTestId('start-import-button')).toBeInTheDocument();
    expect(screen.getByTestId('start-import-button')).toHaveTextContent('Start Import');
  });

  it('должен сделать кнопку disabled во время импорта', () => {
    render(<ColumnMappingForm columns={columns} isImporting={true} />);
    const button = screen.getByTestId('start-import-button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Importing...');
  });

  it('должен вызвать onStartImport при клике на кнопку', async () => {
    const user = userEvent.setup();
    const onStartImport = vi.fn();
    render(<ColumnMappingForm columns={columns} onStartImport={onStartImport} />);

    // Set some mapping
    const select = screen.getByTestId('select-Имя');
    await user.selectOptions(select, 'fullName');

    const button = screen.getByTestId('start-import-button');
    await user.click(button);

    await waitFor(() => {
      expect(onStartImport).toHaveBeenCalled();
      expect(onStartImport).toHaveBeenCalledWith(
        expect.objectContaining({
          Имя: 'fullName',
        })
      );
    });
  });

  it('не должен хардкодить поля - должен использовать переданные колонки', () => {
    const customColumns = ['Custom1', 'Custom2', 'Custom3'];
    render(<ColumnMappingForm columns={customColumns} />);

    customColumns.forEach((col) => {
      expect(screen.getByTestId(`select-${col}`)).toBeInTheDocument();
    });
  });
});

