'use client';

import type { CommentNode } from '@forestwatch/types';
import Link from 'next/link';
import { Field, buttonClassName, inputClassName } from '@/components/auth-form';
import { isAuthError, useAuth } from '@/lib/auth-context';
import { useState } from 'react';

export function CommentForm({
  plantationId,
  parentId,
  onSubmitted,
  submitLabel = 'Post comment',
}: {
  plantationId: string;
  parentId?: string;
  onSubmitted: () => void;
  submitLabel?: string;
}) {
  const { client, user, ready } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) {
    return null;
  }

  if (!user) {
    return (
      <p className="mt-4 text-sm text-ink/70">
        <Link href="/login" className="text-forest-800 underline">
          Sign in
        </Link>{' '}
        to comment. Guests can read public comments but cannot post.
      </p>
    );
  }

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const body = String(new FormData(form).get('body') ?? '').trim();
        if (!body) {
          setError('A comment body is required');
          return;
        }
        setPending(true);
        setError(null);
        void client
          .createComment(plantationId, { body, parentId })
          .then(() => {
            form.reset();
            onSubmitted();
          })
          .catch((caught: unknown) => {
            setError(isAuthError(caught) ? caught.message : caught instanceof Error ? caught.message : 'Could not post comment');
          })
          .finally(() => setPending(false));
      }}
    >
      <Field label={parentId ? 'Reply' : 'Comment'}>
        <textarea className={inputClassName} name="body" rows={parentId ? 2 : 3} minLength={1} required />
      </Field>
      {error ? <p className="text-sm text-red-800">{error}</p> : null}
      <button className={`${buttonClassName} sm:w-auto`} type="submit" disabled={pending}>
        {pending ? 'Posting…' : submitLabel}
      </button>
    </form>
  );
}

export function CommentCard({
  plantationId,
  comment,
  onChanged,
}: {
  plantationId: string;
  comment: CommentNode;
  onChanged: () => void;
}) {
  const { client, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reported, setReported] = useState(false);

  return (
    <li className="rounded-2xl border border-forest-900/10 bg-white/70 p-5">
      <p className="text-sm text-ink/60">
        {comment.author.displayName}
        {comment.author.officer ? <span className="ml-2 uppercase tracking-[0.2em] text-forest-700">Forest Officer</span> : null}
        <span>
          {' '}
          · {new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(comment.createdAt))}
        </span>
      </p>
      <p className="mt-2 text-ink/90">{comment.body}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        {user ? (
          <button
            type="button"
            className="text-forest-800 underline"
            onClick={() => {
              setError(null);
              void client
                .toggleCommentReaction(plantationId, comment.id)
                .then(() => onChanged())
                .catch((caught: unknown) => {
                  setError(isAuthError(caught) ? caught.message : 'Could not update reaction');
                });
            }}
          >
            {comment.reacted ? 'Remove helpful' : 'Helpful'} ({comment.helpfulCount})
          </button>
        ) : (
          <span className="text-ink/60">Helpful ({comment.helpfulCount})</span>
        )}
        {user && !comment.parentId ? (
          <button type="button" className="text-forest-800 underline" onClick={() => setReplyOpen((open) => !open)}>
            {replyOpen ? 'Cancel reply' : 'Reply'}
          </button>
        ) : null}
        {user && user.id !== comment.author.id ? (
          <button
            type="button"
            className="text-forest-800 underline"
            onClick={() => {
              setError(null);
              void client
                .reportComment(plantationId, comment.id)
                .then(() => setReported(true))
                .catch((caught: unknown) => {
                  setError(isAuthError(caught) ? caught.message : 'Could not record report');
                });
            }}
          >
            Report
          </button>
        ) : null}
        {reported ? <span className="text-ink/60">Report recorded for officers.</span> : null}
        {comment.editable ? (
          <button
            type="button"
            className="text-forest-800 underline"
            onClick={() => {
              setError(null);
              void client
                .deleteComment(plantationId, comment.id)
                .then(() => onChanged())
                .catch((caught: unknown) => {
                  setError(isAuthError(caught) ? caught.message : 'Could not delete comment');
                });
            }}
          >
            Delete
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-800">{error}</p> : null}
      {replyOpen ? (
        <CommentForm plantationId={plantationId} parentId={comment.id} onSubmitted={onChanged} submitLabel="Post reply" />
      ) : null}
      {comment.replies.length > 0 ? (
        <ul className="mt-4 space-y-3 border-l border-forest-900/10 pl-4">
          {comment.replies.map((reply) => (
            <CommentCard key={reply.id} plantationId={plantationId} comment={reply} onChanged={onChanged} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function CommentsThread({
  plantationId,
  items,
  onChanged,
}: {
  plantationId: string;
  items: CommentNode[];
  onChanged: () => void;
}) {
  return (
    <div className="mt-4">
      {items.length === 0 ? (
        <p className="text-sm text-ink/70">No comments yet. This page does not invent community discussion.</p>
      ) : (
        <ul className="space-y-4">
          {items.map((comment) => (
            <CommentCard key={comment.id} plantationId={plantationId} comment={comment} onChanged={onChanged} />
          ))}
        </ul>
      )}
      <h3 className="mt-8 font-display text-xl text-forest-900">Add a comment</h3>
      <CommentForm plantationId={plantationId} onSubmitted={onChanged} />
    </div>
  );
}
