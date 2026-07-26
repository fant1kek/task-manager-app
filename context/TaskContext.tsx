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
const API_URL = "http://192.168.100.5:3000";

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
  let isSyncing = false;

  const triggerSync = async (
    currentTasks: Task[],
    currentHistory: HistoryLog[],
  ) => {
    // Если синхронизация уже идет — игнорируем новый вызов
    if (isSyncing) return;

    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    isSyncing = true; // Выставляем блокировку

    try {
      let activeHistory = [...currentHistory];
      let tasksChanged = false;
      const newSystemLogs: HistoryLog[] = [];

      // === 1. СИНХРОНИЗАЦИЯ ИСТОРИИ ДЕЙСТВИЙ ===
      try {
        const responseHistory = await fetch(`${API_URL}/history`);
        if (responseHistory.ok) {
          const serverHistory: HistoryLog[] = await responseHistory.json();
          const serverLogIds = new Set(serverHistory.map((h) => h.id));

          // Оставляем только те логи, которых ТОЧНО нет на сервере
          const unsyncedLogs = activeHistory.filter(
            (log) => !serverLogIds.has(log.id),
          );

          // Отправляем строго по очереди
          for (const log of unsyncedLogs) {
            try {
              await SyncService.syncHistoryWithServer(log);
            } catch (singleLogErr) {
              console.log("Ошибка отправки отдельного лога", singleLogErr);
            }
          }
        }
      } catch (e) {
        console.log("Сервер занят, история синхронизируется позже");
      }

      // === 2. ПОСЛЕДОВАТЕЛЬНАЯ СИНХРОНИЗАЦИЯ ЗАДАЧ (С поддержкой DELETE) ===
      let updatedTasks: Task[] = [];

      for (const task of currentTasks) {
        if (
          task.syncStatus === "Pending Sync" ||
          task.syncStatus === "Sync Failed"
        ) {
          tasksChanged = true;

          // Проверяем, была ли задача удалена пользователем
          if (task.isDeleted) {
            const success = await SyncService.deleteTaskFromServer(task.id);
            if (success) {
              // Если сервер успешно удалил задачу, мы НЕ пушим её в updatedTasks.
              // Она полностью исчезает из локальной памяти устройства.
              continue;
            } else {
              // Если сервер недоступен, сохраняем её локально со статусом ошибки отправки
              updatedTasks.push({
                ...task,
                syncStatus: "Sync Failed" as const,
              });
            }
            continue;
          }

          // Обычное создание или обновление статуса задачи
          const success = await SyncService.syncTaskWithServer(task);

          if (success) {
            const syncLog: HistoryLog = {
              id: generateUniqueId(),
              taskId: task.id,
              actionType: "Sync",
              description: `Синхронизировано с сервером: "${task.title}"`,
              timestamp: new Date().toISOString(),
            };

            newSystemLogs.push(syncLog);
            updatedTasks.push({ ...task, syncStatus: "Synced" as const });
          } else {
            updatedTasks.push({ ...task, syncStatus: "Sync Failed" as const });
          }
        } else {
          // Если синхронизация не нужна и задача не удалена, сохраняем её
          updatedTasks.push(task);
        }
      }

      // === 3. СОХРАНЕНИЕ И СИНХРОНИЗАЦИЯ НОВЫХ СИСТЕМНЫХ ЛОГОВ ===
      if (tasksChanged) {
        const finalHistory = [...newSystemLogs, ...activeHistory];

        for (const log of newSystemLogs) {
          try {
            await SyncService.syncHistoryWithServer(log);
          } catch (e) {
            console.log("Не удалось сразу отправить системный лог", e);
          }
        }

        // Обновляем локальное состояние ОДИН раз в самом конце
        setTasks(updatedTasks);
        setHistory(finalHistory);

        await AsyncStorage.setItem("tasks", JSON.stringify(updatedTasks));
        await AsyncStorage.setItem("history", JSON.stringify(finalHistory));
      }
    } catch (globalError) {
      console.error("Критическая ошибка при синхронизации", globalError);
    } finally {
      isSyncing = false; // Обязательно снимаем блокировку в любом случае
    }
  };

  const generateUniqueId = () => {
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  };

  // Функция для одновременного сохранения изменений и логов в AsyncStorage
  const saveAndLog = async (newTasks: Task[], newLogItem: HistoryLog) => {
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
    const generatedTaskId = Math.random().toString(36).substring(7); // Генерируем ОДИН ID для связи

    const newTask: Task = {
      ...taskData,
      id: generatedTaskId, // Присваиваем задаче
      createdAt: new Date().toISOString(),
      syncStatus: "Pending Sync",
    };

    const logItem: HistoryLog = {
      id: Math.random().toString(36).substring(7), // Уникальный ID самого лога
      taskId: generatedTaskId, // Передаем тот же самый ID задачи для связки!
      actionType: "Create",
      description: `Создана задача: "${newTask.title}"`,
      timestamp: new Date().toISOString(),
    };

    await saveAndLog([...tasks, newTask], logItem);
  };

  // 2. Изменение статуса
  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    const updatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, status, syncStatus: "Pending Sync" as const } : t,
    );
    const targetTask = tasks.find((t) => t.id === id);

    const logItem: HistoryLog = {
      id: Math.random().toString(36).substring(7),
      taskId: id, // Передаем ID изменяемой задачи
      actionType: "Status Change",
      description: `Статус задачи "${targetTask?.title}" изменен на "${status}"`,
      timestamp: new Date().toISOString(),
    };

    await saveAndLog(updatedTasks, logItem);
  };

  // 3. Удаление задачи
  const deleteTask = async (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);

    // Помечаем задачу флагом удаления и ставим в очередь синхронизации
    const updatedTasks = tasks.map((t) =>
      t.id === id
        ? { ...t, isDeleted: true, syncStatus: "Pending Sync" as const }
        : t,
    );

    const logItem: HistoryLog = {
      id: Math.random().toString(36).substring(7),
      taskId: id,
      actionType: "Delete",
      description: `Удалена задача "${targetTask?.title}"`,
      timestamp: new Date().toISOString(),
    };

    // Сохраняем стейт (в UI задача отфильтруется на следующем шаге)
    await saveAndLog(updatedTasks, logItem);
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
