import { useState, useEffect, useRef, useCallback } from 'react';
import { messagesApi, conversationsApi } from '../services/api';

/**
 * useChat — manages the full chat lifecycle for one conversation.
 *
 * While an answer is being researched, `pending` holds the live state:
 *   { question, mode, trace: Step[], sources: Source[], content: string }
 * Steps arrive first (understand → plan → retrieve), then sources, then tokens.
 *
 * @param {string[]}    documentIds  documents in scope (used when creating a conversation)
 * @param {string|null} convId       existing conversation id (null = start fresh)
 * @param {{ onTurnComplete?: () => void }} [opts]
 */
export function useChat(documentIds, convId, { onTurnComplete } = {}) {
  const [messages,     setMessages]     = useState([]);
  const [pending,      setPending]      = useState(null);
  const [activeConvId, setActiveConvId] = useState(convId ?? null);
  const [error,        setError]        = useState(null);
  const abortRef       = useRef(null);
  const createdHereRef = useRef(null);   // conversation created by sendMessage — skip reloading it

  // Sync when external convId prop changes
  useEffect(() => {
    setActiveConvId(convId ?? null);
  }, [convId]);

  // Load message history when a conversation is selected
  useEffect(() => {
    if (activeConvId && createdHereRef.current === activeConvId) return;   // local state is already authoritative
    createdHereRef.current = null;
    if (!activeConvId) { setMessages([]); return; }

    let cancelled = false;
    (async () => {
      try {
        const msgs = await messagesApi.list(activeConvId);
        if (!cancelled) setMessages(msgs);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();

    return () => { cancelled = true; };
  }, [activeConvId]);

  // Abort any in-flight stream on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const sendMessage = useCallback(async (content, mode = 'quick') => {
    const question = content?.trim();
    if (!documentIds?.length || !question || abortRef.current) return;

    setError(null);

    // 1. Ensure we have a conversation
    let convIdToUse = activeConvId;
    if (!convIdToUse) {
      try {
        const conv = await conversationsApi.create(documentIds);
        convIdToUse = conv.id;
        createdHereRef.current = conv.id;
        setActiveConvId(conv.id);
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    // 2. Show the question immediately
    setMessages(prev => [...prev, {
      id:        `local-${Date.now()}`,
      role:      'user',
      content:   question,
      timestamp: new Date().toISOString(),
      sources:   [],
    }]);

    const live = { question, mode, trace: [], sources: [], content: '' };
    setPending(live);

    const controller = new AbortController();
    abortRef.current = controller;

    // Tokens arrive far faster than the screen refreshes — render at most once per frame
    let frame = null;
    const flush = () => {
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
      setPending({ ...live });
    };
    const scheduleFlush = () => { frame ??= requestAnimationFrame(flush); };

    let finalMsg = null;
    const finish = () => {
      if (frame != null) cancelAnimationFrame(frame);
      frame = null;
      abortRef.current = null;   // the input is usable again
      setPending(null);
    };

    try {
      for await (const event of messagesApi.stream(convIdToUse, question, mode, controller.signal)) {
        if (event.type === 'step') {
          const step = event.data;
          const idx  = live.trace.findIndex(s => s.id === step.id);
          live.trace = idx === -1
            ? [...live.trace, step]
            : live.trace.map((s, i) => (i === idx ? step : s));
          flush();
        } else if (event.type === 'sources') {
          live.sources = event.data;
          flush();
        } else if (event.type === 'token') {
          live.content += event.data.delta;
          scheduleFlush();
        } else if (event.type === 'done') {
          // Show the saved answer right away; follow-ups arrive separately
          finalMsg = event.data;
          setMessages(prev => [...prev, finalMsg]);
          finish();
          onTurnComplete?.();
        } else if (event.type === 'followups') {
          const { messageId, followUps } = event.data;
          setMessages(prev => prev.map(m => (m.id === messageId ? { ...m, followUps } : m)));
        } else if (event.type === 'error') {
          throw new Error(event.data?.message ?? 'Streaming error');
        }
      }

      if (!finalMsg) {
        setMessages(prev => [...prev, {
          id:        `ai-${Date.now()}`,
          role:      'assistant',
          content:   live.content,
          timestamp: new Date().toISOString(),
          sources:   live.sources,
          trace:     live.trace,
        }]);
        onTurnComplete?.();
      }

    } catch (err) {
      if (finalMsg) {
        // The answer was already delivered; only follow-ups were lost
      } else if (err.name === 'AbortError') {
        // User stopped generation — keep what was streamed so far
        if (live.content) {
          setMessages(prev => [...prev, {
            id:        `stopped-${Date.now()}`,
            role:      'assistant',
            content:   live.content + '\n\n*— stopped*',
            timestamp: new Date().toISOString(),
            sources:   live.sources,
            trace:     live.trace,
          }]);
        }
      } else {
        setError(err.message);
        setMessages(prev => [...prev, {
          id:        `err-${Date.now()}`,
          role:      'assistant',
          content:   `Sorry, something went wrong: ${err.message}`,
          timestamp: new Date().toISOString(),
          sources:   [],
          isError:   true,
        }]);
      }
    } finally {
      if (!finalMsg) finish();
    }
  }, [documentIds, activeConvId, onTurnComplete]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const resetChat = useCallback(() => {
    abortRef.current?.abort();
    createdHereRef.current = null;
    setActiveConvId(null);
    setMessages([]);
    setPending(null);
    setError(null);
  }, []);

  return {
    messages,
    pending,
    isTyping: !!pending,
    activeConvId,
    error,
    sendMessage,
    stop,
    resetChat,
  };
}
