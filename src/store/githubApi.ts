import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { ActivityFilter, SearchIssuesResponse, SortOption } from '../lib/types'
import type { RootState } from './index'

export interface IssueQueryArgs {
  languages: string[]
  activity: ActivityFilter
  sort: SortOption
  page: number
}

export interface RepoPulse {
  pushedAt: string
  archived: boolean
  stars: number
  openIssues: number
  mergedSampleSize: number
  externalMergedCount: number
  medianDaysToMerge: number | null
}

export interface RecommendedRepo {
  language: string
  fullName: string
  description: string | null
  url: string
  stars: number
  openIssues: number
}

interface GitHubRepoSearchItem {
  full_name: string
  description: string | null
  html_url: string
  stargazers_count: number
  open_issues_count: number
}
interface GitHubRepoSearchResponse {
  items: GitHubRepoSearchItem[]
}

export interface MergedPR {
  number: number
  title: string
  mergedAt: string
  htmlUrl: string
}

function activityToDate(activity: ActivityFilter): string | null {
  const days = { week: 7, month: 30, '3months': 90, any: 0 }[activity]
  if (!days) return null
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)
}

export const githubApi = createApi({
  reducerPath: 'githubApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.github.com/',
    prepareHeaders: (headers, { getState }) => {
      headers.set('Accept', 'application/vnd.github+json')
      // User-supplied token from Settings raises the search limit 10 -> 30 req/min
      const token =
        (getState() as RootState).settings.githubToken || import.meta.env.VITE_GITHUB_TOKEN
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  // Search results go stale fast; keep cache short but nonzero so
  // toggling filters back and forth doesn't refetch.
  keepUnusedDataFor: 120,
  endpoints: (builder) => ({
    searchIssues: builder.query<SearchIssuesResponse, IssueQueryArgs>({
      query: ({ languages, activity, sort, page }) => {
        const parts = ['label:"good first issue"', 'state:open', 'is:issue', 'no:assignee']
        if (languages[0]) parts.push(`language:"${languages[0]}"`)
        const updated = activityToDate(activity)
        if (updated) parts.push(`updated:>=${updated}`)
        return {
          url: 'search/issues',
          params: {
            q: parts.join(' '),
            sort: sort === 'created' ? undefined : sort,
            order: 'desc',
            per_page: 20,
            page,
          },
        }
      },
    }),

    // Merge Reality Check: two requests per repo, cached 30 min.
    // "Will a stranger's PR actually get merged here?" is not directly
    // observable, so we infer it from proxies: recency of pushes, the share
    // of recently merged PRs authored by non-owners, and median time-to-merge.
    repoPulse: builder.query<RepoPulse, string>({
      queryFn: async (repo, _api, _opts, baseQuery) => {
        const [owner] = repo.split('/')

        const repoRes = await baseQuery(`repos/${repo}`)
        if (repoRes.error) return { error: repoRes.error }
        const meta = repoRes.data as {
          pushed_at: string
          archived: boolean
          stargazers_count: number
          open_issues_count: number
        }

        const prsRes = await baseQuery({
          url: 'search/issues',
          params: { q: `repo:${repo} is:pr is:merged`, sort: 'updated', order: 'desc', per_page: 10 },
        })
        if (prsRes.error) return { error: prsRes.error }
        const prs = (prsRes.data as SearchIssuesResponse).items

        const external = prs.filter((p) => p.user.login.toLowerCase() !== owner.toLowerCase())
        const mergeDays = prs
          .map((p) => {
            const closed = (p as { closed_at?: string }).closed_at
            if (!closed) return null
            return (new Date(closed).getTime() - new Date(p.created_at).getTime()) / 86_400_000
          })
          .filter((d): d is number => d !== null)
          .sort((a, b) => a - b)

        return {
          data: {
            pushedAt: meta.pushed_at,
            archived: meta.archived,
            stars: meta.stargazers_count,
            openIssues: meta.open_issues_count,
            mergedSampleSize: prs.length,
            externalMergedCount: external.length,
            medianDaysToMerge: mergeDays.length
              ? Math.round(mergeDays[Math.floor(mergeDays.length / 2)] * 10) / 10
              : null,
          },
        }
      },
      keepUnusedDataFor: 1800,
    }),

    // Resume Match: for each candidate language, find the single most-starred
    // active repo that actually has good-first-issues open — a recommendation
    // is only useful if there's somewhere to start today.
    recommendReposForLanguages: builder.query<RecommendedRepo[], string[]>({
      queryFn: async (languages, _api, _opts, baseQuery) => {
        const results = await Promise.all(
          languages.map(async (language) => {
            const res = await baseQuery({
              url: 'search/repositories',
              params: {
                q: `language:"${language}" good-first-issues:>2 archived:false stars:>50`,
                sort: 'stars',
                order: 'desc',
                per_page: 1,
              },
            })
            if (res.error) return null
            const item = (res.data as GitHubRepoSearchResponse).items[0]
            if (!item) return null
            const repo: RecommendedRepo = {
              language,
              fullName: item.full_name,
              description: item.description,
              url: item.html_url,
              stars: item.stargazers_count,
              openIssues: item.open_issues_count,
            }
            return repo
          }),
        )
        return { data: results.filter((r): r is RecommendedRepo => r !== null) }
      },
      keepUnusedDataFor: 1800,
    }),

    // Repo sync: does {repo} actually exist? Cheap existence check before
    // tracking it, so a typo shows up immediately instead of on first sync.
    checkRepoExists: builder.query<boolean, string>({
      queryFn: async (repo, _api, _opts, baseQuery) => {
        const res = await baseQuery(`repos/${repo}`)
        return { data: !res.error }
      },
    }),

    // Repo sync: merged PRs by this user in a tracked repo, used to award XP.
    // closed_at is used as the merge-date proxy (same convention as
    // repoPulse's median-days-to-merge calc above) — the search/issues
    // endpoint doesn't surface a dedicated merged_at field.
    mergedPRsByAuthor: builder.query<MergedPR[], { repo: string; username: string }>({
      query: ({ repo, username }) => ({
        url: 'search/issues',
        params: {
          q: `repo:${repo} is:pr is:merged author:${username}`,
          sort: 'created',
          order: 'desc',
          per_page: 100,
        },
      }),
      transformResponse: (res: SearchIssuesResponse): MergedPR[] =>
        res.items.map((item) => ({
          number: item.number,
          title: item.title,
          mergedAt: (item as { closed_at?: string }).closed_at ?? item.updated_at,
          htmlUrl: item.html_url,
        })),
    }),
  }),
})

export const {
  useSearchIssuesQuery,
  useLazyRepoPulseQuery,
  useLazyRecommendReposForLanguagesQuery,
  useLazyCheckRepoExistsQuery,
  useLazyMergedPRsByAuthorQuery,
} = githubApi
