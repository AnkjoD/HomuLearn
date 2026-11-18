import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePomodoro } from '../hooks/usePomodoro';
import { useGoals } from '../hooks/useGoals';
import { useDashboard } from '../hooks/useDashboard';
import goals, { loadGoals, addGoal, removeGoal } from '../store/goalsSlice';
import pomodoro, { loadPomodoroSessions, savePomodoroSession } from '../store/pomodoroSlice';
import dashboard, { loadDashboardStats } from '../store/dashboardSlice';
import notes from '../store/notesSlice';
import { logout } from '../store/authSlice';
vi.mock('../api/goals', () => ({ fetchGoals: vi.fn(), createGoal: vi.fn(), updateGoal: vi.fn(), deleteGoal: vi.fn() }));
vi.mock('../api/pomodoro', () => ({ fetchPomodoroSessions: vi.fn(), createPomodoroSession: vi.fn() }));
vi.mock('../api/dashboard', () => ({ fetchDashboardStats: vi.fn() }));
vi.mock('../api/notesApi', () => ({ fetchNotes: vi.fn() }));
import * as goalsApi from '../api/goals';
import * as pomoApi from '../api/pomodoro';
import * as dashApi from '../api/dashboard';
import { fetchNotes } from '../api/notesApi';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root, host, value;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const makeStore = () => configureStore({ reducer: { goals, pomodoro, dashboard, notes } });
function mount(hook, store) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  function Probe() { value = hook(); return null; }
  act(() => root.render(store ? <Provider store={store}><Probe /></Provider> : <Probe />));
}
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); vi.useRealTimers(); });

describe('Productivity timer lifecycle', () => {
  it('pause/resume preserves time and completion fires exactly once', () => {
    vi.useFakeTimers(); const done = vi.fn();
    mount(() => usePomodoro({ workMinutes: 1, onWorkComplete: done }));
    act(() => value.start()); act(() => vi.advanceTimersByTime(10000));
    act(() => value.pause()); expect(value.seconds).toBe(50);
    act(() => vi.advanceTimersByTime(30000)); expect(value.seconds).toBe(50);
    act(() => value.start()); act(() => vi.advanceTimersByTime(50000));
    expect(done).toHaveBeenCalledTimes(1); expect(done.mock.calls[0][0].durationMinutes).toBe(1);
    expect(value.mode).toBe('shortBreak'); act(() => vi.advanceTimersByTime(5000));
    expect(done).toHaveBeenCalledTimes(1);
  });
  it('skip and reset never record a completed focus session', () => {
    vi.useFakeTimers(); const done = vi.fn();
    mount(() => usePomodoro({ onWorkComplete: done }));
    act(() => value.start()); act(() => value.skip());
    expect(value.mode).toBe('shortBreak'); expect(done).not.toHaveBeenCalled();
    act(() => value.changeMode('work')); act(() => value.start()); act(() => value.reset());
    expect(value.seconds).toBe(1500); expect(done).not.toHaveBeenCalled();
  });
  it('uses the deadline after background clock jumps and cleans intervals on unmount', () => {
    vi.useFakeTimers(); const done = vi.fn();
    mount(() => usePomodoro({ workMinutes: 1, onWorkComplete: done }));
    act(() => value.start()); vi.setSystemTime(Date.now() + 65000);
    act(() => vi.advanceTimersByTime(250)); expect(done).toHaveBeenCalledTimes(1);
    act(() => value.start()); act(() => root.unmount()); root = null;
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Productivity data hooks and account isolation', () => {
  it('useGoals fetches persisted goals on mount and exposes load failures', async () => {
    goalsApi.fetchGoals.mockRejectedValueOnce(new Error('Mất mạng'));
    mount(useGoals, makeStore());
    await act(async () => {});
    expect(goalsApi.fetchGoals).toHaveBeenCalledTimes(1); expect(value.error).toBe('Mất mạng');
  });
  it('useDashboard refreshes real stats and related lists', async () => {
    dashApi.fetchDashboardStats.mockResolvedValue({ noteCount: 7 }); goalsApi.fetchGoals.mockResolvedValue([]); fetchNotes.mockResolvedValue({ items: [] });
    mount(useDashboard, makeStore()); await act(async () => {});
    expect(value.stats.noteCount).toBe(7);
    await act(async () => { value.refresh(); });
    expect(dashApi.fetchDashboardStats).toHaveBeenCalledTimes(2); expect(fetchNotes).toHaveBeenCalledTimes(2);
  });
  it('an old goals load cannot erase a just-created goal', async () => {
    const old = deferred(); goalsApi.fetchGoals.mockReturnValueOnce(old.promise); goalsApi.createGoal.mockResolvedValue({ id: 1 });
    const s = makeStore(); const p = s.dispatch(loadGoals()); await s.dispatch(addGoal({}));
    old.resolve([]); await p; expect(s.getState().goals.items).toEqual([{ id: 1 }]);
  });
  it('delete errors reach the UI without removing persisted items', async () => {
    goalsApi.fetchGoals.mockResolvedValue([{ id: 1 }]); goalsApi.deleteGoal.mockRejectedValue(new Error('Không xóa được'));
    const s = makeStore(); await s.dispatch(loadGoals()); await s.dispatch(removeGoal(1));
    expect(s.getState().goals.items).toHaveLength(1); expect(s.getState().goals.mutationError).toBe('Không xóa được');
  });
  it('history uses the server envelope and deduplicates a retry response', async () => {
    pomoApi.fetchPomodoroSessions.mockResolvedValue({ sessions: [{ id: 1 }], totalMinutes: 25 });
    pomoApi.createPomodoroSession.mockResolvedValue({ id: 1 });
    const s = makeStore(); await s.dispatch(loadPomodoroSessions()); await s.dispatch(savePomodoroSession({ data: {}, idempotencyKey: 'same' }));
    expect(s.getState().pomodoro.history).toEqual([{ id: 1 }]);
  });
  it('logout discards pending responses for all three private modules', async () => {
    const a = deferred(), b = deferred(), c = deferred();
    goalsApi.createGoal.mockReturnValue(a.promise); pomoApi.createPomodoroSession.mockReturnValue(b.promise); dashApi.fetchDashboardStats.mockReturnValue(c.promise);
    const s = makeStore(); const requests = [s.dispatch(addGoal({})), s.dispatch(savePomodoroSession({ data: {} })), s.dispatch(loadDashboardStats())];
    s.dispatch(logout.fulfilled(null, 'logout')); a.resolve({ id: 99 }); b.resolve({ id: 99 }); c.resolve({ noteCount: 99 }); await Promise.all(requests);
    expect(s.getState().goals.items).toEqual([]); expect(s.getState().pomodoro.history).toEqual([]); expect(s.getState().dashboard.stats).toBeNull();
  });
});
