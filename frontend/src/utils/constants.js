export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Docify';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const ROUTES = {
  HOME: '/',
  // AUTH
  LOGIN: '/login',
  REGISTER: '/register',
  // Add more routes as the app grows
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};
