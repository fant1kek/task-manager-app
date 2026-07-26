export type TaskStatus = "New" | "In Progress" | "Completed" | "Cancelled";
export type SyncStatus = "Synced" | "Pending Sync" | "Sync Failed";

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  location: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  attachments: string[];
  status: TaskStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  isDeleted?: boolean;
}

export interface HistoryLog {
  id: string;
  taskId: string;
  timestamp: string;
  actionType:
    | "Create"
    | "Edit"
    | "Status Change"
    | "Attachment"
    | "Delete"
    | "Sync";
  description: string;
}
