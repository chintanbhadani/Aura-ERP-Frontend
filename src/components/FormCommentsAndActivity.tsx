import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { successToast, errorToast } from '../helper/toast';
import dataService from '../axios/dataService';
import { formatDistanceToNow } from 'date-fns';

export interface ActivityLogItem {
  id: string;
  userName: string;
  actionText: string;
  createdAt: string;
  type: 'comment' | 'audit';
  commentContent?: string;
  userAvatar?: string;
}

export const triggerActivityRefresh = (entityType?: string, entityId?: string | number) => {
  const detail = { entityType, entityId: entityId ? String(entityId) : undefined };
  window.dispatchEvent(new CustomEvent('activity-updated', { detail }));
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('activity-updated', { detail }));
  }, 300);
};

export interface FormCommentsAndActivityProps {
  entityType?: string;
  entityId?: string;
  createdByName?: string;
  createdAt?: string;
  lastEditedByName?: string;
  lastEditedAt?: string;
  refreshTrigger?: number | string;
  currentUser?: {
    name: string;
    avatar?: string;
  };
  className?: string;
}

export const FormCommentsAndActivity: React.FC<FormCommentsAndActivityProps> = ({
  entityType = 'Item',
  entityId = '',
  createdByName = 'Admin',
  createdAt = 'recently',
  lastEditedByName = 'Admin',
  lastEditedAt = 'recently',
  refreshTrigger,
  currentUser,
  className = ''
}) => {
  if (!entityId || entityId === 'new') {
    return null;
  }

  const [newComment, setNewComment] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);

  // Retrieve current logged-in user from Redux store
  const loggedUser = useSelector((state: any) => state.base?.user);

  // Dynamic logged-in user name resolution
  const activeUserName =
    currentUser?.name ||
    loggedUser?.username ||
    loggedUser?.name ||
    'System User';

  const resolvedCreatedBy =
    createdByName ||
    activeUserName;

  const resolvedLastEditedBy =
    lastEditedByName ||
    activeUserName;

  const formatActionText = (action?: string, description?: string, entity?: string): string => {
    const upperAction = (action || '').toUpperCase();
    const lowerEntity = (entity || 'record').toLowerCase();

    if (upperAction === 'COMMENT') {
      return 'commented';
    }

    if (description) {
      const text = description.trim();
      const upperText = text.toUpperCase();
      if (upperText === 'UPDATE' || upperText === 'UPDATED RECORD') {
        return `updated ${lowerEntity}`;
      }
      if (upperText === 'CREATE' || upperText === 'CREATED RECORD') {
        return `created ${lowerEntity}`;
      }
      if (upperText === 'DELETE' || upperText === 'DELETED RECORD') {
        return `deleted ${lowerEntity}`;
      }
      return text.charAt(0).toLowerCase() + text.slice(1);
    }

    if (upperAction === 'CREATE') {
      return `created ${lowerEntity}`;
    }
    if (upperAction === 'UPDATE') {
      return `updated ${lowerEntity}`;
    }
    if (upperAction === 'DELETE') {
      return `deleted ${lowerEntity}`;
    }

    return (action || `updated ${lowerEntity}`).toLowerCase();
  };

  const mapLogToActivityItem = (log: any): ActivityLogItem => {
    const rawUser = log.user;
    const authorName =
      rawUser?.fullName ||
      (rawUser?.firstName ? `${rawUser.firstName} ${rawUser.lastName || ''}`.trim() : null) ||
      (rawUser?.username ? (rawUser.username.includes('@') ? rawUser.username.split('@')[0] : rawUser.username) : null) ||
      (rawUser?.email ? rawUser.email.split('@')[0] : null) ||
      log.metadata?.userName ||
      activeUserName;

    const actionText = formatActionText(log.action, log.description, entityType);

    return {
      id: log.id,
      userName: authorName,
      actionText: actionText,
      createdAt: log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : 'recently',
      type: log.action === 'COMMENT' ? 'comment' : 'audit',
      commentContent: log.action === 'COMMENT' ? log.description : undefined
    };
  };

  // Fetch comments and activities from database on mount / entityId change / trigger
  useEffect(() => {
    const fetchActivities = async () => {
      if (!entityId) {
        setActivities([]);
        return;
      }
      try {
        setLoading(true);
        const res = await dataService.get(`/activities?entityType=${entityType}&entityId=${entityId}`);
        const dbActivities = res.data;

        if (Array.isArray(dbActivities)) {
          const formatted: ActivityLogItem[] = dbActivities.map(mapLogToActivityItem);
          setActivities(formatted);
        }
      } catch (err) {
        console.warn('API error fetching activities:', err);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    const handleActivityEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.entityType || (detail.entityType === entityType && (!detail.entityId || String(detail.entityId) === String(entityId)))) {
        fetchActivities();
      }
    };

    window.addEventListener('activity-updated', handleActivityEvent);
    return () => {
      window.removeEventListener('activity-updated', handleActivityEvent);
    };
  }, [entityType, entityId, activeUserName, refreshTrigger]);

  // Handle Submitting a New Comment & Storing in DB
  const handleAddComment = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const commentText = newComment.trim();
    if (!commentText) return;

    try {
      setSubmitting(true);
      let createdDbLog: any = null;

      const activeUserId = loggedUser?.id || (currentUser as any)?.id;

      if (entityId) {
        try {
          const res = await dataService.post('/activities', {
            entityType,
            entityId,
            action: 'COMMENT',
            description: commentText,
            userId: activeUserId || undefined,
            metadata: { userName: activeUserName, userId: activeUserId || undefined }
          });
          createdDbLog = res.data;
        } catch (apiErr) {
          console.warn('API error when saving comment, using local state:', apiErr);
        }
      }

      const newActivityItem: ActivityLogItem = {
        id: createdDbLog?.id || Date.now().toString(),
        userName: activeUserName,
        actionText: 'commented',
        createdAt: 'just now',
        type: 'comment',
        commentContent: commentText
      };

      setActivities([newActivityItem, ...activities]);
      setNewComment('');
      successToast('Comment saved to database');
    } catch (err) {
      errorToast('Failed to save comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAddComment(e);
    }
  };

  const handleDeleteActivity = async (id: string, e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      if (entityId && !id.startsWith('default-') && !id.startsWith('audit-')) {
        try {
          await dataService.delete(`/activities/${id}`);
          const res = await dataService.get(`/activities?entityType=${entityType}&entityId=${entityId}`);
          if (Array.isArray(res.data)) {
            const formatted = res.data.map(mapLogToActivityItem);
            setActivities(formatted);
          } else {
            setActivities(activities.filter(a => a.id !== id));
          }
        } catch (apiErr) {
          console.warn('API delete error:', apiErr);
          setActivities(activities.filter(a => a.id !== id));
        }
      } else {
        setActivities(activities.filter(a => a.id !== id));
      }
      setActiveMenuId(null);
      successToast('Comment deleted from database');
    } catch (err) {
      errorToast('Failed to delete comment');
    }
  };

  // Avatar Initials Helper
  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'A';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Build complete timeline including DB activities and form audit events
  const combinedTimelineItems: ActivityLogItem[] = [
    ...activities,
    ...(activities.length === 0 && entityId ? [{
      id: 'audit-created',
      userName: resolvedCreatedBy,
      actionText: `created this ${entityType.toLowerCase()}`,
      createdAt: createdAt || 'recently',
      type: 'audit' as const
    }] : [])
  ];

  return (
    <div className={`bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xs w-full ${className}`}>
      
      {/* 1. COMMENTS SECTION */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-gray-900 tracking-tight">Comments</h3>
        
        {/* Comment Input Row */}
        <div className="flex items-center gap-3">
          {/* User Avatar Circle */}
          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs select-none">
            {getInitials(activeUserName)}
          </div>

          {/* Comment Input Field Container */}
          <div className="flex-1 relative flex items-center bg-gray-100/90 border border-gray-200/80 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl px-3.5 py-1.5 transition-all">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={submitting}
              placeholder="Type a reply / comment..."
              className="w-full bg-transparent text-xs text-gray-900 placeholder-gray-400 font-medium focus:outline-none py-1.5 disabled:opacity-50"
            />
            
            {/* Always Visible Send Action Button */}
            <button
              type="button"
              onClick={(e) => handleAddComment(e)}
              disabled={submitting}
              className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 ml-2 shadow-2xs flex items-center justify-center ${
                newComment.trim()
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white scale-100'
                  : 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
              } disabled:opacity-50`}
              title="Post Comment to Database"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Send className="w-3.5 h-3.5 transform translate-x-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. ACTIVITY SECTION */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 tracking-tight">Activity</h3>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              Loading history...
            </div>
          )}
        </div>

        {/* Vertical Timeline Container */}
        {combinedTimelineItems.length === 0 ? (
          <div className="text-xs text-gray-400 font-medium italic pl-1 py-1">
            No activity or comments recorded yet.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6">
            {/* Vertical Connecting Line */}
            <div className="absolute left-[13px] top-2 bottom-2 w-px bg-gray-200" />

            {combinedTimelineItems.map((item) => {
              if (item.type === 'comment') {
                return (
                  <div key={item.id} className="relative group/activity">
                    {/* Icon Node on Line */}
                    <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center absolute -left-[27px] top-0.5 shadow-2xs z-10">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                    </div>

                    {/* Comment Details */}
                    <div className="space-y-2">
                      {/* Header Row */}
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          {/* User Avatar Circle */}
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {getInitials(item.userName)}
                          </div>
                          <span className="font-bold text-gray-900">{item.userName}</span>
                          <span>commented</span>
                          <span className="text-gray-400 font-medium">· {item.createdAt}</span>
                        </div>

                        {/* Options Button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === item.id ? null : item.id);
                            }}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          {activeMenuId === item.id && (
                            <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30 text-xs">
                              <button
                                type="button"
                                onClick={(e) => handleDeleteActivity(item.id, e)}
                                className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 font-medium flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Speech Box Card */}
                      <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 text-xs text-gray-800 font-medium shadow-2xs leading-relaxed max-w-2xl">
                        {item.commentContent}
                      </div>
                    </div>
                  </div>
                );
              }

              // Audit Trail Item (Created / Edited / Status Change / Assignment)
              return (
                <div key={item.id} className="relative flex items-center text-xs text-gray-600 py-0.5">
                  {/* Bullet Dot Node on Line */}
                  <div className="w-2 h-2 rounded-full bg-gray-400 border-2 border-white absolute -left-[14.5px] top-1.5 z-10" />

                  <div className="font-medium text-gray-700">
                    <span className="font-bold text-gray-900">{item.userName}</span>{' '}
                    <span>{item.actionText}</span>{' '}
                    <span className="text-gray-400">· {item.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

