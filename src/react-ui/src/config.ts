// Global configuration for the application

// API Base URL - can be set via environment variable REACT_APP_API_BASE_URL
// or update this constant with your actual API Gateway URL
// NOTE: After deploying to ap-southeast-2, update this URL with the actual API Gateway endpoint
// You can find it in the CloudFormation stack outputs or SAM deploy output
export const DEFAULT_API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  "https://YOUR_API_ID.execute-api.ap-southeast-2.amazonaws.com/prod";

// Get API base URL from localStorage or use default
export const getApiBaseUrl = (): string => {
  const savedUrl = localStorage.getItem("apiBaseUrl");
  return savedUrl || DEFAULT_API_BASE_URL;
};

// Set API base URL
export const setApiBaseUrl = (url: string): void => {
  localStorage.setItem("apiBaseUrl", url);
};

