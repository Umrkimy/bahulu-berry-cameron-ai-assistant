import { Button } from '@mantine/core';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppErrorBoundary from './AppErrorBoundary';
import { renderWithProviders } from '../../test/render';

let shouldCrash = true;

function RecoverableCrash() {
  if (shouldCrash) throw new Error('test-only crash');
  return <Button>Recovered</Button>;
}

describe('AppErrorBoundary', () => {
  it('shows a safe recovery screen without technical error details', () => {
    shouldCrash = true;
    renderWithProviders(<AppErrorBoundary><RecoverableCrash /></AppErrorBoundary>);
    expect(screen.getByRole('heading', { name: 'This page needs a refresh' })).toBeInTheDocument();
    expect(screen.queryByText('test-only crash')).not.toBeInTheDocument();
  });

  it('recovers after retrying', () => {
    shouldCrash = true;
    renderWithProviders(<AppErrorBoundary onReset={() => { shouldCrash = false; }}><RecoverableCrash /></AppErrorBoundary>);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('button', { name: 'Recovered' })).toBeInTheDocument();
  });
});
