export interface GitHubLabel {
  id: number
  name: string
  color: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  html_url: string
  repository_url: string
  state: string
  comments: number
  created_at: string
  updated_at: string
  body: string | null
  labels: GitHubLabel[]
  user: {
    login: string
    avatar_url: string
  }
  /** Author's relationship to the repo, e.g. OWNER, MEMBER, COLLABORATOR, CONTRIBUTOR, NONE. */
  author_association?: string
  closed_at?: string | null
}

export interface SearchIssuesResponse {
  total_count: number
  incomplete_results: boolean
  items: GitHubIssue[]
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DifficultyEstimate {
  level: Difficulty
  hours: string
  reasons: string[]
}

export type ActivityFilter = 'any' | 'week' | 'month' | '3months'
export type SortOption = 'created' | 'updated' | 'comments' | 'reactions'
