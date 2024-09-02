import express from "express"; // Импортируем фреймворк Express
import { readFile } from "node:fs/promises"; // Импортируем метод readFile из модуля fs/promises для чтения файлов с использованием промисов
import { dirname, join } from "node:path"; // Импортируем функции dirname и join для работы с путями файлов
import { fileURLToPath } from "node:url"; // Импортируем fileURLToPath для преобразования URL файла в путь к файлу
import { DateTime, Duration } from "luxon"; // Импортируем библиотеку luxon для работы с датами и временем
import { WebSocketServer } from "ws"; // WebSockets

// Устанавливаем порт, на котором будет работать сервер
const port = 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url); // Получаем полный путь к текущему файлу
const __dirname = dirname(__filename); // Получаем директорию текущего файла
const timeZone = "UTC"; // Устанавливаем часовой пояс для работы с временем

// Настройка статических файлов
app.use(express.static(join(__dirname, 'public')));

// Асинхронная функция для загрузки данных об автобусах из файла buses.json
const loadBuses = async () => {
  const data = await readFile(join(__dirname, "buses.json"), "utf-8"); // Читаем файл buses.json

  return JSON.parse(data); // Парсим данные из формата JSON и возвращаем их
};

// Функция для расчета времени следующего отправления автобуса
const getNextDeparture = (firstDepartureTime, frequencyMinutes) => {
  const now = DateTime.now(); // Получаем текущее время с учетом установленного часового пояса
  const [hour, minute] = firstDepartureTime.split(":").map(Number); // Разбиваем строку времени на часы и минуты и преобразуем их в числа

  let departure = DateTime.now()
    .set({ hour, minute, second: 0, millisecond: 0 }); // Устанавливаем время первого отправления

  // Если текущее время больше времени отправления, добавляем интервал частоты отправлений
  if (now > departure) {
    departure = departure.plus({ minutes: frequencyMinutes });
  }

  // Рассчитываем конец дня
  const endOfDay = DateTime.now()
    .set({ hour: 23, minute: 59, second: 59 }); 

  // Если время отправления больше конца дня, переносим его на следующий день
  if (departure > endOfDay) {
    departure = departure
      .startOf("day") // Устанавливаем начало следующего дня
      .plus({ days: 1 }) // Переходим на следующий день
      .set({ hour, minute }); // Устанавливаем время отправления
  }

  // Пока текущее время больше времени отправления, добавляем интервалы частоты отправлений
  while (now > departure) {
    departure = departure.plus({ minutes: frequencyMinutes });

    if (departure > endOfDay) {
      departure = departure
        .startOf("day")
        .plus({ days: 1 })
        .set({ hour, minute });
    }
  }

  return departure; // Возвращаем рассчитанное время следующего отправления
};

// Асинхронная функция для обновления данных об автобусах и расчета времени следующего отправления
const sendUpdateData = async () => {
  const buses = await loadBuses(); // Загружаем данные об автобусах

  // Получение тtкущего времени
  const now = DateTime.now().setZone(timeZone);

  // Обновляем данные для каждого автобуса, рассчитывая время следующего отправления
  const updateBuses = buses.map((bus) => {
    const nextDeparture = getNextDeparture(
      bus.firstDepartureTime,
      bus.frequencyMinutes
    );

    // 
    const timeRemaining = Duration.fromMillis(nextDeparture.diff(now));

    return {
      ...bus, // Сохраняем все данные об автобусе
      nextDeparture: nextDeparture, // Добавляем объект DateTime для удобства сортировки
      formattedDeparture: {
        data: nextDeparture.toFormat("yyyy-MM-dd"), // Форматируем дату следующего отправления
        time: nextDeparture.toFormat("HH:mm"), // Форматируем время следующего отправления
        remaining: timeRemaining.toFormat("hh:mm:ss"), // Форматируем оставшееся время
      },
    };
  });

  // Сортируем автобусы по времени следующего отправления (самое ближайшее отправление - сверху)
  updateBuses.sort((a, b) => a.nextDeparture - b.nextDeparture);

  // Убираем поле nextDeparture, чтобы вернуть только форматированное расписание
  return updateBuses.map((bus) => ({
    ...bus,
    nextDeparture: bus.formattedDeparture, // Заменяем временное поле formattedDeparture
  }));
};

// Обработчик GET-запроса по маршруту /next-departure
app.get("/next-departure", async (req, res) => {
  try {
    const updateBuses = await sendUpdateData(); // Обновляем данные об автобусах

    res.json(updateBuses); // Отправляем обновленные данные клиенту в формате JSON

  } catch (err) {
    res.send(err); // В случае ошибки отправляем сообщение об ошибке клиенту
  }
});


// Создаем WebSocket сервер без привязки к конкретному серверу
const wss = new WebSocketServer({ noServer: true });
// Множество для хранения активных подключений WebSocket
const clients = new Set();

wss.on("connection", (ws) => {
  console.log("WebSocket соединение установлено");
  // Добавляем новое соединение в множество клиентов
  clients.add(ws);

  // Функция для отправки обновленных данных клиентам
  const sendUpdates = async () => {
    try {
      // Получаем обновленные данные автобусов
      const updatedBuses = await sendUpdateData();
      // Отправляем данные клиенту в формате JSON
      ws.send(JSON.stringify(updatedBuses));
    } catch (error) {
      // Логируем ошибку, если не удалось отправить данные
      console.log("Ошибка WebSocket соединения: ", error);
    }
  };

  // Запускаем интервал для отправки обновлений каждую секунду
  const intervalId = setInterval(sendUpdates, 1000);

  // Обработка закрытия соединения WebSocket
  ws.on("close", () => {
    // Останавливаем отправку обновлений
    clearInterval(intervalId);
    // Удаляем соединение из множества клиентов
    clients.delete(ws);
    console.log("WebSocket соединение закрыто");
  });
});

// Запускаем HTTP сервер на указанном порту
const server = app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});

server.on("upgrade", (req, socket, head) => {
  // Обработка обновления протокола до WebSocket
  wss.handleUpgrade(req, socket, head, (ws) => {
    // Эмитируем событие подключения WebSocket
    wss.emit("connection", ws, req);
  });
});
