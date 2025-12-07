/**
 * API client for the Debate Platform backend
 * Base URL configured via NEXT_PUBLIC_API_URL environment variable
 */

import { createClient } from '@/lib/supabase/client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  return headers
}

// Types matching backend models
export interface TopicCreate {
  proposition: string;
  created_by: string;
}

export interface TopicResponse {
  topic_id: string;  // UUID as string
  proposition: string;
  created_by: string;
  created_at?: string;
}

export interface TopicListItem {
  id: string;  // UUID as string
  proposition: string;
  pro_count: number;
  con_count: number;
  created_by?: string;
  created_at?: string;
  pro_avg_validity?: number | null;
  con_avg_validity?: number | null;
  controversy_level?: string | null;
}

export interface ArgumentCreate {
  side: 'pro' | 'con';
  title: string;
  content: string;
  sources?: string;
  author: string;
}

export interface ArgumentResponse {
  id: number;
  topic_id: string;  // UUID as string
  side: 'pro' | 'con';
  title: string;
  content: string;
  sources?: string;
  author: string;
  created_at: string;
  validity_score?: number | null;
  validity_reasoning?: string | null;
  validity_checked_at?: string | null;
  key_urls?: string[] | null;
  votes?: number | null;
}

export interface TopicDetailResponse {
  id: string;  // UUID as string
  proposition: string;
  pro_arguments: ArgumentResponse[];
  con_arguments: ArgumentResponse[];
  overall_summary?: string | null;
  consensus_view?: string | null;
  timeline_view?: Array<{ period: string; description: string }> | null;
}

export interface ArgumentCreateResponse {
  argument_id: number;
}

export interface SummaryResponse {
  overall_summary: string;
  consensus_view: string;
  timeline_view: Array<{ period: string; description: string }>;
}

export interface ValidityVerdictResponse {
  validity_score: number;
  reasoning: string;
  key_urls: string[];
  source_count: number;
}


export interface CommentCreate {
  comment: string;
}

export interface CommentCreateResponse {
  comment_id: number;
}

export interface CommentResponse {
  id: number;
  argument_id: number;
  comment: string;
  created_at: string;
}

export interface PropositionValidateRequest {
  proposition: string;
}

export interface PropositionSuggestion {
  proposition: string;
  type: "policy" | "value" | "fact";
}

export interface PropositionValidationResponse {
  original_input: string;
  is_valid: boolean;
  rejection_reason: string | null;
  interpretation: string | null;
  suggestions: PropositionSuggestion[];
}

// Error handling helper
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    // Extract the detail object - it might be nested or flat
    const detail = errorData.detail || errorData;
    
    // Handle FastAPI validation errors (422) - they come as an array of field errors
    let errorMessage: string;
    if (Array.isArray(detail)) {
      // Format validation errors nicely
      const fieldErrors = detail.map((err: any) => {
        const field = err.loc ? err.loc.join('.') : 'field';
        return `${field}: ${err.msg}`;
      }).join(', ');
      errorMessage = `Validation error: ${fieldErrors}`;
    } else if (typeof detail === 'string') {
      errorMessage = detail;
    } else {
      errorMessage = detail.message || detail.error || `HTTP error! status: ${response.status}`;
    }
    
    const error: any = new Error(errorMessage);
    error.status = response.status;
    error.response = { data: { detail: detail }, status: response.status };
    error.detail = detail; // Store the full detail object for easy access
    
    // Handle 401 (Unauthorized) - redirect to login
    if (response.status === 401) {
      // Clear any stale session
      const supabase = createClient()
      await supabase.auth.signOut()
      // Redirect will be handled by the component
    }
    
    throw error;
  }
  return response.json();
}

// API Functions

/**
 * Create a new debate topic
 * POST /api/topics
 */
export async function createTopic(data: TopicCreate): Promise<TopicResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/topics`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<TopicResponse>(response);
}

/**
 * Get all topics with pro/con argument counts
 * GET /api/topics
 */
export async function getTopics(): Promise<TopicListItem[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/topics`, {
    method: 'GET',
    headers,
  });
  return handleResponse<TopicListItem[]>(response);
}

/**
 * Get a single topic with all its arguments and analysis
 * GET /api/topics/{topic_id}
 */
export async function getTopic(topicId: string): Promise<TopicDetailResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/topics/${topicId}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<TopicDetailResponse>(response);
}

/**
 * Add an argument to a topic
 * POST /api/topics/{topic_id}/arguments
 */
export async function createArgument(
  topicId: string,
  data: ArgumentCreate
): Promise<ArgumentCreateResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/topics/${topicId}/arguments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<ArgumentCreateResponse>(response);
}

