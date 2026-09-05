import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { expect, test } from 'vitest';
import { MetricCard } from './MetricCard.jsx';

test('renders a metric and its context', () => {
  render(<MetricCard icon={Activity} label="Urban health" value="71/100" note="Composite index" />);
  expect(screen.getByText('Urban health')).toBeInTheDocument();
  expect(screen.getByText('71/100')).toBeInTheDocument();
  expect(screen.getByText('Composite index')).toBeInTheDocument();
});
