import { login, logout } from "./authSlice";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchPosts,
  fetchPost,
  createPost,
  updatePost,
  deletePost,
  fetchComments,
  createComment,
  updateComment,
  deleteComment,
} from "../api/community";

export const loadPosts = createAsyncThunk(
  "community/loadPosts",
  async ({ page = 0, size = 10 } = {}, { rejectWithValue }) => {
    try {
      return await fetchPosts(page, size);
    } catch (err) {
      return rejectWithValue(err.message || "Không tải được danh sách bài viết");
    }
  }
);

export const loadPost = createAsyncThunk(
  "community/loadPost",
  async (id, { rejectWithValue }) => {
    try {
      return await fetchPost(id);
    } catch (err) {
      return rejectWithValue(err.message || "Không tải được bài viết");
    }
  }
);

export const addPost = createAsyncThunk(
  "community/addPost",
  async (data, { rejectWithValue }) => {
    try {
      return await createPost(data);
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        fieldErrors: err.fieldErrors,
      });
    }
  }
);

export const editPost = createAsyncThunk(
  "community/editPost",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      return await updatePost(id, data);
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        fieldErrors: err.fieldErrors,
      });
    }
  }
);

export const removePost = createAsyncThunk(
  "community/removePost",
  async (id, { rejectWithValue }) => {
    try {
      await deletePost(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || "Không xóa được bài viết");
    }
  }
);

export const loadComments = createAsyncThunk(
  "community/loadComments",
  async (postId, { rejectWithValue }) => {
    try {
      return await fetchComments(postId);
    } catch (err) {
      return rejectWithValue(err.message || "Không tải được bình luận");
    }
  }
);

export const addComment = createAsyncThunk(
  "community/addComment",
  async ({ postId, content }, { rejectWithValue }) => {
    try {
      return await createComment(postId, { content });
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        fieldErrors: err.fieldErrors,
      });
    }
  }
);

export const editComment = createAsyncThunk(
  "community/editComment",
  async ({ postId, commentId, content }, { rejectWithValue }) => {
    try {
      return await updateComment(postId, commentId, { content });
    } catch (err) {
      return rejectWithValue({
        message: err.message,
        fieldErrors: err.fieldErrors,
      });
    }
  }
);

export const removeComment = createAsyncThunk(
  "community/removeComment",
  async ({ postId, commentId }, { rejectWithValue }) => {
    try {
      await deleteComment(postId, commentId);
      return commentId;
    } catch (err) {
      return rejectWithValue(err.message || "Không xóa được bình luận");
    }
  }
);

const initialState = {
  posts: [], page: 0, size: 10, totalPages: 0, totalElements: 0,
  selectedPost: null, comments: [], commentsPostId: null,
  status: "idle", detailStatus: "idle", commentsStatus: "idle",
  submitting: false, commentSubmitting: false,
  error: null, detailError: null, commentsError: null,
  listRequestId: null, detailRequestId: null, commentsRequestId: null,
  mutationRequestId: null, commentMutationRequestId: null,
};