/**
 * Get arguments for a topic
 * GET /api/topics/{topic_id}/arguments?side=pro|con|both
 */
export async function getArguments(
  topicId: string,
  side?: 'pro' | 'con' | 'both'
): Promise<ArgumentResponse[]> {
  const headers = await getAuthHeaders()
  const queryParam = side ? `?side=${side}` : '';
  const response = await fetch(`${API_BASE_URL}/api/topics/${topicId}/arguments${queryParam}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<ArgumentResponse[]>(response);
}

/**
 * Generate Claude analysis for a topic
 * POST /api/topics/{topic_id}/generate-summary
 */
export async function generateSummary(topicId: string): Promise<SummaryResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/topics/${topicId}/generate-summary`, {
    method: 'POST',
    headers,
  });
  return handleResponse<SummaryResponse>(response);
}

/**
 * Verify a single argument's validity
 * POST /api/arguments/{argument_id}/verify
 */
export async function verifyArgument(argumentId: number): Promise<ValidityVerdictResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/arguments/${argumentId}/verify`, {
    method: 'POST',
    headers,
  });
  return handleResponse<ValidityVerdictResponse>(response);
}

/**
 * Verify all arguments for a topic
 * POST /api/topics/{topic_id}/verify-all
 */
export async function verifyAllArguments(topicId: string): Promise<{
  total_arguments: number;
  verified: number;
  failed: number;
  results: Array<{
    argument_id: number;
    title: string;
    validity_score?: number;
    status: string;
    error?: string;
  }>;
}> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/topics/${topicId}/verify-all`, {
    method: 'POST',
    headers,
  });
  return handleResponse(response);
}

/**
 * Get arguments sorted by validity score
 * GET /api/topics/{topic_id}/arguments/verified?side=pro|con
 */
export async function getArgumentsSortedByValidity(
  topicId: string,
  side?: 'pro' | 'con'
): Promise<ArgumentResponse[]> {
  const headers = await getAuthHeaders()
  const queryParam = side ? `?side=${side}` : '';
  const response = await fetch(`${API_BASE_URL}/api/topics/${topicId}/arguments/verified${queryParam}`, {
    method: 'GET',
    headers,
  });
  return handleResponse<ArgumentResponse[]>(response);
}


/**
 * Upvote an argument
 * POST /api/arguments/{argument_id}/upvote
 */
export async function upvoteArgument(argumentId: number): Promise<{ argument_id: number; votes: number; user_vote: 'upvote' | 'downvote' | null }> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/arguments/${argumentId}/upvote`, {
    method: 'POST',
    headers,
  });
  return handleResponse<{ argument_id: number; votes: number; user_vote: 'upvote' | 'downvote' | null }>(response);
}

/**
 * Downvote an argument
 * POST /api/arguments/{argument_id}/downvote
 */
export async function downvoteArgument(argumentId: number): Promise<{ argument_id: number; votes: number; user_vote: 'upvote' | 'downvote' | null }> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/arguments/${argumentId}/downvote`, {
    method: 'POST',
    headers,
  });
  return handleResponse<{ argument_id: number; votes: number; user_vote: 'upvote' | 'downvote' | null }>(response);
}

/**
 * Get all comments for an argument
 * GET /api/arguments/{argument_id}/comments
 */
export async function getComments(argumentId: number): Promise<CommentResponse[]> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/arguments/${argumentId}/comments`, {
    method: 'GET',
    headers,
  });
  return handleResponse<CommentResponse[]>(response);
}

/**
 * Create a comment on an argument
 * POST /api/arguments/{argument_id}/comment
 */
export async function commentOnArgument(
  argumentId: number,
  data: CommentCreate
): Promise<CommentCreateResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/arguments/${argumentId}/comment`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<CommentCreateResponse>(response);
}

/**
 * Validate a proposition and get suggestions
 * POST /api/topics/validate-proposition
 */
export async function validateProposition(
  data: PropositionValidateRequest
): Promise<PropositionValidationResponse> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/topics/validate-proposition`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  return handleResponse<PropositionValidationResponse>(response);
}

/**
 * Logout from the backend
 * POST /api/auth/logout
 */
export async function logout(): Promise<{ message: string }> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers,
  });
  return handleResponse<{ message: string }>(response);
}

/**
 * Delete user account
 * DELETE /api/auth/account
 */
export async function deleteAccount(): Promise<{ message: string }> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/auth/account`, {
    method: 'DELETE',
    headers,
  });
  return handleResponse<{ message: string }>(response);
}

