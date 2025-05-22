// backend/utils/validation.js
const Validator = require('validator');
const isEmpty = require('is-empty');
const mongoose = require('mongoose');

// Helper function to check if value is empty
const isFieldEmpty = (value) => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'object' && Object.keys(value).length === 0) ||
    (typeof value === 'string' && value.trim().length === 0)
  );
};

// Helper to check if string is a valid MongoDB ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Health record validation
const validateHealthRecord = (data, isPartial = false) => {
  let errors = {};

  // Skip required fields check if partial update
  if (!isPartial) {
    // Required fields checks would go here
  }

  // Validate numeric fields if present
  if (data.bloodPressure) {
    if (data.bloodPressure.systolic && isNaN(Number(data.bloodPressure.systolic))) {
      errors.bloodPressure = 'Systolic blood pressure must be a number';
    }
    if (data.bloodPressure.diastolic && isNaN(Number(data.bloodPressure.diastolic))) {
      errors.bloodPressure = 'Diastolic blood pressure must be a number';
    }
  }

  if (data.heartRate && isNaN(Number(data.heartRate))) {
    errors.heartRate = 'Heart rate must be a number';
  }

  if (data.weight && isNaN(Number(data.weight))) {
    errors.weight = 'Weight must be a number';
  }

  if (data.glucoseLevel && isNaN(Number(data.glucoseLevel))) {
    errors.glucoseLevel = 'Glucose level must be a number';
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};

// Register validation
const validateRegisterInput = (data) => {
  let errors = {};

  // Convert empty fields to empty strings so we can use validator
  data.name = !isEmpty(data.name) ? data.name : '';
  data.email = !isEmpty(data.email) ? data.email : '';
  data.password = !isEmpty(data.password) ? data.password : '';
  data.passwordConfirm = !isEmpty(data.passwordConfirm) ? data.passwordConfirm : '';
  data.role = !isEmpty(data.role) ? data.role : '';
  data.dateOfBirth = !isEmpty(data.dateOfBirth) ? data.dateOfBirth : '';
  data.gender = !isEmpty(data.gender) ? data.gender : '';

  // Name checks
  if (Validator.isEmpty(data.name)) {
    errors.name = 'Name field is required';
  }

  // Email checks
  if (Validator.isEmpty(data.email)) {
    errors.email = 'Email field is required';
  } else if (!Validator.isEmail(data.email)) {
    errors.email = 'Email is invalid';
  }

  // Password checks
  if (Validator.isEmpty(data.password)) {
    errors.password = 'Password field is required';
  }

  if (Validator.isEmpty(data.passwordConfirm)) {
    errors.passwordConfirm = 'Confirm password field is required';
  }

  if (!Validator.isLength(data.password, { min: 6, max: 30 })) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!Validator.equals(data.password, data.passwordConfirm)) {
    errors.passwordConfirm = 'Passwords must match';
  }

  // Role checks
  if (Validator.isEmpty(data.role)) {
    errors.role = 'Role field is required';
  } else if (!['patient', 'doctor'].includes(data.role)) {
    errors.role = 'Invalid role selected';
  }

  // Date of birth checks
  if (Validator.isEmpty(data.dateOfBirth)) {
    errors.dateOfBirth = 'Date of birth is required';
  }

  // Gender checks
  if (Validator.isEmpty(data.gender)) {
    errors.gender = 'Gender is required';
  }

  // Doctor specific validation
  if (data.role === 'doctor') {
    data.specialization = !isEmpty(data.specialization) ? data.specialization : '';
    
    if (Validator.isEmpty(data.specialization)) {
      errors.specialization = 'Specialization is required for doctors';
    }
  }

  // Patient specific validation
  if (data.role === 'patient') {
    // Only validate height and weight for patients
    if (data.height === undefined || data.height === null) {
      errors.height = 'Height is required';
    } else if (isNaN(parseFloat(data.height))) {
      errors.height = 'Height must be a number';
    }

    if (data.weight === undefined || data.weight === null) {
      errors.weight = 'Weight is required';
    } else if (isNaN(parseFloat(data.weight))) {
      errors.weight = 'Weight must be a number';
    }

    // Emergency contact is optional, but if provided, validate it
    if (data.emergencyContact) {
      // No validation required, all fields are optional
    }
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};

// Login validation
const validateLoginInput = (data) => {
  let errors = {};

  // Convert empty fields to empty strings so we can use validator
  data.email = !isEmpty(data.email) ? data.email : '';
  data.password = !isEmpty(data.password) ? data.password : '';

  // Email checks
  if (Validator.isEmpty(data.email)) {
    errors.email = 'Email field is required';
  } else if (!Validator.isEmail(data.email)) {
    errors.email = 'Email is invalid';
  }

  // Password checks
  if (Validator.isEmpty(data.password)) {
    errors.password = 'Password field is required';
  }

  return {
    errors,
    isValid: isEmpty(errors)
  };
};

module.exports = {
  validateUserRegistration: validateRegisterInput,
  validateUserLogin: validateLoginInput,
  validateHealthRecord,
  isValidObjectId
};