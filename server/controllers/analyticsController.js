const { ErrorResponse } = require("../utils/errorResponse");
const asyncHandler = require("../middleware/asyncHandler");
const externalApiService = require("../services/externalApiService");

/**
 * @desc Get analytic sensor data (alias for historical analytics)
 * @route GET /api/sensor/analytic-data
 */
exports.getAnalyticSensorData = asyncHandler(async (req, res, next) => {
  // Use deviceType and deviceNumber directly from the query, as per the external API docs
  const deviceType = req.query.deviceType;
  const deviceNumber = req.query.deviceNumber;
  const period = req.query.period || 'daily';

  // Add validation for the required startDate parameter
  if (!deviceType || !req.query.startDate) {
    return next(new ErrorResponse("Missing required parameters: deviceType, startDate", 400));
  }

  // Pass these parameters to the main historical analytics handler
  req.query.deviceType = deviceType;
  req.query.deviceNumber = deviceNumber;
  req.query.period = period;

  return exports.getHistoricalAnalytics(req, res, next);
});


/**
 * @desc Get current period analytics by fetching from external API
 * @route GET /api/sensor/historical-analytics?deviceType=...&deviceNumber=...&period=...
 */
exports.getHistoricalAnalytics = asyncHandler(async (req, res, next) => {
  const { deviceType, deviceNumber, period = 'daily', startDate } = req.query;

  // Add validation for required parameters
  if (!deviceType || !startDate) {
    return next(new ErrorResponse("Missing required parameters: deviceType, startDate", 400));
  }

  // Validate the date format
  const startDateObj = new Date(startDate);
  if (isNaN(startDateObj.getTime())) {
    return next(new ErrorResponse("Invalid date format for startDate. Use ISO 8601 format.", 400));
  }

  const validPeriods = ['daily', 'weekly', 'monthly'];
  if (!validPeriods.includes(period.toLowerCase())) {
    return next(new ErrorResponse("Invalid period. Use 'daily', 'weekly', or 'monthly'.", 400));
  }

  // Define the options for the external API call
  const apiOptions = {
    startDate: startDateObj.toISOString().split('T')[0],
    deviceType,
    deviceNo: deviceNumber,
    period: period.toUpperCase(),
  };

  // Fetch pre-aggregated data from the external API based on the period
  const externalData = await externalApiService.getAnalyticsData(apiOptions);

  if (!externalData || !externalData.data || Object.keys(externalData.data).length === 0) {
    return next(new ErrorResponse(`No data found for the ${period} period.`, 404));
  }

  res.status(200).json({
    success: true,
    deviceType,
    deviceNumber,
    period,
    data: externalData.data.analytics.periodic,
    summary: externalData.data.analytics.overall,
    source: "external_api"
  });
});

/**
 * @desc Get historical data with date range support by fetching from external API
 * @route GET /api/sensor/historical-range?deviceType=...&deviceNumber=...&from=...&to=...&groupBy=...
 */
exports.getHistoricalRange = asyncHandler(async (req, res, next) => {
  const { deviceType, deviceNumber, from, to, groupBy = 'day' } = req.query;

  if (!deviceType) {
    return next(new ErrorResponse("Missing required parameter: deviceType", 400));
  }
  
  if (!from || !to) {
    return next(new ErrorResponse("Missing required parameters: from and to dates", 400));
  }

  const startDate = new Date(from);
  const endDate = new Date(to);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return next(new ErrorResponse("Invalid date format. Use ISO 8601 format.", 400));
  }

  // Map groupBy to the period format expected by the external service
  let period;
  switch (groupBy.toLowerCase()) {
    case 'day':
      period = 'DAILY';
      break;
    case 'week':
      period = 'WEEKLY';
      break;
    case 'month':
      period = 'MONTHLY';
      break;
    default:
      return next(new ErrorResponse("Invalid groupBy parameter. Use 'day', 'week', or 'month'.", 400));
  }

  // Fetch pre-aggregated data from the external API based on the date range and grouping
  const externalData = await externalApiService.getAnalyticsData({
    deviceType,
    deviceNo: deviceNumber, // Use deviceNo to match the external API
    startDate: startDate.toISOString().split('T')[0], // The external API expects YYYY-MM-DD
    endDate: endDate.toISOString().split('T')[0], // The external API expects YYYY-MM-DD
  });

  if (!externalData || !externalData.data || Object.keys(externalData.data).length === 0) {
    return next(new ErrorResponse("No data found for the specified date range.", 404));
  }

  res.status(200).json({
    success: true,
    deviceType,
    deviceNumber,
    groupBy,
    data: externalData.data.analytics.periodic,
    summary: externalData.data.analytics.overall,
    source: "external_api"
  });
});
