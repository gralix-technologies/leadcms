import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LeadCard from './LeadCard';

// Mock dnd-kit hooks to avoid context errors
vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
    }),
}));

describe('LeadCard', () => {
    const mockLead = {
        id: 1,
        company: 'Acme Corp',
        contact_name: 'John Doe',
        deal_value: 5000,
        status: 'new',
        division: 'residential',
        assigned_to: { get_avatar: 'avatar.png' }
    };

    it('renders lead details correctly', () => {
        render(<LeadCard lead={mockLead} />);

        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('5,000')).toBeInTheDocument();
    });

    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<LeadCard lead={mockLead} onClick={handleClick} />);

        fireEvent.click(screen.getByText('Acme Corp').closest('div')); // Click container or element inside
        expect(handleClick).toHaveBeenCalledTimes(1);
        expect(handleClick).toHaveBeenCalledWith(mockLead);
    });
});
