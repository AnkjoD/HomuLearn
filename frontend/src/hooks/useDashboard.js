import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadDashboardStats } from "../store/dashboardSlice";
import { loadGoals } from "../store/goalsSlice";
import { loadNotes } from "../store/notesSlice";

export function useDashboard() {
  const dispatch = useDispatch();
  const state = useSelector(s => s.dashboard);
  const refresh = useCallback(() => {
    dispatch(loadDashboardStats());
    dispatch(loadGoals());
    dispatch(loadNotes({ size: 5 }));
  }, [dispatch]);
  useEffect(() => { refresh(); }, [refresh]);
  return { ...state, refresh };
}