const communitySlice = createSlice({
  name: "community", initialState,
  reducers: {
    clearSelectedPost(state) {
      state.selectedPost = null; state.comments = []; state.commentsPostId = null;
      state.detailRequestId = state.commentsRequestId = state.commentMutationRequestId = null;
      state.detailStatus = state.commentsStatus = "idle";
      state.detailError = state.commentsError = null; state.commentSubmitting = false;
    },
    clearError(state) { state.error = null; },
  },
  extraReducers(builder) {
    builder.addCase(loadPosts.pending, (state, action) => {
      state.listRequestId = action.meta.requestId; state.status = "loading"; state.error = null;
    }).addCase(loadPosts.fulfilled, (state, action) => {
      if (state.listRequestId !== action.meta.requestId) return;
      state.listRequestId = null; state.status = "succeeded";
      state.posts = action.payload.content; state.page = action.payload.number;
      state.size = action.payload.size || action.meta.arg?.size || 10;
      state.totalPages = action.payload.totalPages; state.totalElements = action.payload.totalElements;
    }).addCase(loadPosts.rejected, (state, action) => {
      if (state.listRequestId !== action.meta.requestId) return;
      state.listRequestId = null; state.status = "failed"; state.error = action.payload;
    });
    builder.addCase(loadPost.pending, (state, action) => {
      state.detailRequestId = action.meta.requestId; state.selectedPost = null;
      state.detailStatus = "loading"; state.detailError = null;
    }).addCase(loadPost.fulfilled, (state, action) => {
      if (state.detailRequestId !== action.meta.requestId) return;
      state.detailRequestId = null; state.selectedPost = action.payload; state.detailStatus = "succeeded";
    }).addCase(loadPost.rejected, (state, action) => {
      if (state.detailRequestId !== action.meta.requestId) return;
      state.detailRequestId = null; state.detailStatus = "failed"; state.detailError = action.payload;
    });
    builder.addCase(loadComments.pending, (state, action) => {
      state.commentsRequestId = action.meta.requestId; state.commentsPostId = action.meta.arg;
      state.comments = []; state.commentsStatus = "loading"; state.commentsError = null;
    }).addCase(loadComments.fulfilled, (state, action) => {
      if (state.commentsRequestId !== action.meta.requestId) return;
      state.commentsRequestId = null; state.comments = action.payload; state.commentsStatus = "succeeded";
    }).addCase(loadComments.rejected, (state, action) => {
      if (state.commentsRequestId !== action.meta.requestId) return;
      state.commentsRequestId = null; state.commentsStatus = "failed"; state.commentsError = action.payload;
    });
    for (const thunk of [addPost, editPost, removePost]) {
      builder.addCase(thunk.pending, (state, action) => {
        state.mutationRequestId = action.meta.requestId; state.submitting = true; state.error = null;
      }).addCase(thunk.fulfilled, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = state.listRequestId = null; state.submitting = false; state.status = "succeeded";
        if (thunk === addPost) {
          if (state.page === 0) state.posts = [action.payload, ...state.posts].slice(0, state.size);
          state.totalElements++;
        } else if (thunk === editPost) {
          const i = state.posts.findIndex(p => p.id === action.payload.id);
          if (i >= 0) state.posts[i] = action.payload;
          if (state.selectedPost?.id === action.payload.id) {
            state.detailRequestId = null; state.selectedPost = action.payload;
          }
        } else {
          state.posts = state.posts.filter(p => p.id !== action.payload);
          state.totalElements = Math.max(0, state.totalElements - 1);
          if (state.selectedPost?.id === action.payload) {
            state.selectedPost = null; state.comments = []; state.commentsPostId = null;
            state.detailRequestId = state.commentsRequestId = null;
          }
        }
        state.totalPages = Math.ceil(state.totalElements / state.size);
      }).addCase(thunk.rejected, (state, action) => {
        if (state.mutationRequestId !== action.meta.requestId) return;
        state.mutationRequestId = null; state.submitting = false;
        state.error = typeof action.payload === "string" ? action.payload : action.payload?.message;
      });
    }
    for (const thunk of [addComment, editComment, removeComment]) {
      builder.addCase(thunk.pending, (state, action) => {
        state.commentMutationRequestId = action.meta.requestId; state.commentSubmitting = true; state.commentsError = null;
      }).addCase(thunk.fulfilled, (state, action) => {
        if (state.commentMutationRequestId !== action.meta.requestId) return;
        state.commentMutationRequestId = null; state.commentSubmitting = false;
        const postId = action.meta.arg.postId;
        if (state.commentsPostId === postId) {
          state.commentsRequestId = null; state.commentsStatus = "succeeded";
          if (thunk === addComment) state.comments.push(action.payload);
          else if (thunk === editComment) state.comments = state.comments.map(c => c.id === action.payload.id ? action.payload : c);
          else state.comments = state.comments.filter(c => c.id !== action.payload);
        }
        const delta = thunk === addComment ? 1 : thunk === removeComment ? -1 : 0;
        const updated = post => post?.id === postId ? { ...post, commentCount: Math.max(0, (post.commentCount || 0) + delta) } : post;
        state.selectedPost = updated(state.selectedPost);
        state.posts = state.posts.map(updated);
      }).addCase(thunk.rejected, (state, action) => {
        if (state.commentMutationRequestId !== action.meta.requestId) return;
        state.commentMutationRequestId = null; state.commentSubmitting = false;
        state.commentsError = typeof action.payload === "string" ? action.payload : action.payload?.message;
      });
    }
    builder.addCase(login.fulfilled, () => initialState);
    builder.addCase(logout.fulfilled, () => initialState);
  },
});
export const { clearSelectedPost, clearError } = communitySlice.actions;
export default communitySlice.reducer;
