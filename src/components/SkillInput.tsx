import { useState, type KeyboardEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../store'
import { addSkill, removeSkill, setActiveLanguage } from '../store/filtersSlice'

const SUGGESTIONS = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby']

export function SkillInput() {
  const [value, setValue] = useState('')
  const dispatch = useAppDispatch()
  const { skills, activeLanguage } = useAppSelector((s) => s.filters)

  const submit = () => {
    if (value.trim()) {
      dispatch(addSkill(value))
      setValue('')
    }
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      submit()
    }
    if (e.key === 'Backspace' && !value && skills.length) {
      dispatch(removeSkill(skills[skills.length - 1]))
    }
  }

  const unusedSuggestions = SUGGESTIONS.filter(
    (s) => !skills.some((k) => k.toLowerCase() === s.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 focus-within:border-indigo-500">
        {skills.map((skill) => (
          <button
            key={skill}
            onClick={() => dispatch(setActiveLanguage(skill))}
            className={`group flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm transition ${
              skill === activeLanguage
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title={skill === activeLanguage ? 'Currently searching this language' : 'Click to search this language'}
          >
            {skill}
            <span
              role="button"
              aria-label={`Remove ${skill}`}
              onClick={(e) => {
                e.stopPropagation()
                dispatch(removeSkill(skill))
              }}
              className="text-xs opacity-60 transition group-hover:opacity-100 hover:text-red-400"
            >
              ✕
            </span>
          </button>
        ))}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={submit}
          placeholder={skills.length ? 'Add another…' : 'Type a language (e.g. TypeScript) and press Enter'}
          className="min-w-40 flex-1 bg-transparent py-1 text-sm text-slate-100 placeholder-slate-500 outline-none"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-500">Popular:</span>
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => dispatch(addSkill(s))}
              className="rounded-md border border-slate-700 px-2 py-0.5 text-slate-400 transition hover:border-indigo-500 hover:text-indigo-400"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
