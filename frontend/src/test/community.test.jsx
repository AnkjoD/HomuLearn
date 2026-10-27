import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import communityReducer, {
  loadPosts,
  addPost,
  editPost,
  removePost,
  loadComments,
  addComment,
  editComment,
  removeComment,
} from "../store/communitySlice";
import authReducer from "../store/authSlice";
import Community from "../pages/Community";
import * as api from "../api/community";

vi.mock("../api/community", () => ({
  fetchPosts: vi.fn(),
  fetchPost: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  fetchComments: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const makeStore = (initialAuthState = { user: { id: "alice-public-id", email: "alice@test.com", name: "Alice" } }) =>
  configureStore({
    reducer: {
      community: communityReducer,
      auth: authReducer,
    },
    preloadedState: {
      auth: initialAuthState,
    },
  });

describe("Community slice and component integration", () => {
  let root, host;

  beforeEach(() => {
    vi.clearAllMocks();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null;
    host?.remove();
  });

  it("handles posts and comments state transitions properly", async () => {
    const store = makeStore();

    api.fetchPosts.mockResolvedValueOnce({
      content: [
        {
          id: 1,
          title: "Bài 1",
          content: "Nội dung bài 1",
          author: { id: "alice-public-id", name: "Alice", email: "alice@test.com" },
          commentCount: 0,
          createdAt: "2025-01-01T10:00:00",
        },
      ],
      number: 0,
      totalPages: 1,
      totalElements: 1,
    });

    await act(async () => {
      await store.dispatch(loadPosts());
    });

    let state = store.getState().community;
    expect(state.posts.length).toBe(1);
    expect(state.posts[0].title).toBe("Bài 1");

    // addPost
    api.createPost.mockResolvedValueOnce({
      id: 2,
      title: "Bài mới",
      content: "Nội dung mới",
      author: { id: "alice-public-id", name: "Alice", email: "alice@test.com" },
      commentCount: 0,
      createdAt: "2025-01-01T11:00:00",
    });

    await act(async () => {
      await store.dispatch(addPost({ title: "Bài mới", content: "Nội dung mới" }));
    });

    state = store.getState().community;
    expect(state.posts.length).toBe(2);
    expect(state.posts[0].id).toBe(2);

    api.fetchComments.mockResolvedValueOnce([]);
    await store.dispatch(loadComments(2));
    // addComment updates count
    api.createComment.mockResolvedValueOnce({
      id: 101,
      postId: 2,
      content: "Hay lắm",
      author: { id: "alice-public-id", name: "Alice", email: "alice@test.com" },
      createdAt: "2025-01-01T11:05:00",
    });

    await act(async () => {
      await store.dispatch(addComment({ postId: 2, content: "Hay lắm" }));
    });

    state = store.getState().community;
    expect(state.comments.length).toBe(1);
    expect(state.posts.find((p) => p.id === 2).commentCount).toBe(1);

    // removeComment
    api.deleteComment.mockResolvedValueOnce(null);
    await act(async () => {
      await store.dispatch(removeComment({ postId: 2, commentId: 101 }));
    });

    state = store.getState().community;
    expect(state.comments.length).toBe(0);

    // removePost
    api.deletePost.mockResolvedValueOnce(null);
    await act(async () => {
      await store.dispatch(removePost(2));
    });

    state = store.getState().community;
    expect(state.posts.length).toBe(1);
    expect(state.posts[0].id).toBe(1);
  });

  it("renders community empty state when no posts", async () => {
    const store = makeStore();
    api.fetchPosts.mockResolvedValueOnce({
      content: [],
      number: 0,
      totalPages: 0,
      totalElements: 0,
    });

    await act(async () => {
      root.render(
        <Provider store={store}>
          <Community />
        </Provider>
      );
    });

    expect(host.querySelector('[data-testid="empty-posts"]')).not.toBeNull();
  });
});
