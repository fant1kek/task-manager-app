import { HistoryLog, Task } from "../types";

const API_URL = "http://192.168.100.5:3000";

// Глобальные множества (In-Memory Cache) для предотвращения
// одновременных запросов на один и тот же ID в рамках одной сессии приложения.
const processedTaskIds = new Set<string>();
const processedHistoryIds = new Set<string>();

export const SyncService = {
  syncTaskWithServer: async (task: Task): Promise<boolean> => {
    // Гарантируем, что ID является строкой и убираем лишние пробелы
    const taskId = String(task.id).trim();

    // Защита «на лету»: если этот ID уже обрабатывается или был отправлен, блокируем
    if (processedTaskIds.has(taskId)) {
      return true;
    }

    try {
      processedTaskIds.add(taskId); // Блокируем ID перед запросом

      // Проверяем наличие точечным запросом
      const responseCheck = await fetch(`${API_URL}/tasks/${taskId}`);
      const isTaskExist = responseCheck.status === 200; // 200 - есть, 404 - нет

      const bodyData = { ...task, id: taskId, syncStatus: "Synced" as const };

      const response = await fetch(
        isTaskExist ? `${API_URL}/tasks/${taskId}` : `${API_URL}/tasks`,
        {
          method: isTaskExist ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData),
        },
      );

      if (!response.ok) {
        processedTaskIds.delete(taskId); // Разблокируем при ошибке сети
        return false;
      }

      return true;
    } catch (error) {
      console.log("Критическая ошибка отправки таски:", error);
      processedTaskIds.delete(taskId); // Разблокируем при краше сети
      return false;
    }
  },

  syncHistoryWithServer: async (log: HistoryLog): Promise<boolean> => {
    const logId = String(log.id).trim();

    // Защита «на лету» от параллельных вызовов одного и того же лога
    if (processedHistoryIds.has(logId)) {
      return true;
    }

    try {
      processedHistoryIds.add(logId); // Блокируем лог от повторной отправки

      // Проверяем, существует ли уже этот лог на сервере
      const responseCheck = await fetch(`${API_URL}/history/${logId}`);

      // Если сервер вернул 200 OK, значит, запись железно существует
      if (responseCheck.status === 200) {
        return true;
      }

      // Если 404 или любой другой статус — делаем POST
      const response = await fetch(`${API_URL}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...log, id: logId }),
      });

      if (!response.ok) {
        processedHistoryIds.delete(logId); // В случае ошибки сети разрешим повторить позже
        return false;
      }

      return true;
    } catch (error) {
      console.log("Ошибка отправки истории:", error);
      processedHistoryIds.delete(logId); // Разблокируем при сбое сети
      return false;
    }
  },

  // Функция удаления задачи с сервера
  deleteTaskFromServer: async (taskId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "DELETE",
      });
      return response.ok;
    } catch (error) {
      console.log("Ошибка удаления таски с сервера:", error);
      return false;
    }
  },
};
