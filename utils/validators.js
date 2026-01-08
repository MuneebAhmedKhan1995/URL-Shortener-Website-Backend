import validator from 'validator';

const validateUrl = (url) => {
  return validator.isURL(url, {
    require_protocol: true,
    require_valid_protocol: true,
    protocols: ['http', 'https'],
  });
};

const validateEmail = (email) => {
  return validator.isEmail(email);
};

const validatePassword = (password) => {
  return password.length >= 6;
};

export {
  validateUrl,
  validateEmail,
  validatePassword,
};