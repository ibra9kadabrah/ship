import axios from 'axios';

// Assuming the backend runs on port 3000
const API_BASE_URL = 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add JWT token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // Assuming token is stored with key 'authToken'
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// You can add specific API call functions here later, e.g.:
// export const loginUser = (credentials) => apiClient.post('/auth/login', credentials);
// export const getCaptains = () => apiClient.get('/users?role=captain');

// --- Office Report Review API Calls ---

// Define types needed for API functions (can be moved to a types file)
// Assuming PendingReport and FullReportViewDTO will be defined in types/report.ts
import { ReportHistoryItem, FullReportViewDTO } from '../types/report'; // Import FullReportViewDTO
type PendingReport = ReportHistoryItem; // ReportHistoryItem now includes optional names
// type FullReportViewPlaceholder = any; // Placeholder removed
type ReviewPayload = { status: 'approved' | 'rejected'; reviewComments?: string };

/**
 * Fetches the list of pending reports for review.
 */
export const getPendingReports = async (): Promise<PendingReport[]> => {
  // Use the correct endpoint based on report.routes.ts
  const response = await apiClient.get<PendingReport[]>('/reports/pending'); 
  return response.data;
};

/**
 * Fetches the full details of a specific report by its ID.
 */
export const getReportById = async (reportId: string): Promise<FullReportViewDTO> => {
  // Use the correct endpoint based on report.routes.ts
  const response = await apiClient.get<FullReportViewDTO>(`/reports/${reportId}`); 
  return response.data;
};

/**
 * Submits a review (approve/reject) for a specific report.
 */
export const reviewReport = async (reportId: string, reviewData: ReviewPayload): Promise<void> => {
   // Use the correct endpoint and method based on report.routes.ts
  await apiClient.patch(`/reports/${reportId}/review`, reviewData); 
};

// --- Admin Report History API Call ---

/**
 * Fetches all reports (for admin view).
 * TODO: Add params for pagination/filtering later.
 */
export const getAllReports = async (): Promise<PendingReport[]> => { // Using PendingReport type for now
  // Use the correct endpoint based on report.routes.ts
  const response = await apiClient.get<PendingReport[]>('/reports'); // GET /api/reports
  return response.data;
};


export default apiClient;
