import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
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
