import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SalaryRangeComponent from '../SalaryRangeComponent';

describe('SalaryRangeComponent', () => {
  const defaultProps = {
    value: {
      min: '',
      max: '',
      currency: 'USD',
      period: 'annually',
      negotiable: false,
      showSalary: true
    },
    onChange: jest.fn(),
    errors: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders salary range component', () => {
    render(<SalaryRangeComponent {...defaultProps} />);
    
    expect(screen.getByText('Salary & Compensation')).toBeInTheDocument();
    expect(screen.getByText('Show salary information to candidates')).toBeInTheDocument();
  });

  test('shows salary configuration when showSalary is true', () => {
    render(<SalaryRangeComponent {...defaultProps} />);
    
    expect(screen.getByLabelText('Minimum Salary')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum Salary')).toBeInTheDocument();
    expect(screen.getByText('Salary Range Suggestions')).toBeInTheDocument();
  });

  test('hides salary configuration when showSalary is false', () => {
    const props = {
      ...defaultProps,
      value: { ...defaultProps.value, showSalary: false }
    };
    
    render(<SalaryRangeComponent {...props} />);
    
    expect(screen.queryByLabelText('Minimum Salary')).not.toBeInTheDocument();
    expect(screen.getByText('Salary information is hidden')).toBeInTheDocument();
  });

  test('handles salary input changes', () => {
    const mockOnChange = jest.fn();
    render(<SalaryRangeComponent {...defaultProps} onChange={mockOnChange} />);
    
    const minSalaryInput = screen.getByLabelText('Minimum Salary');
    fireEvent.change(minSalaryInput, { target: { value: '50000' } });
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultProps.value,
      min: '50000'
    });
  });

  test('handles showSalary toggle', () => {
    const mockOnChange = jest.fn();
    render(<SalaryRangeComponent {...defaultProps} onChange={mockOnChange} />);
    
    const showSalaryCheckbox = screen.getByRole('checkbox', { name: /Show salary information/ });
    fireEvent.click(showSalaryCheckbox);
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultProps.value,
      showSalary: false
    });
  });

  test('applies salary suggestions', () => {
    const mockOnChange = jest.fn();
    render(<SalaryRangeComponent {...defaultProps} onChange={mockOnChange} />);
    
    const entryLevelButton = screen.getByText('Entry Level');
    fireEvent.click(entryLevelButton);
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultProps.value,
      min: '40000',
      max: '60000'
    });
  });

  test('shows advanced options when toggled', () => {
    render(<SalaryRangeComponent {...defaultProps} />);
    
    const advancedToggle = screen.getByText(/Advanced Options/);
    fireEvent.click(advancedToggle);
    
    expect(screen.getByLabelText('Currency')).toBeInTheDocument();
    expect(screen.getByLabelText('Salary Period')).toBeInTheDocument();
  });

  test('handles currency changes', () => {
    const mockOnChange = jest.fn();
    render(<SalaryRangeComponent {...defaultProps} onChange={mockOnChange} />);
    
    // Open advanced options first
    const advancedToggle = screen.getByText(/Advanced Options/);
    fireEvent.click(advancedToggle);
    
    const currencySelect = screen.getByLabelText('Currency');
    fireEvent.change(currencySelect, { target: { value: 'EUR' } });
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultProps.value,
      currency: 'EUR'
    });
  });

  test('handles period changes', () => {
    const mockOnChange = jest.fn();
    render(<SalaryRangeComponent {...defaultProps} onChange={mockOnChange} />);
    
    // Open advanced options first
    const advancedToggle = screen.getByText(/Advanced Options/);
    fireEvent.click(advancedToggle);
    
    const periodSelect = screen.getByLabelText('Salary Period');
    fireEvent.change(periodSelect, { target: { value: 'monthly' } });
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultProps.value,
      period: 'monthly'
    });
  });

  test('displays validation errors', () => {
    const errors = {
      min: 'Minimum salary must be a number',
      range: 'Minimum must be less than maximum'
    };
    
    render(<SalaryRangeComponent {...defaultProps} errors={errors} />);
    
    expect(screen.getByText('Minimum salary must be a number')).toBeInTheDocument();
    expect(screen.getByText('Minimum must be less than maximum')).toBeInTheDocument();
  });

  test('disables inputs when disabled prop is true', () => {
    render(<SalaryRangeComponent {...defaultProps} disabled={true} />);
    
    const showSalaryCheckbox = screen.getByRole('checkbox', { name: /Show salary information/ });
    const minSalaryInput = screen.getByLabelText('Minimum Salary');
    
    expect(showSalaryCheckbox).toBeDisabled();
    expect(minSalaryInput).toBeDisabled();
  });
});