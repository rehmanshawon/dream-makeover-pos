import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmployeeFormModal } from './EmployeeFormModal';
import { renderWithProviders } from '../../../test/render-with-providers';

const { create, upload } = vi.hoisted(() => ({
  create: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('../../../api/employee-hooks', () => ({
  useCreateEmployee: () => ({ mutateAsync: create, isPending: false }),
  useUpdateEmployee: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadEmployeePhoto: () => ({ mutateAsync: upload, isPending: false }),
}));

describe('EmployeeFormModal', () => {
  it('uploads the selected photograph after creating an employee', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    create.mockResolvedValue({ id: 'employee-1' });
    upload.mockResolvedValue({ id: 'employee-1', photoUrl: '/uploads/employees/photo.webp' });

    renderWithProviders(<EmployeeFormModal open onClose={onClose} />);

    await user.type(screen.getByLabelText('Full name'), 'Rina Akter');
    await user.type(screen.getByLabelText('Role'), 'Senior Stylist');
    await user.type(screen.getByLabelText('Salary (৳)'), '35000');
    await user.upload(
      screen.getByLabelText('Photograph (optional)'),
      new File(['photo'], 'rina.webp', { type: 'image/webp' }),
    );
    await user.click(screen.getByRole('button', { name: 'Create employee' }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Rina Akter', role: 'Senior Stylist' }),
    );
    expect(upload).toHaveBeenCalledWith({
      id: 'employee-1',
      photo: expect.objectContaining({ name: 'rina.webp', type: 'image/webp' }),
    });
    expect(onClose).toHaveBeenCalled();
  });
});
