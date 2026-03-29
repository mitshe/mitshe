/**
 * Port for knowledge base integrations (Obsidian, Notion, etc.)
 *
 * Knowledge bases are document-centric systems for storing notes,
 * documentation, and other text content.
 */

export interface KnowledgeBaseNote {
  path: string; // Full path including filename
  name: string; // Just the filename
  content: string; // Note content (usually markdown)
  folder?: string; // Parent folder path
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  frontmatter?: Record<string, unknown>;
}

export interface KnowledgeBaseFolder {
  path: string;
  name: string;
  children?: KnowledgeBaseFolder[];
}

export interface SearchNotesInput {
  query: string;
  folder?: string; // Limit search to folder
  tags?: string[];
  limit?: number;
}

export interface SearchNotesResult {
  notes: KnowledgeBaseNote[];
  total: number;
}

export interface CreateNoteInput {
  path: string; // Full path including filename
  content: string;
  overwrite?: boolean; // If true, overwrite existing file
}

export interface UpdateNoteInput {
  content?: string;
  append?: string; // Append content to end
  prepend?: string; // Prepend content to beginning
}

export interface KnowledgeBaseCommand {
  id: string;
  name: string;
}

export interface KnowledgeBasePort {
  /**
   * Provider type identifier
   */
  getProviderType(): 'obsidian' | 'notion' | 'logseq';

  /**
   * Check if connection is valid
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * Get a note by path
   */
  getNote(path: string): Promise<KnowledgeBaseNote>;

  /**
   * List notes in a folder
   */
  listNotes(folder?: string): Promise<KnowledgeBaseNote[]>;

  /**
   * Search notes
   */
  searchNotes(input: SearchNotesInput): Promise<SearchNotesResult>;

  /**
   * Create a new note
   */
  createNote(input: CreateNoteInput): Promise<KnowledgeBaseNote>;

  /**
   * Update an existing note
   */
  updateNote(path: string, input: UpdateNoteInput): Promise<KnowledgeBaseNote>;

  /**
   * Delete a note
   */
  deleteNote(path: string): Promise<void>;

  /**
   * Append content to a note
   */
  appendToNote(path: string, content: string): Promise<KnowledgeBaseNote>;

  /**
   * Get available commands (Obsidian-specific)
   */
  getCommands?(): Promise<KnowledgeBaseCommand[]>;

  /**
   * Execute a command (Obsidian-specific)
   */
  executeCommand?(commandId: string): Promise<void>;

  /**
   * Get the active/open note (Obsidian-specific)
   */
  getActiveNote?(): Promise<KnowledgeBaseNote | null>;

  /**
   * Open a note in the application (Obsidian-specific)
   */
  openNote?(path: string): Promise<void>;

  /**
   * Get periodic note (daily/weekly/monthly - Obsidian-specific)
   */
  getPeriodicNote?(
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  ): Promise<KnowledgeBaseNote | null>;
}

export const KNOWLEDGE_BASE_PORT = Symbol('KnowledgeBasePort');
