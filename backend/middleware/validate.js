import { validationResult } from 'express-validator';

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = errors.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value,
  }));

  return res.status(422).json({
    success: false,
    data: null,
    meta: null,
    message: 'Validation failed',
    errorCode: 'VALIDATION_ERROR',
    errors: extractedErrors,
  });
};

export default validate;
