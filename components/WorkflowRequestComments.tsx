"use client";

import { UserRole } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CommentItem = {
  id: string;
  authorUsername: string;
  authorRole: UserRole;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  requestId: string;
  comments: CommentItem[];
  sessionUsername: string;
  sessionRole: UserRole;
};

function canEditComment(sessionRole: UserRole, sessionUsername: string, authorUsername: string): boolean {
  if (sessionRole === UserRole.ADMIN) {
    return true;
  }

  return sessionUsername.trim().toLowerCase() === authorUsername.trim().toLowerCase();
}

export function WorkflowRequestComments({
  requestId,
  comments,
  sessionUsername,
  sessionRole
}: Props): JSX.Element {
  const router = useRouter();
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createComment(): Promise<void> {
    if (newComment.trim().length === 0 || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workflow-requests/${requestId}/comments`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ content: newComment })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to create comment");
        setLoading(false);
        return;
      }

      setNewComment("");
      router.refresh();
    } catch {
      setError("Failed to create comment");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(commentId: string): Promise<void> {
    if (editingContent.trim().length === 0 || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workflow-requests/${requestId}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ content: editingContent })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to update comment");
        setLoading(false);
        return;
      }

      setEditingId(null);
      setEditingContent("");
      router.refresh();
    } catch {
      setError("Failed to update comment");
    } finally {
      setLoading(false);
    }
  }

  async function deleteComment(commentId: string): Promise<void> {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workflow-requests/${requestId}/comments/${commentId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Failed to delete comment");
        setLoading(false);
        return;
      }

      if (editingId === commentId) {
        setEditingId(null);
        setEditingContent("");
      }

      router.refresh();
    } catch {
      setError("Failed to delete comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card stack">
      <h2>Comments</h2>

      <div className="stack">
        <label className="stack" style={{ gap: 4 }}>
          <span>Add Comment</span>
          <textarea
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="Share context, implementation notes, or decisions"
            disabled={loading}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            void createComment();
          }}
          disabled={loading || newComment.trim().length === 0}
        >
          {loading ? "Saving..." : "Add Comment"}
        </button>
      </div>

      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

      {comments.length === 0 ? (
        <p className="muted">No comments yet.</p>
      ) : (
        <div className="stack">
          {comments.map((comment) => {
            const editable = canEditComment(sessionRole, sessionUsername, comment.authorUsername);
            const isEditing = editingId === comment.id;

            return (
              <article key={comment.id} className="comment-item stack">
                <div className="comment-item-meta">
                  <strong>{comment.authorUsername}</strong>
                  <span className="muted">{comment.authorRole}</span>
                  <span className="muted">{new Date(comment.createdAt).toISOString()}</span>
                  {comment.updatedAt !== comment.createdAt ? (
                    <span className="muted">(edited {new Date(comment.updatedAt).toISOString()})</span>
                  ) : null}
                </div>

                {isEditing ? (
                  <label className="stack" style={{ gap: 4 }}>
                    <span className="muted">Edit comment</span>
                    <textarea
                      value={editingContent}
                      onChange={(event) => setEditingContent(event.target.value)}
                      disabled={loading}
                    />
                  </label>
                ) : (
                  <p style={{ whiteSpace: "pre-wrap" }}>{comment.content}</p>
                )}

                <div className="actions">
                  {editable && !isEditing ? (
                    <button
                      type="button"
                      className="secondary"
                      disabled={loading}
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditingContent(comment.content);
                      }}
                    >
                      Edit
                    </button>
                  ) : null}

                  {editable && isEditing ? (
                    <button
                      type="button"
                      disabled={loading || editingContent.trim().length === 0}
                      onClick={() => {
                        void saveEdit(comment.id);
                      }}
                    >
                      Save
                    </button>
                  ) : null}

                  {editable && isEditing ? (
                    <button
                      type="button"
                      className="ghost"
                      disabled={loading}
                      onClick={() => {
                        setEditingId(null);
                        setEditingContent("");
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}

                  {sessionRole === UserRole.ADMIN ? (
                    <button
                      type="button"
                      className="ghost"
                      disabled={loading}
                      onClick={() => {
                        void deleteComment(comment.id);
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
