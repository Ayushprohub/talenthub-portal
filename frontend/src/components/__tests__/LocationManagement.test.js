import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationManagement from '../LocationManagement';

describe('LocationManagement Component', () => {
  const defaultProps = {
    value: {
      city: '',
      state: '',
      country: '',
      remote: false,
      hybrid: false,
      onSite: true,
      requiredOfficeDays: null,
      multipleLocations: []
    },
    onChange: jest.fn(),
    errors: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders location management component', () => {
    render(<LocationManagement {...defaultProps} />);
    
    expect(screen.getByText('Location & Work Arrangement')).toBeInTheDocument();
    expect(screen.getByLabelText('City *')).toBeInTheDocument();
    expect(screen.getByLabelText('State/Province *')).toBeInTheDocument();
    expect(screen.getByLabelText('Country *')).toBeInTheDocument();
  });

  test('handles location input changes', () => {
    const mockOnChange = jest.fn();
    render(<LocationManagement {...defaultProps} onChange={mockOnChange} />);
    
    const cityInput = screen.getByLabelText('City *');
    fireEvent.change(cityInput, { target: { value: 'San Francisco' } });
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultProps.value,
      city: 'San Francisco'
    });
  });

  test('handles work arrangement changes', () => {
    const mockOnChange = jest.fn();
    render(<LocationManagement {...defaultProps} onChange={mockOnChange} />);
    
    const remoteRadio = screen.getByLabelText(/Remote/);
    fireEvent.click(remoteRadio);
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultProps.value,
      remote: true,
      hybrid: false,
      onSite: false,
      requiredOfficeDays: null
    });
  });

  test('shows hybrid configuration when hybrid is selected', () => {
    const hybridValue = {
      ...defaultProps.value,
      hybrid: true,
      onSite: false,
      remote: false
    };
    
    render(<LocationManagement {...defaultProps} value={hybridValue} />);
    
    expect(screen.getByLabelText('Required Office Days per Week *')).toBeInTheDocument();
  });

  test('handles multiple locations', () => {
    const mockOnChange = jest.fn();
    render(<LocationManagement {...defaultProps} onChange={mockOnChange} />);
    
    const addLocationButton = screen.getByText('+ Add Location');
    fireEvent.click(addLocationButton);
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultProps.value,
      multipleLocations: [expect.objectContaining({
        city: '',
        state: '',
        country: '',
        id: expect.any(Number)
      })]
    });
  });

  test('displays validation errors', () => {
    const errors = {
      city: 'City is required',
      state: 'State is required'
    };
    
    render(<LocationManagement {...defaultProps} errors={errors} />);
    
    expect(screen.getByText('City is required')).toBeInTheDocument();
    expect(screen.getByText('State is required')).toBeInTheDocument();
  });

  test('disables inputs when disabled prop is true', () => {
    render(<LocationManagement {...defaultProps} disabled={true} />);
    
    const cityInput = screen.getByLabelText('City *');
    const remoteRadio = screen.getByLabelText(/Remote/);
    const addLocationButton = screen.getByText('+ Add Location');
    
    expect(cityInput).toBeDisabled();
    expect(remoteRadio).toBeDisabled();
    expect(addLocationButton).toBeDisabled();
  });
});