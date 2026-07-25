import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import React, { createContext, useContext, useEffect, useState } from "react";
import { SyncService } from "../services/SyncService";
import { HistoryLog, Task, TaskStatus } from "../types";

interface TaskContextType {
  tasks: Task[];
  history: HistoryLog[];
  addTask: (
    task: Omit<Task, "id" | "createdAt" | "syncStatus">,
  ) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);

  // Загружаем данные из памяти устройства при старте приложения
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem("tasks");
        const storedHistory = await AsyncStorage.getItem("history");
        if (storedTasks) setTasks(JSON.parse(storedTasks));
        if (storedHistory) setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Ошибка загрузки локальных данных", e);
      }
    };
    loadData();
  }, []);

  // Слушатель изменения статуса сети интернет
  useEffect(() => {
    let isFirstRender = true;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!isFirstRender && state.isConnected && tasks.length > 0) {
        triggerSync(tasks, history);
      }
      isFirstRender = false;
    });
    return () => unsubscribe();
  }, []);

  // Функция фонового прохода и синхронизации
  const triggerSync = async (
    currentTasks: Task[],
    currentHistory: HistoryLog[],
  ) => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return; // Если интернета вообще нет — оффлайн-режим, не красим в ошибку

    let tasksChanged = false;
    const updatedTasks = await Promise.all(
      currentTasks.map(async (task) => {
        // Синхронизируем задачи, которые либо еще не отправлялись, либо прошлый раз завершился ошибкой
        if (
          task.syncStatus === "Pending Sync" ||
          task.syncStatus === "Sync Failed"
        ) {
          const success = await SyncService.syncTaskWithServer(task);

          if (success) {
            tasksChanged = true;

            const syncLog: HistoryLog = {
              id: Math.random().toString(36).substring(7),
              taskId: task.id,
              actionType: "Sync",
              description: `Синхронизировано с сервером: "${task.title}"`,
              timestamp: new Date().toISOString(),
            };
            currentHistory.unshift(syncLog);
            await SyncService.syncHistoryWithServer(syncLog);

            return { ...task, syncStatus: "Synced" as const };
          } else {
            // ЕСЛИ СЕРВЕР ДОСТУПЕН, НО ВЕРНУЛ ОШИБКУ (или выключен json-server)
            tasksChanged = true;
            return { ...task, syncStatus: "Sync Failed" as const };
          }
        }
        return task;
      }),
    );

    if (tasksChanged) {
      setTasks(updatedTasks);
      setHistory([...currentHistory]);
      await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));
      await AsyncStorage.setItem("history", JSON.stringify(currentHistory));
    }
  };

  // Функция для одновременного сохранения изменений и логов в AsyncStorage
  const saveAndLog = async (
    newTasks: Task[],
    log: Omit<HistoryLog, "id" | "timestamp">,
  ) => {
    const newLogItem: HistoryLog = {
      ...log,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
    };
    const updatedHistory = [newLogItem, ...history];

    setTasks(newTasks);
    setHistory(updatedHistory);

    try {
      await AsyncStorage.setItem("tasks", JSON.stringify(newTasks));
      await AsyncStorage.setItem("history", JSON.stringify(updatedHistory));

      setTimeout(() => {
        triggerSync(newTasks, updatedHistory);
      }, 300);
    } catch (e) {
      console.error("Ошибка сохранения данных", e);
    }
  };

  // 1. Добавление новой задачи
  const addTask = async (
    taskData: Omit<Task, "id" | "createdAt" | "syncStatus">,
  ) => {
    const newTask: Task = {
      ...taskData,
      id: Math.random().toString(36).substring(7),
      createdAt: new Date().toISOString(),
      syncStatus: "Pending Sync", // Помечаем, что таска ждет отправки на json-server
    };

    await saveAndLog([...tasks, newTask], {
      taskId: newTask.id,
      actionType: "Create",
      description: `Создана задача: "${newTask.title}"`,
    });
  };

  // 2. Изменение статуса (New -> In Progress -> Completed -> Cancelled)
  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    const updatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, status, syncStatus: "Pending Sync" as const } : t,
    );
    const targetTask = tasks.find((t) => t.id === id);

    await saveAndLog(updatedTasks, {
      taskId: id,
      actionType: "Status Change",
      description: `Статус задачи "${targetTask?.title}" изменен на "${status}"`,
    });
  };

  // 3. Удаление задачи
  const deleteTask = async (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    const filteredTasks = tasks.filter((t) => t.id !== id);

    await saveAndLog(filteredTasks, {
      taskId: id,
      actionType: "Delete",
      description: `Удалена задача "${targetTask?.title}"`,
    });
  };

  return (
    <TaskContext.Provider
      value={{ tasks, history, addTask, updateTaskStatus, deleteTask }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context)
    throw new Error("useTasks должен использоваться внутри TaskProvider");
  return context;
};
