import { Text } from '@mantine/core';
import { screen } from '@testing-library/react';
import type { ColumnDef } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
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
});
