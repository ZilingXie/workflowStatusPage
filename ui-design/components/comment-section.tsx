"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { Comment } from "@/lib/types"
import { useAuth } from "@/hooks/use-mock-auth"
import { Edit2, Trash2, Send, X, Check } from "lucide-react"

interface CommentSectionProps {
  comments: Comment[]
  requestId: string
  onAdd: (requestId: string, comment: Comment) => void
  onUpdate: (requestId: string, commentId: string, content: string) => void
  onDelete: (requestId: string, commentId: string) => void
}

export function CommentSection({
  comments,
  requestId,
  onAdd,
  onUpdate,
  onDelete,
}: CommentSectionProps) {
  const { user, isAdmin } = useAuth()
  const [newComment, setNewComment] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function handleAdd() {
    if (!newComment.trim() || !user) return
    const comment: Comment = {
      id: `${requestId}-c${Date.now()}`,
      author: user.username,
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
    }
    onAdd(requestId, comment)
    setNewComment("")
  }

  function handleUpdate(commentId: string) {
    if (!editContent.trim()) return
    onUpdate(requestId, commentId, editContent.trim())
    setEditingId(null)
    setEditContent("")
  }

  function handleDelete(commentId: string) {
    onDelete(requestId, commentId)
    setDeleteConfirmId(null)
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-foreground">
        Comments ({comments.length})
      </h3>

      {/* Comment List */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-border/50 bg-secondary/20 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-medium text-primary">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium text-foreground">
                    {comment.author}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.createdAt), "yyyy-MM-dd HH:mm")} (UTC)
                  </span>
                  {comment.updatedAt && (
                    <span className="text-xs text-muted-foreground">(edited)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Author can edit */}
                  {user?.username === comment.author && editingId !== comment.id && (
                    <button
                      onClick={() => startEdit(comment)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                  )}
                  {/* Admin can delete */}
                  {isAdmin && (
                    <>
                      {deleteConfirmId === comment.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="rounded bg-destructive/10 p-1 text-destructive transition-colors hover:bg-destructive/20"
                            title="Confirm delete"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary"
                            title="Cancel"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(comment.id)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Comment Content */}
              {editingId === comment.id ? (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="rounded-md border border-input bg-input/50 p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdate(comment.id)}
                      disabled={!editContent.trim()}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditContent("")
                      }}
                      className="rounded-md border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">
                  {comment.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Comment Input */}
      <div className="flex gap-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={2}
          className="flex-1 rounded-md border border-input bg-input/50 p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleAdd()
            }
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newComment.trim()}
          className="flex h-10 w-10 items-center justify-center self-end rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          title="Send comment"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
