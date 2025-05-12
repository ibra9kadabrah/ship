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
import { VesselInfo as Vessel } from '../types/vessel'; // Import VesselInfo and alias as Vessel
type PendingReport = ReportHistoryItem; // ReportHistoryItem now includes optional names
// type FullReportViewPlaceholder = any; // Placeholder removed
type ReviewPayload = { status: 'approved' | 'rejected'; reviewComments?: string };

/**
 * Fetches the list of pending reports for review.
 * @param vesselId - Optional ID of the vessel to filter reports by.
 */
export const getPendingReports = async (vesselId?: string): Promise<PendingReport[]> => {
  let url = '/reports/pending';
  if (vesselId) {
    url += `?vesselId=${vesselId}`;
  }
  // Use the correct endpoint based on report.routes.ts
  const response = await apiClient.get<PendingReport[]>(url); 
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
 * @param vesselId - Optional ID of the vessel to filter reports by.
 */
export const getAllReports = async (vesselId?: string): Promise<PendingReport[]> => { // Using PendingReport type for now
  let url = '/reports';
  if (vesselId) {
    url += `?vesselId=${vesselId}`;
  }
  // Use the correct endpoint based on report.routes.ts
  const response = await apiClient.get<PendingReport[]>(url); // GET /api/reports
  return response.data;
};

/**
 * Fetches all vessels.
 */
export const getAllVessels = async (): Promise<Vessel[]> => {
  const response = await apiClient.get<Vessel[]>('/vessels');
  return response.data;
};

export const exportVoyageMRVExcel = async (voyageId: string): Promise<void> => {
  try {
    const response = await apiClient.get(`/reports/${voyageId}/export-mrv-excel`, {
      responseType: 'blob', // Important for file downloads
    });
    // Create a blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    // Extract filename from content-disposition header if available, otherwise use a default
    const contentDisposition = response.headers['content-disposition'];
    let filename = `MRV_DCS_Voyage_${voyageId}.xlsx`; // Default filename
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch && filenameMatch.length === 2) {
        filename = filenameMatch[1];
      }
    }
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error('Error exporting MRV Excel:', error);
    // Handle error appropriately in the UI, e.g., show a notification
    throw error.response?.data || new Error('Failed to export MRV Excel report');
  }
};


export default apiClient;
