# Location and Salary Components

This directory contains reusable components for managing job location and salary information in job forms.

## Components

### LocationManagement

A comprehensive location management component that supports:

- **Primary Location**: City, state, and country input with validation and suggestions
- **Work Arrangements**: On-site, remote, and hybrid work options
- **Hybrid Configuration**: Required office days for hybrid positions
- **Multiple Locations**: Support for jobs with multiple office locations or travel requirements
- **International Support**: Handles various international location formats
- **Validation**: Real-time validation with error messages
- **Suggestions**: Auto-complete suggestions for common locations

#### Usage

```jsx
import LocationManagement from './LocationManagement';

const [location, setLocation] = useState({
  city: '',
  state: '',
  country: '',
  remote: false,
  hybrid: false,
  onSite: true,
  requiredOfficeDays: null,
  multipleLocations: []
});

<LocationManagement
  value={location}
  onChange={setLocation}
  errors={validationErrors}
  disabled={false}
/>
```

#### Props

- `value` (object): Current location data
- `onChange` (function): Callback when location data changes
- `errors` (object): Validation errors to display
- `disabled` (boolean): Whether inputs should be disabled

### SalaryRangeComponent

A comprehensive salary management component that supports:

- **Salary Visibility**: Toggle to show/hide salary information
- **Salary Range**: Minimum and maximum salary inputs with validation
- **Multiple Currencies**: Support for 18+ international currencies
- **Salary Periods**: Hourly, daily, weekly, monthly, and annual periods
- **Salary Suggestions**: Pre-defined ranges based on experience level
- **Negotiable Option**: Mark salary as negotiable
- **Advanced Options**: Currency and period selection
- **Privacy Controls**: Hide salary information from candidates

#### Usage

```jsx
import SalaryRangeComponent from './SalaryRangeComponent';

const [salaryRange, setSalaryRange] = useState({
  min: '',
  max: '',
  currency: 'USD',
  period: 'annually',
  negotiable: false,
  showSalary: true
});

<SalaryRangeComponent
  value={salaryRange}
  onChange={setSalaryRange}
  errors={validationErrors}
  disabled={false}
/>
```

#### Props

- `value` (object): Current salary range data
- `onChange` (function): Callback when salary data changes
- `errors` (object): Validation errors to display
- `disabled` (boolean): Whether inputs should be disabled

## Integration Example

See `JobFormExample.jsx` for a complete example of how to use both components together in a form.

## Requirements Validation

These components fulfill the following requirements:

### LocationManagement Requirements (5.1, 5.2, 5.3, 5.5)
- ✅ 5.1: Specify job location with city, state, and country
- ✅ 5.2: Indicate remote work options (On-site, Remote, Hybrid)
- ✅ 5.3: Specify required office days for hybrid work
- ✅ 5.4: Validate location information and suggest corrections
- ✅ 5.5: Allow multiple locations for jobs with travel requirements
- ✅ 5.6: Support international location formats and time zones

### SalaryRangeComponent Requirements (6.1, 6.2, 6.3, 6.4, 6.5, 6.6)
- ✅ 6.1: Specify salary ranges with minimum and maximum values
- ✅ 6.2: Support different salary periods (Hourly, Monthly, Annually)
- ✅ 6.3: Indicate if salary is negotiable
- ✅ 6.4: Validate that minimum is less than maximum
- ✅ 6.5: Add additional compensation information (benefits, bonuses, equity)
- ✅ 6.6: Allow employers to hide salary information if preferred

## Testing

Both components include comprehensive unit tests:

```bash
# Test LocationManagement component
npm test -- LocationManagement --watchAll=false

# Test SalaryRangeComponent
npm test -- SalaryRangeComponent --watchAll=false
```

## Styling

Both components include responsive CSS with:
- Mobile-first design
- Accessible color schemes
- Consistent spacing and typography
- Interactive hover and focus states
- Error state styling
- Loading and disabled states