import { useState, useRef, useEffect, useCallback } from "react";

/**
 * usePomodoro hook — Quản lý đếm giờ Pomodoro bằng Date.now() để chống drift.
 * @param {object} options
 * @param {number} options.workMinutes
 * @param {number} options.shortBreakMinutes
 * @param {number} options.longBreakMinutes
 * @param {function} options.onWorkComplete - Gọi khi phiên work kết thúc (durationMinutes, startedAt)
 */
export function usePomodoro({
  workMinutes = 25,
  shortBreakMinutes = 5,
  longBreakMinutes = 15,
  onWorkComplete,
} = {}) {
  const [mode, setMode] = useState("work"); // "work" | "shortBreak" | "longBreak"
  const [running, setRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(workMinutes * 60 * 1000);
  const [cycle, setCycle] = useState(1);

  const endTimeRef = useRef(null);
  const startedAtRef = useRef(null);
  const timerRef = useRef(null);
  const onWorkCompleteRef = useRef(onWorkComplete);
  onWorkCompleteRef.current = onWorkComplete;

  const getDurationMs = useCallback(
    (m) => {
      if (m === "work") return workMinutes * 60 * 1000;
      if (m === "shortBreak") return shortBreakMinutes * 60 * 1000;
      return longBreakMinutes * 60 * 1000;
    },
    [workMinutes, shortBreakMinutes, longBreakMinutes]
  );

  // Chuyển chế độ và reset timer
  const changeMode = useCallback(
    (newMode) => {
      setRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setMode(newMode);
      setRemainingMs(getDurationMs(newMode));
      endTimeRef.current = null;
      startedAtRef.current = null;
    },
    [getDurationMs]
  );

  // Bắt đầu hoặc tiếp tục
  const start = useCallback(() => {
    if (running) return;
    const now = Date.now();
    if (!startedAtRef.current) {
      startedAtRef.current = new Date().toISOString();
    }
    endTimeRef.current = now + remainingMs;
    setRunning(true);
  }, [running, remainingMs]);

  // Tạm dừng
  const pause = useCallback(() => {
    if (!running) return;
    const now = Date.now();
    const left = Math.max(0, endTimeRef.current - now);
    setRemainingMs(left);
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [running]);

  // Reset về ban đầu của chế độ hiện tại
  const reset = useCallback(() => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRemainingMs(getDurationMs(mode));
    endTimeRef.current = null;
    startedAtRef.current = null;
  }, [getDurationMs, mode]);

  // Xử lý khi hết giờ
  const handleFinish = useCallback((completed = true) => {
    setRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (mode === "work") {
      if (completed && onWorkCompleteRef.current) {
        onWorkCompleteRef.current({
          durationMinutes: workMinutes,
          startedAt: startedAtRef.current || new Date().toISOString(),
        });
      }
      startedAtRef.current = null;
      if (cycle % 4 === 0) {
        setMode("longBreak");
        setRemainingMs(getDurationMs("longBreak"));
      } else {
        setMode("shortBreak");
        setRemainingMs(getDurationMs("shortBreak"));
      }
    } else {
      setCycle((c) => c + 1);
      setMode("work");
      setRemainingMs(getDurationMs("work"));
      startedAtRef.current = null;
    }
  }, [mode, workMinutes, cycle, getDurationMs]);

  // Bỏ qua (skip) sang chế độ tiếp theo
  const skip = useCallback(() => {
    handleFinish(false);
  }, [handleFinish]);

  // Hiệu ứng chạy đồng hồ bằng Date.now() chống trôi
  useEffect(() => {
    if (!running) return;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, endTimeRef.current - now);
      setRemainingMs(left);
      if (left <= 0) {
        handleFinish();
      }
    }, 250);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, handleFinish]);

  const configRef = useRef(`${workMinutes}/${shortBreakMinutes}/${longBreakMinutes}`);
  useEffect(() => {
    const config = `${workMinutes}/${shortBreakMinutes}/${longBreakMinutes}`;
    if (configRef.current === config) return;
    configRef.current = config;
    reset();
  }, [workMinutes, shortBreakMinutes, longBreakMinutes, reset]);

  const totalMs = getDurationMs(mode);
  const seconds = Math.ceil(remainingMs / 1000);
  const progress = totalMs > 0 ? (totalMs - remainingMs) / totalMs : 0;

  return {
    mode,
    running,
    seconds,
    totalSeconds: Math.round(totalMs / 1000),
    progress: Math.min(1, Math.max(0, progress)),
    cycle,
    start,
    pause,
    reset,
    skip,
    changeMode,
  };
}
