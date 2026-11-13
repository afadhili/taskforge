import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api'

type AssistantReply = { answer: string; requests_used: number; requests_remaining: number }
type AssistantUsage = { requests_used: number; requests_remaining: number }

function apiMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response
    return response?.data?.message ?? Object.values(response?.data?.errors ?? {}).flat()[0] ?? 'The request failed. Please try again.'
  }
  return 'The request failed. Please try again.'
}

export function AssistantPage({ workspaceId, workspaceName }: { workspaceId: number; workspaceName: string }) {
  const [question, setQuestion] = useState('')
  const [reply, setReply] = useState<AssistantReply | null>(null)
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState('')
  const [key, setKey] = useState('')
  const [keyMessage, setKeyMessage] = useState('')
  const [keyError, setKeyError] = useState('')
  const [keyBusy, setKeyBusy] = useState(false)
  const currentWorkspaceId = useRef(workspaceId)
  useEffect(() => {
    currentWorkspaceId.current = workspaceId
    setQuestion('')
    setReply(null)
    setError('')
  }, [workspaceId])
  const keyStatus = useQuery({
    queryKey: ['assistant-key-status'],
    queryFn: async () => (await api.get('/auth/ai-key')).data.data as { has_custom_key: boolean },
  })
  const usageStatus = useQuery({
    queryKey: ['assistant-usage'],
    queryFn: async () => (await api.get('/auth/ai-usage')).data.data as AssistantUsage,
  })

  const ask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    setError(''); setAsking(true)
    try {
      const response = await api.post(`/workspaces/${workspaceId}/assistant`, { question: trimmed })
      if (currentWorkspaceId.current !== workspaceId) return
      setReply(response.data.data as AssistantReply)
      await usageStatus.refetch()
      setQuestion('')
    } catch (reason) {
      if (currentWorkspaceId.current === workspaceId) setError(apiMessage(reason))
    } finally {
      if (currentWorkspaceId.current === workspaceId) setAsking(false)
    }
  }

  const saveKey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!key.trim()) return
    setKeyBusy(true); setKeyError(''); setKeyMessage('')
    try {
      await api.put('/auth/ai-key', { api_key: key.trim() })
      setKey('')
      setKeyMessage('Your key is saved securely. It will not be shown again.')
      await keyStatus.refetch()
    } catch (reason) { setKeyError(apiMessage(reason)) }
    finally { setKeyBusy(false) }
  }

  const removeKey = async () => {
    setKeyBusy(true); setKeyError(''); setKeyMessage('')
    try {
      await api.delete('/auth/ai-key')
      setKeyMessage('Your personal key was removed.')
      await keyStatus.refetch()
    } catch (reason) { setKeyError(apiMessage(reason)) }
    finally { setKeyBusy(false) }
  }

  return <div className="content assistant-page">
    <div className="section-heading assistant-heading"><div><div className="eyebrow">Workspace assistant</div><h1>Ask about {workspaceName}</h1><p>Get answers grounded in the current workspace’s projects and task status.</p></div></div>
    <section className="assistant-quota" aria-live="polite">
      <div><strong>Daily allowance</strong><span>{reply ? `${reply.requests_remaining} of 30 requests remaining today` : usageStatus.data ? `${usageStatus.data.requests_remaining} of 30 requests remaining today` : 'Up to 30 requests per day'}</span></div>
      <div className="quota-track" aria-label={reply ? `${reply.requests_remaining} of 30 requests remaining today` : usageStatus.data ? `${usageStatus.data.requests_remaining} of 30 requests remaining today` : '30 requests per day'}><i style={{ width: `${((reply?.requests_remaining ?? usageStatus.data?.requests_remaining ?? 30) / 30) * 100}%` }} /></div>
      {!reply && !usageStatus.data && <small>{usageStatus.isError ? 'Could not load today’s usage.' : 'Loading today’s usage…'}</small>}
    </section>

    <section className="assistant-chat panel" aria-label="AI Assistant conversation" aria-busy={asking}>
      {reply ? <article className="assistant-answer" aria-live="polite"><div className="assistant-answer-label">TaskForge Assistant</div><p>{reply.answer}</p></article> : <div className="assistant-empty"><span className="assistant-icon" aria-hidden="true">✦</span><h2>What would you like to know?</h2><p>Ask about project progress, open tasks, or how work is distributed across {workspaceName}.</p><div className="assistant-examples"><button type="button" onClick={() => setQuestion('Give me a summary of project progress and open tasks.')}>Summarize project progress</button><button type="button" onClick={() => setQuestion('How many tasks are in each status?')}>Count tasks by status</button></div></div>}
      {asking && <p className="muted" role="status">The assistant is preparing an answer…</p>}
      {error && <div className="assistant-error" role="alert"><p>{error}</p>{error.toLowerCase().includes('api key') && <span>Add a personal API key below to enable the assistant.</span>}</div>}
      <form className="assistant-prompt" onSubmit={ask}>
        <label className="sr-only" htmlFor="assistant-question">Your question</label>
        <textarea id="assistant-question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} rows={2} maxLength={4000} placeholder="Ask a question about this workspace…" />
        <button className="primary" type="submit" disabled={!question.trim() || asking || ((reply?.requests_remaining ?? usageStatus.data?.requests_remaining) === 0)}>{asking ? 'Thinking…' : ((reply?.requests_remaining ?? usageStatus.data?.requests_remaining) === 0) ? 'Daily limit reached' : 'Ask Assistant'}</button>
      </form>
      <small className="assistant-hint">Workspace summary only · Press Enter to send, Shift + Enter for a new line</small>
    </section>

    <section className="assistant-key panel">
      <div><div className="eyebrow">Personal provider key</div><h2>Your AI API key</h2><p>{keyStatus.data?.has_custom_key ? 'A personal key is saved and takes priority over the workspace default.' : 'Add your own OpenAI-compatible API key. It is encrypted when stored and never shown back to you.'}</p></div>
      {keyStatus.isLoading ? <p className="muted" role="status">Checking key status…</p> : keyStatus.isError ? <div className="assistant-error" role="alert">{apiMessage(keyStatus.error)} <button type="button" className="secondary" onClick={() => keyStatus.refetch()}>Try again</button></div> : <>
        <form className="assistant-key-form" onSubmit={saveKey}><label htmlFor="assistant-api-key">{keyStatus.data?.has_custom_key ? 'Replace personal key' : 'API key'}</label><div className="assistant-key-controls"><input id="assistant-api-key" type="password" autoComplete="new-password" value={key} onChange={(event) => setKey(event.target.value)} placeholder={keyStatus.data?.has_custom_key ? 'Enter a new key to replace it' : 'Paste your API key'} maxLength={500} /><button className="primary" disabled={!key.trim() || keyBusy}>{keyBusy ? 'Saving…' : 'Save key'}</button>{keyStatus.data?.has_custom_key && <button type="button" className="secondary" onClick={removeKey} disabled={keyBusy}>Remove</button>}</div></form>
        {keyError && <p className="error" role="alert">{keyError}</p>}{keyMessage && <p className="success-text" role="status">{keyMessage}</p>}
      </>}
    </section>
  </div>
}
