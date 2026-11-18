import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadGoals } from "../store/goalsSlice";

export function useGoals() {
  const dispatch = useDispatch();
  const state = useSelector(s => s.goals);
  useEffect(() => { dispatch(loadGoals()); }, [dispatch]);
  return state;
}
