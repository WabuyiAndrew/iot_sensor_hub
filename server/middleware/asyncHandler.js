/**
 * @file asyncHandler.js
 * @description A middleware utility to wrap asynchronous Express route handlers.
 * It catches any errors that occur in async functions and passes them to the
 * Express error handling middleware, preventing the server from crashing.
 */

/**
 * Wraps an asynchronous Express route handler to catch errors.
 *
 * @param {Function} fn - The asynchronous function (controller) to wrap.
 * @returns {Function} A new function that executes the original async function
 * and catches any errors, passing them to the next middleware (error handler).
 */
const asyncHandler = (fn) => (req, res, next) => {
  // Promise.resolve() ensures that the function `fn` (which might be sync or async)
  // is treated as a promise. If it's a sync function, its return value is wrapped
  // in a resolved promise. If it's an async function, it already returns a promise.
  // .catch(next) then ensures that any rejection (error) from this promise
  // is caught and passed to the `next` middleware, which should be your
  // centralized error handling middleware.
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
