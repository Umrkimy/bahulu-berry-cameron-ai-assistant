import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { describe, expect, it } from 'vitest';
import ChatMessage from './ChatMessage';

describe('AI outcome feedback', () => {
  it.each([
    ['CONFIRMATION_REQUIRED', 'Awaiting your confirmation'],
    ['COMPLETED', 'Action completed'],
    ['CANCELLED', 'Action cancelled'],
    ['FAILED', 'Request not completed'],
  ] as const)('renders server outcome %s', (outcome, label) => {
    render(<MantineProvider><ChatMessage message={{ role: 'assistant', content: 'Fictional response', outcome }} /></MantineProvider>);
    expect(screen.getByText(label)).toBeVisible();
  });
});
