import { Text } from '@mantine/core';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it, vi } from 'vitest';
import DataTable from './DataTable';
import { renderWithProviders } from '../../../test/render';

type RecordItem = { id: number; name: string };
const columns: ColumnDef<RecordItem, unknown>[] = [{ accessorKey: 'name', header: 'Name', cell: ({ row }) => <Text>{row.original.name}</Text> }];

describe('DataTable', () => {
  it('shows a loading state', () => {
    renderWithProviders(<DataTable data={[]} columns={columns} loading emptyMessage="No records yet." />);
    expect(screen.getAllByText('Loading...')).toHaveLength(2);
  });

  it('shows an empty state', () => {
    renderWithProviders(<DataTable data={[]} columns={columns} emptyMessage="No records yet." />);
    expect(screen.getAllByText('No records yet.')).toHaveLength(2);
  });

  it('renders a dedicated mobile card for each record', () => {
    renderWithProviders(<DataTable data={[{ id: 1, name: 'Bahulu Coklat' }]} columns={columns} renderMobileCard={(item) => <Text>Mobile card: {item.name}</Text>} />);
    expect(screen.getByText('Mobile card: Bahulu Coklat')).toBeInTheDocument();
  });

  it('labels its search and scrollable table region for assistive technology', () => {
    renderWithProviders(<DataTable tableLabel="Inventory" data={[{ id: 1, name: 'Bahulu Coklat' }]} columns={columns} />);
    expect(screen.getByRole('textbox', { name: 'Search inventory' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Inventory table' })).toHaveAttribute('aria-describedby');
    expect(screen.getByText('This table may scroll horizontally when there is not enough room to show every column.')).toHaveClass('sr-only');
  });

  it('provides a visible retry action when loading fails', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    renderWithProviders(<DataTable data={[]} columns={columns} error errorMessage="Inventory is unavailable." onRetry={retry} />);
    await user.click(screen.getAllByRole('button', { name: 'Try again' })[0]);
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });
});
