import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
vi.mock('../api/community', () => ({ fetchPosts:vi.fn(),fetchPost:vi.fn(),createPost:vi.fn(),updatePost:vi.fn(),deletePost:vi.fn(),fetchComments:vi.fn(),createComment:vi.fn(),updateComment:vi.fn(),deleteComment:vi.fn() }));
import * as api from '../api/community';
import reducer, { loadPosts, loadPost, loadComments, addPost, addComment, removeComment, clearSelectedPost } from '../store/communitySlice';
import { logout } from '../store/authSlice';
import store from '../store/index.jsx';
const makeStore = () => configureStore({reducer:{community:reducer}});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve=r; }); return {resolve,promise}; };
beforeEach(() => vi.clearAllMocks());

describe('Community real store and request lifecycle', () => {
  it('uses one store for both entry points and registers Community', async () => {
    expect((await import('../store/index.js')).default).toBe(store);
    expect(store.getState().community.posts).toEqual([]);
  });
  it('does not let old comments replace the newly selected post', async () => {
    const a=deferred(),b=deferred();api.fetchComments.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    const s=makeStore();const first=s.dispatch(loadComments(1)),second=s.dispatch(loadComments(2));
    b.resolve([{id:2,postId:2}]);await second;a.resolve([{id:1,postId:1}]);await first;
    expect(s.getState().community.comments).toEqual([{id:2,postId:2}]);
  });
  it('closing details discards pending detail and comment responses', async () => {
    const a=deferred(),b=deferred();api.fetchPost.mockReturnValue(a.promise);api.fetchComments.mockReturnValue(b.promise);
    const s=makeStore();const requests=[s.dispatch(loadPost(1)),s.dispatch(loadComments(1))];s.dispatch(clearSelectedPost());
    a.resolve({id:1});b.resolve([{id:1}]);await Promise.all(requests);
    expect(s.getState().community.selectedPost).toBeNull();expect(s.getState().community.comments).toEqual([]);
  });
  it('logout discards an in-flight post mutation', async () => {
    const a=deferred();api.createPost.mockReturnValue(a.promise);const s=makeStore();const req=s.dispatch(addPost({title:'Private'}));
    s.dispatch(logout.fulfilled(null,'logout'));a.resolve({id:1});await req;
    expect(s.getState().community.posts).toEqual([]);expect(s.getState().community.submitting).toBe(false);
  });
  it('an old list cannot erase a newly created post', async () => {
    const a=deferred();api.fetchPosts.mockReturnValue(a.promise);api.createPost.mockResolvedValue({id:2});
    const s=makeStore();const req=s.dispatch(loadPosts());await s.dispatch(addPost({}));
    a.resolve({content:[],number:0,totalPages:0,totalElements:0});await req;
    expect(s.getState().community.posts).toEqual([{id:2}]);
  });
  it('comment errors preserve existing comments and clear submitting state', async () => {
    api.fetchComments.mockResolvedValue([{id:1,postId:2}]);api.createComment.mockRejectedValue(new Error('Mất mạng'));
    const s=makeStore();await s.dispatch(loadComments(2));await s.dispatch(addComment({postId:2,content:'Keep text'}));
    expect(s.getState().community.comments).toHaveLength(1);expect(s.getState().community.commentsError).toBe('Mất mạng');
    expect(s.getState().community.commentSubmitting).toBe(false);
  });
});
