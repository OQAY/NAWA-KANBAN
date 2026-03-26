import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../api/services';
import { useAuthStore } from '../stores/authStore';
import { useDebounce } from '../hooks/useDebounce';
import './GlobalSearch.css';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  projectName?: string;
  projectId?: string;
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchApi.search(debouncedQuery)
      .then(res => setResults(Array.isArray(res.data) ? res.data : []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    if (result.type === 'task' && result.projectId) {
      navigate(`/board/${result.projectId}`);
    } else if (result.type === 'project') {
      navigate(`/board/${result.id}`);
    }
  };

  if (!isAuthenticated) return null;

  const taskResults = results.filter(r => r.type === 'task');
  const projectResults = results.filter(r => r.type === 'project');

  return (
    <>
      <button className="global-search-trigger" onClick={() => setIsOpen(true)} title="Busca global (Ctrl+K)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <span className="global-search-shortcut">Ctrl+K</span>
      </button>

      {isOpen && (
        <div className="global-search-overlay" onClick={() => { setIsOpen(false); setQuery(''); }}>
          <div className="global-search-modal" onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar tarefas e projetos..."
              className="global-search-input"
            />

            <div className="global-search-results">
              {loading && <p className="global-search-status">Buscando...</p>}
              {!loading && debouncedQuery.length >= 2 && results.length === 0 && (
                <p className="global-search-status">Sem resultados</p>
              )}

              {taskResults.length > 0 && (
                <div className="global-search-group">
                  <h4>Tarefas ({taskResults.length})</h4>
                  {taskResults.map(r => (
                    <button key={r.id} className="global-search-item" onClick={() => handleSelect(r)}>
                      <span className="search-item-icon">T</span>
                      <div className="search-item-content">
                        <span className="search-item-title">{r.title}</span>
                        {r.projectName && <span className="search-item-meta">{r.projectName}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {projectResults.length > 0 && (
                <div className="global-search-group">
                  <h4>Projetos ({projectResults.length})</h4>
                  {projectResults.map(r => (
                    <button key={r.id} className="global-search-item" onClick={() => handleSelect(r)}>
                      <span className="search-item-icon">P</span>
                      <div className="search-item-content">
                        <span className="search-item-title">{r.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
