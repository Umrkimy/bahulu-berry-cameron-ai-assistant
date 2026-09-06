import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '../theme';

export function renderWithProviders(ui: ReactElement, route = '/dashboard') {
  return render(<MantineProvider theme={theme}><MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter></MantineProvider>);
}
