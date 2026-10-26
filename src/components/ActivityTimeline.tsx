import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Paperclip, User, Edit3, Trash2, Plus, RefreshCw } from 'lucide-react';
import dataService from '../axios/dataService';

export interface Activity {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ATTACHMENT' | 'OTHER';
  description: string;
  metadata: any;
  createdAt: string;
  user?: {
    id: string;
    username: string;
  };
}

interface ActivityTimelineProps {
  entityType: string;
  entityId: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'CREATE': return <Plus className="w-4 h-4 text-green-500" />;
    case 'UPDATE': return <Edit3 className="w-4 h-4 text-blue-500" />;
    case 'DELETE': return <Trash2 className="w-4 h-4 text-red-500" />;
    case 'STATUS_CHANGE': return <RefreshCw className="w-4 h-4 text-orange-500" />;
    case 'ATTACHMENT': return <Paperclip className="w-4 h-4 text-gray-500" />;
    default: return <User className="w-4 h-4 text-gray-400" />;
  }
};

export function ActivityTimeline({ entityType, entityId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await dataService.get(`/activities?entityType=${entityType}&entityId=${entityId}`);
        setActivities(response.data);
      } catch (error) {
        console.error('Failed to load activities', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (entityId) {
      fetchActivities();
    }
  }, [entityType, entityId]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500 animate-pulse">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No activity recorded yet.</div>;
  }

  return (
    <div className="mt-8 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Activity</h3>
      <div className="relative border-l border-gray-200 ml-3 space-y-6 pb-4">
        {activities.map((activity, index) => (
          <div key={activity.id} className="relative pl-6">
            <span className="absolute -left-2.5 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-4 ring-white border border-gray-200">
              {getActionIcon(activity.action)}
            </span>
            <div className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">
                {
                 (activity.user?.username ? (activity.user.username.includes('@') ? activity.user.username.split('@')[0] : activity.user.username) : 'System')}
              </span>{' '}
              {activity.description}
              <span className="text-gray-400 ml-2 whitespace-nowrap">
                · {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </span>
            </div>
            {activity.metadata && (
              <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 font-mono">
                {JSON.stringify(activity.metadata, null, 2)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
