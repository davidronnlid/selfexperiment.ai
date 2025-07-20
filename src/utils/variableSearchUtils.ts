// Enhanced Variable Search Utilities with Synonym Support
// Provides comprehensive search functionality across variable labels, synonyms, and descriptions

import { supabase } from "./supaBase";
import type { Variable } from "../types/variables";

// ============================================================================
// SEARCH INTERFACES
// ============================================================================

export interface VariableSearchResult {
  variable: Variable;
  matchType: 'exact' | 'partial' | 'synonym' | 'description';
  matchScore: number;
  matchedText: string;
}

export interface VariableSearchOptions {
  includeSynonyms?: boolean;
  includeDescriptions?: boolean;
  includeTags?: boolean;
  fuzzyMatch?: boolean;
  limit?: number;
  category?: string;
  dataType?: string;
  sourceType?: string;
  language?: string;
}

// ============================================================================
// CORE SEARCH FUNCTIONS
// ============================================================================

/**
 * Search variables with comprehensive synonym support
 */
export async function searchVariablesWithSynonyms(
  query: string,
  options: VariableSearchOptions = {}
): Promise<VariableSearchResult[]> {
  const {
    includeSynonyms = true,
    includeDescriptions = true,
    includeTags = false,
    fuzzyMatch = true,
    limit = 50,
    category,
    dataType,
    sourceType,
    language = 'en'
  } = options;

  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return [];
    }

    // Build the search query
    let searchQuery = supabase
      .from('variables')
      .select(`
        *,
        variable_synonyms!inner(
          synonym_label,
          synonym_type,
          search_weight,
          is_primary
        )
      `)
      .eq('is_active', true);

    // Apply filters
    if (category) {
      searchQuery = searchQuery.eq('category', category);
    }
    if (dataType) {
      searchQuery = searchQuery.eq('data_type', dataType);
    }
    if (sourceType) {
      searchQuery = searchQuery.eq('source_type', sourceType);
    }

    // Search in multiple ways
    const searchConditions = [];

    // 1. Direct label match (highest priority)
    searchConditions.push(`label.ilike.%${normalizedQuery}%`);
    
    // 2. Primary label match
    searchConditions.push(`primary_label.ilike.%${normalizedQuery}%`);
    
    // 3. Search labels array match
    searchConditions.push(`search_labels.cs.{${normalizedQuery}}`);

    // 4. Synonym match (if enabled)
    if (includeSynonyms) {
      searchConditions.push(`variable_synonyms.synonym_label.ilike.%${normalizedQuery}%`);
    }

    // 5. Description match (if enabled)
    if (includeDescriptions) {
      searchConditions.push(`description.ilike.%${normalizedQuery}%`);
    }

    // 6. Tags match (if enabled)
    if (includeTags) {
      searchConditions.push(`tags.cs.{${normalizedQuery}}`);
    }

    // Apply search conditions
    searchQuery = searchQuery.or(searchConditions.join(','));

    // Execute query
    const { data, error } = await searchQuery.limit(limit);

    if (error) {
      console.error('Error searching variables:', error);
      return [];
    }

    // Process and score results
    
    
    return results;
  } catch (error) {
    console.error('Failed to search variables with synonyms:', error);
    return [];
  }
}

/**
 * Search variables using the search index table (faster for complex queries)
 */
export async function searchVariablesUsingIndex(
  query: string,
  options: VariableSearchOptions = {}
): Promise<VariableSearchResult[]> {
  const {
    limit = 50,
    category,
    dataType,
    sourceType,
    language = 'en'
  } = options;

  try {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return [];
    }

    // Build query using search index
    let searchQuery = supabase
      .from('variable_search_index')
      .select(`
        search_text,
        search_type,
        variables!inner(*)
      `)
      .ilike('search_text', `%${normalizedQuery}%`)
      .eq('language', language);

    // Apply filters through the variables table
    if (category) {
      searchQuery = searchQuery.eq('variables.category', category);
    }
    if (dataType) {
      searchQuery = searchQuery.eq('variables.data_type', dataType);
    }
    if (sourceType) {
      searchQuery = searchQuery.eq('variables.source_type', sourceType);
    }

    const { data, error } = await searchQuery.limit(limit);

    if (error) {
      console.error('Error searching variables using index:', error);
      return [];
    }

    // Process results and remove duplicates
    const variableMap = new Map<string, VariableSearchResult>();
    
    data?.forEach((item) => {
      const variable = item.variables;
      const existing = variableMap.get(variable.id);
      
      if (!existing || getSearchTypeScore(item.search_type) > existing.matchScore) {
        variableMap.set(variable.id, {
          variable,
          matchType: getSearchTypeMatchType(item.search_type),
          matchScore: getSearchTypeScore(item.search_type),
          matchedText: item.search_text
        });
      }
    });

    return Array.from(variableMap.values())
      .sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error('Failed to search variables using index:', error);
    return [];
  }
}

/**
 * Get variable by unknown of its labels or synonyms
 */
