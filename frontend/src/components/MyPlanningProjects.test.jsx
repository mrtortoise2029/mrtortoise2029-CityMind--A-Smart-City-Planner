import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { MyPlanningProjects } from './MyPlanningProjects.jsx';

const project = {
  id: 1, name: 'Bashundhara Residential Area', project_type: 'NEW_DEVELOPMENT',
  planning_stage: 'Master Planning', status: 'active', area_acres: 500,
  current_population: null, expected_population: 85000, planning_horizon: 20,
  progress_percent: 32, health_score: null,
};

test('opens an existing planning project and launches project creation', async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  render(<MyPlanningProjects cities={[{ id: 1, name: 'Dhaka', latitude: 23.78, longitude: 90.4 }]} error="" loading={false} onDelete={vi.fn()} onOpen={onOpen} onSave={vi.fn()} projects={[project]} />);
  expect(screen.getByRole('heading', { name: 'My Planning Projects' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Create New Planning Project/ }));
  expect(screen.getByRole('dialog', { name: 'Create planning project' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Close project wizard' }));
  await user.click(screen.getByRole('button', { name: /Open workspace/ }));
  expect(onOpen).toHaveBeenCalledWith(project);
});
