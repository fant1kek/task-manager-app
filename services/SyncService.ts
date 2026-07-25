import { HistoryLog, Task } from "../types";

const API_URL = "http://192.168.100.5:3000";

export const SyncService = {
  syncTaskWithServer: async (task: Task): Promise<boolean> => {
    try {
      const responseCheck = await fetch(`${API_URL}/tasks`);
      if (!responseCheck.ok) return false;

      const serverTasks: Task[] = await responseCheck.json();
      const isTaskExist = serverTasks.some((t) => t.id === task.id);

      let response;
      if (isTaskExist) {
        // Если задача найдена — обновляем её (PUT)
        response = await fetch(`${API_URL}/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...task, syncStatus: "Synced" }),
        });
      } else {
        // Если задачи нет — создаем новую (POST)
        response = await fetch(`${API_URL}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...task, syncStatus: "Synced" }),
        });
      }

      return response.ok;
    } catch (error) {
      console.log("Критическая ошибка отправки таски:", error);
      return false;
    }
  },

  // Функция отправки логов истории на сервер
  syncHistoryWithServer: async (log: HistoryLog): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });
      return response.ok;
    } catch (error) {
      console.log("Ошибка отправки истории:", error);
      return false;
    }
  },
};
