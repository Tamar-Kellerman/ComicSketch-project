export const validators = {
  username: (val) => {
    if (!val.trim()) return 'Username is required';
    if (val.trim().length < 3) return 'Username must be at least 3 characters';
    if (val.length > 20) return 'Username cannot exceed 20 characters';
    if (/\s/.test(val)) return 'Username cannot contain spaces';
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Username can only contain letters, numbers and underscore (_)';
    return '';
  },

  password: (val) => {
    if (!val) return 'Password is required';
    if (val.length < 6) return 'Password must be at least 6 characters';
    return '';
  },

  name: (val) => {
    if (!val.trim()) return 'Full name is required';
    if (val.trim().length < 2) return 'Name must be at least 2 characters';
    if (!/^[֐-׿a-zA-Z\s]+$/.test(val)) return 'Name can only contain Hebrew or English letters and spaces';
    return '';
  },

  idCard: (val) => {
    if (!val) return 'ID number is required';
    if (!/^\d{9}$/.test(val)) return 'ID number must be exactly 9 digits';
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let digit = Number(val[i]) * ((i % 2) + 1);
      if (digit > 9) digit -= 9;
      sum += digit;
    }
    if (sum % 10 !== 0) return 'ID number is invalid';
    return '';
  },

  phone: (val) => {
    if (!val) return 'Phone number is required';
    const digits = val.replace(/[-\s]/g, '');
    if (!/^(05\d{8}|0[2-489]\d{7})$/.test(digits)) return 'Invalid phone number (e.g. 0501234567 or 031234567)';
    return '';
  },

  email: (val) => {
    if (!val) return 'Email address is required';
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(val)) return 'Invalid email address';
    return '';
  },

  storyText: (val) => {
    if (!val.trim()) return 'Please enter a story text';
    if (val.trim().length < 20) return 'Story must be at least 20 characters';
    return '';
  },

  endDate: (val) => {
    if (!val) return 'End date is required';
    const date = new Date(val);
    if (date <= new Date()) return 'End date must be in the future';
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (date > maxDate) return 'End date cannot be more than one year from now';
    return '';
  },
};

export function validateFields(fields) {
  const errors = {};
  for (const [field, value] of Object.entries(fields)) {
    if (validators[field]) {
      const error = validators[field](value);
      if (error) errors[field] = error;
    }
  }
  return errors;
}