export async function getVariableByAnyLabel(
  label: string,
  options: { language?: string } = {}
): Promise<Variable | null> {
  const { language = 'en' } = options;
  
  try {
    const normalizedLabel = label.toLowerCase().trim();
    
    // Try multiple search approaches
    const searchQueries = [
      // Direct slug match
      supabase
        .from('variables')
        .select('*')
        .eq('slug', normalizedLabel)
        .eq('is_active', true)
        .single(),
      
      // Primary label match
      supabase
        .from('variables')
        .select('*')
        .eq('primary_label', label)
        .eq('is_active', true)
        .single(),
      
      // Synonym match
      supabase
        .from('variable_synonyms')
        .select(`
          synonym_label,
          variables!inner(*)
        `)
        .eq('synonym_label', label)
        .eq('language', language)
        .eq('variables.is_active', true)
        .single()
    ];

    // Try each query until one succeeds
    for (const query of searchQueries) {
      const { data, error } = await query;
      if (!error && data) {
        // Handle synonym query result structure
        if (data.variables) {
          return data.variables;
        }
        return data;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting variable by label:', error);
    return null;
  }
}

// ============================================================================
// SYNONYM MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Add a synonym to a variable
 */
export async function addVariableSynonym(
  variableId: string,
  synonymLabel: string,
  options: {
    synonymType?: 'system' | 'user' | 'common';
    language?: string;
    searchWeight?: number;
    userId?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const {
    synonymType = 'user',
    language = 'en',
    searchWeight = 1,
    userId
  } = options;

  try {
    const { error } = await supabase
      .from('variable_synonyms')
      .insert({
        variable_id: variableId,
        synonym_label: synonymLabel.trim(),
        synonym_type: synonymType,
        language,
        search_weight: searchWeight,
        created_by: userId
      });

    if (error) {
      console.error('Error adding variable synonym:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to add variable synonym:', error);
    return { success: false, error: 'Failed to add synonym' };
  }
}

/**
 * Remove a synonym from a variable
 */
export async function removeVariableSynonym(
  variableId: string,
  synonymLabel: string,
  options: { language?: string; userId?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  const { language = 'en', userId } = options;

  try {
    let query = supabase
      .from('variable_synonyms')
      .delete()
      .eq('variable_id', variableId)
      .eq('synonym_label', synonymLabel.trim())
      .eq('language', language);

    // If userId provided, only delete user-created synonyms
    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error removing variable synonym:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to remove variable synonym:', error);
    return { success: false, error: 'Failed to remove synonym' };
  }
}

/**
 * Get all synonyms for a variable
 */
export async function getVariableSynonyms(
  variableId: string,
  options: { language?: string; includeInactive?: boolean } = {}
): Promise<Array<{
  id: string;
  synonymLabel: string;
  synonymType: string;
  isPrimary: boolean;
  searchWeight: number;
  createdAt: string;
}>> {
  const { language = 'en', includeInactive = false } = options;

  try {
    let query = supabase
      .from('variable_synonyms')
      .select('*')
      .eq('variable_id', variableId)
      .eq('language', language)
      .order('search_weight', { ascending: false });

    if (!includeInactive) {
      query = query.eq('synonym_type', 'system').or('synonym_type.eq.user');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting variable synonyms:', error);
      return [];
    }

    return data?.map(item => ({
      id: item.id,
      synonymLabel: item.synonym_label,
      synonymType: item.synonym_type,
      isPrimary: item.is_primary,
      searchWeight: item.search_weight,
      createdAt: item.created_at
    })) || [];
  } catch (error) {
    console.error('Failed to get variable synonyms:', error);
    return [];
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Process and score search results
 */
function processSearchResults(
  data: unknown[],
  query: string,
  options: VariableSearchOptions
): VariableSearchResult[] {
  const results: VariableSearchResult[] = [];
  const variableMap = new Map<string, VariableSearchResult>();

  data.forEach((item) => {
    const variable = item.variable_synonyms ? item : item;
    const variableId = variable.id;
    
    // Calculate match score
    let matchScore = 0;
    let matchType: VariableSearchResult['matchType'] = 'partial';
    let matchedText = '';

    // Check exact matches
    if (variable.label.toLowerCase() === query) {
      matchScore += 100;
      matchType = 'exact';
      matchedText = variable.label;
    } else if (variable.primary_label?.toLowerCase() === query) {
      matchScore += 95;
      matchType = 'exact';
      matchedText = variable.primary_label;
    }

    // Check partial matches
    if (variable.label.toLowerCase().includes(query)) {
      matchScore += 50;
      matchedText = variable.label;
    }
    if (variable.primary_label?.toLowerCase().includes(query)) {
      matchScore += 45;
      matchedText = variable.primary_label;
    }

    // Check synonyms
    if (item.variable_synonyms) {
      item.variable_synonyms.forEach((synonym: unknown) => {
        if (synonym.synonym_label.toLowerCase().includes(query)) {
          matchScore += synonym.search_weight * 10;
          matchType = 'synonym';
          matchedText = synonym.synonym_label;
        }
      });
    }

    // Check description
    if (options.includeDescriptions && variable.description?.toLowerCase().includes(query)) {
      matchScore += 20;
      matchType = 'description';
      matchedText = variable.description;
    }

    // Update or add result
    const existing = variableMap.get(variableId);
    if (!existing || matchScore > existing.matchScore) {
      variableMap.set(variableId, {
        variable,
        matchType,
        matchScore,
        matchedText
      });
    }
  });

  return Array.from(variableMap.values())
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Get search type score for ranking
 */
function getSearchTypeScore(searchType: string): number {
  switch (searchType) {
    case 'label': return 100;
    case 'synonym': return 80;
    case 'description': return 40;
    case 'tag': return 30;
    default: return 10;
  }
}

/**
 * Get search type match type
 */
function getSearchTypeMatchType(searchType: string): VariableSearchResult['matchType'] {
  switch (searchType) {
    case 'label': return 'exact';
    case 'synonym': return 'synonym';
    case 'description': return 'description';
    default: return 'partial';
  }
}

/**
 * Normalize search query for better matching
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, ''); // Remove special characters
}

/**
 * Check if a string is a potential synonym
 */
export function isValidSynonym(synonym: string): boolean {
  const normalized = synonym.trim();
  return normalized.length >= 2 && normalized.length <= 100;
} 