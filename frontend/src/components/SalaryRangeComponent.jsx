import React, { useState, useEffect } from 'react';
import './SalaryRangeComponent.css';

const SalaryRangeComponent = ({ 
  value = {
    min: '',
    max: '',
    currency: 'USD',
    period: 'annually',
    negotiable: false,
    showSalary: true
  }, 
  onChange, 
  errors = {},
  disabled = false 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Currency options with symbols
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' }
  ];

  // Salary period options
  const periods = [
    { value: 'hourly', label: 'Per Hour', shortLabel: '/hr' },
    { value: 'daily', label: 'Per Day', shortLabel: '/day' },
    { value: 'weekly', label: 'Per Week', shortLabel: '/week' },
    { value: 'monthly', label: 'Per Month', shortLabel: '/month' },
    { value: 'annually', label: 'Per Year', shortLabel: '/year' }
  ];

  // Get current currency symbol
  const getCurrentCurrencySymbol = () => {
    const currency = currencies.find(c => c.code === value.currency);
    return currency ? currency.symbol : '$';
  };

  // Get current period label
  const getCurrentPeriodLabel = () => {
    const period = periods.find(p => p.value === value.period);
    return period ? period.shortLabel : '/year';
  };

  // Handle input changes
  const handleInputChange = (field, inputValue) => {
    let newValue = { ...value };

    if (field === 'min' || field === 'max') {
      // Handle numeric inputs
      const numericValue = inputValue.replace(/[^0-9.]/g, '');
      newValue[field] = numericValue;
    } else {
      newValue[field] = inputValue;
    }

    onChange(newValue);
  };

  // Handle checkbox changes
  const handleCheckboxChange = (field, checked) => {
    const newValue = {
      ...value,
      [field]: checked
    };
    onChange(newValue);
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (!num) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Validate salary range
  const validateSalaryRange = () => {
    const min = parseFloat(value.min);
    const max = parseFloat(value.max);
    
    if (value.min && value.max) {
      return min < max;
    }
    return true;
  };

  // Get salary range display
  const getSalaryRangeDisplay = () => {
    const symbol = getCurrentCurrencySymbol();
    const periodLabel = getCurrentPeriodLabel();
    
    if (value.min && value.max) {
      return `${symbol}${formatNumber(value.min)} - ${symbol}${formatNumber(value.max)} ${periodLabel}`;
    } else if (value.min) {
      return `From ${symbol}${formatNumber(value.min)} ${periodLabel}`;
    } else if (value.max) {
      return `Up to ${symbol}${formatNumber(value.max)} ${periodLabel}`;
    }
    return 'Salary not specified';
  };

  // Salary range suggestions based on period
  const getSalarySuggestions = () => {
    const suggestions = {
      hourly: [
        { min: 15, max: 25, label: 'Entry Level' },
        { min: 25, max: 40, label: 'Mid Level' },
        { min: 40, max: 75, label: 'Senior Level' },
        { min: 75, max: 150, label: 'Executive Level' }
      ],
      daily: [
        { min: 120, max: 200, label: 'Entry Level' },
        { min: 200, max: 320, label: 'Mid Level' },
        { min: 320, max: 600, label: 'Senior Level' },
        { min: 600, max: 1200, label: 'Executive Level' }
      ],
      weekly: [
        { min: 600, max: 1000, label: 'Entry Level' },
        { min: 1000, max: 1600, label: 'Mid Level' },
        { min: 1600, max: 3000, label: 'Senior Level' },
        { min: 3000, max: 6000, label: 'Executive Level' }
      ],
      monthly: [
        { min: 3000, max: 5000, label: 'Entry Level' },
        { min: 5000, max: 8000, label: 'Mid Level' },
        { min: 8000, max: 15000, label: 'Senior Level' },
        { min: 15000, max: 30000, label: 'Executive Level' }
      ],
      annually: [
        { min: 40000, max: 60000, label: 'Entry Level' },
        { min: 60000, max: 100000, label: 'Mid Level' },
        { min: 100000, max: 180000, label: 'Senior Level' },
        { min: 180000, max: 350000, label: 'Executive Level' }
      ]
    };
    
    return suggestions[value.period] || suggestions.annually;
  };

  // Apply salary suggestion
  const applySalarySuggestion = (suggestion) => {
    const newValue = {
      ...value,
      min: suggestion.min.toString(),
      max: suggestion.max.toString()
    };
    onChange(newValue);
  };

  // Show advanced options if any advanced field is set
  useEffect(() => {
    if (value.currency !== 'USD' || value.period !== 'annually' || value.negotiable) {
      setShowAdvanced(true);
    }
  }, [value.currency, value.period, value.negotiable]);

  return (
    <div className="salary-range-component">
      <h3>Salary & Compensation</h3>
      
      {/* Salary Visibility Toggle */}
      <div className="salary-visibility">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={value.showSalary}
            onChange={(e) => handleCheckboxChange('showSalary', e.target.checked)}
            disabled={disabled}
          />
          <span className="checkbox-text">
            <strong>Show salary information to candidates</strong>
            <small>Displaying salary ranges can increase application rates by up to 30%</small>
          </span>
        </label>
      </div>

      {value.showSalary && (
        <div className="salary-configuration">
          {/* Salary Range Inputs */}
          <div className="salary-inputs">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="salaryMin">Minimum Salary</label>
                <div className="salary-input-wrapper">
                  <span className="currency-symbol">{getCurrentCurrencySymbol()}</span>
                  <input
                    type="text"
                    id="salaryMin"
                    value={value.min}
                    onChange={(e) => handleInputChange('min', e.target.value)}
                    placeholder="50,000"
                    className={errors.min || errors.range ? 'error' : ''}
                    disabled={disabled}
                  />
                  <span className="period-label">{getCurrentPeriodLabel()}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="salaryMax">Maximum Salary</label>
                <div className="salary-input-wrapper">
                  <span className="currency-symbol">{getCurrentCurrencySymbol()}</span>
                  <input
                    type="text"
                    id="salaryMax"
                    value={value.max}
                    onChange={(e) => handleInputChange('max', e.target.value)}
                    placeholder="80,000"
                    className={errors.max || errors.range ? 'error' : ''}
                    disabled={disabled}
                  />
                  <span className="period-label">{getCurrentPeriodLabel()}</span>
                </div>
              </div>
            </div>

            {/* Validation Messages */}
            {(errors.min || errors.max || errors.range) && (
              <div className="error-messages">
                {errors.range && <span className="error-message">{errors.range}</span>}
                {errors.min && <span className="error-message">{errors.min}</span>}
                {errors.max && <span className="error-message">{errors.max}</span>}
              </div>
            )}

            {/* Range Validation Feedback */}
            {value.min && value.max && (
              <div className="range-validation">
                {validateSalaryRange() ? (
                  <span className="validation-success">
                    ✓ Range: {getSalaryRangeDisplay()}
                  </span>
                ) : (
                  <span className="validation-error">
                    ⚠ Minimum salary must be less than maximum salary
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Salary Suggestions */}
          <div className="salary-suggestions">
            <h4>Salary Range Suggestions</h4>
            <div className="suggestions-grid">
              {getSalarySuggestions().map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  className="suggestion-button"
                  onClick={() => applySalarySuggestion(suggestion)}
                  disabled={disabled}
                >
                  <span className="suggestion-label">{suggestion.label}</span>
                  <span className="suggestion-range">
                    {getCurrentCurrencySymbol()}{formatNumber(suggestion.min)} - {getCurrentCurrencySymbol()}{formatNumber(suggestion.max)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="advanced-toggle">
            <button
              type="button"
              className="toggle-advanced"
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={disabled}
            >
              {showAdvanced ? '▼' : '▶'} Advanced Options
            </button>
          </div>

          {/* Advanced Configuration */}
          {showAdvanced && (
            <div className="advanced-options">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="currency">Currency</label>
                  <select
                    id="currency"
                    value={value.currency}
                    onChange={(e) => handleInputChange('currency', e.target.value)}
                    disabled={disabled}
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code} - {currency.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="period">Salary Period</label>
                  <select
                    id="period"
                    value={value.period}
                    onChange={(e) => handleInputChange('period', e.target.value)}
                    disabled={disabled}
                  >
                    {periods.map(period => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Negotiable Option */}
              <div className="negotiable-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={value.negotiable}
                    onChange={(e) => handleCheckboxChange('negotiable', e.target.checked)}
                    disabled={disabled}
                  />
                  <span className="checkbox-text">
                    <strong>Salary is negotiable</strong>
                    <small>Indicates flexibility in salary discussions</small>
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Additional Compensation */}
          <div className="additional-compensation">
            <h4>Additional Benefits</h4>
            <div className="benefits-note">
              <small>
                <strong>Tip:</strong> Consider mentioning additional benefits in your job description such as:
                health insurance, retirement plans, stock options, flexible PTO, professional development budget, 
                remote work stipend, or performance bonuses.
              </small>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="privacy-notice">
            <small>
              <strong>Privacy:</strong> You can hide salary information at any time. 
              Salary ranges are only visible to candidates when "Show salary information" is enabled.
            </small>
          </div>
        </div>
      )}

      {/* Salary Hidden State */}
      {!value.showSalary && (
        <div className="salary-hidden-state">
          <div className="hidden-message">
            <span className="icon">🔒</span>
            <div>
              <strong>Salary information is hidden</strong>
              <small>Candidates will not see salary details for this position</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryRangeComponent;