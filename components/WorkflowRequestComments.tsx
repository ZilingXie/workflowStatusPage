"use client";

import { UserRole } from "@prisma/client";
import { Check, Edit2, Send, Trash2, X } from "lucide-react";
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
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

      setDeleteConfirmId(null);
      router.refresh();
    } catch {
      setError("Failed to delete comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Comments ({comments.length})</h3>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet</p>
        ) : (
          <div className="flex flex-col gap-3">
            {comments.map((comment) => {
              const editable = canEditComment(sessionRole, sessionUsername, comment.authorUsername);
              const isEditing = editingId === comment.id;

              return (
                <div key={comment.id} className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
                        {comment.authorUsername.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-medium text-foreground">{comment.authorUsername}</span>
                      <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toISOString()}</span>
                      {comment.updatedAt !== comment.createdAt ? (
                        <span className="text-xs text-muted-foreground">(edited)</span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      {editable && !isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditingContent(comment.content);
                          }}
                          className="h-auto min-h-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          title="Edit"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      ) : null}

                      {sessionRole === UserRole.ADMIN ? (
                        deleteConfirmId === comment.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                void deleteComment(comment.id);
                              }}
                              className="h-auto min-h-0 rounded bg-destructive/10 p-1 text-destructive transition-colors hover:bg-destructive/20"
                              title="Confirm delete"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="h-auto min-h-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary"
                              title="Cancel"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(comment.id)}
                            className="h-auto min-h-0 rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )
                      ) : null}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <textarea
                        value={editingContent}
                        onChange={(event) => setEditingContent(event.target.value)}
                        className="rounded-md border border-input bg-input/50 p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            void saveEdit(comment.id);
                          }}
                          disabled={!editingContent.trim()}
                          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingContent("");
                          }}
                          className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{comment.content}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            placeholder="Add a comment..."
            rows={2}
            className="flex-1 rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                void createComment();
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              void createComment();
            }}
            disabled={!newComment.trim()}
            className="flex h-10 w-10 items-center justify-center self-end rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            title="Send comment"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
