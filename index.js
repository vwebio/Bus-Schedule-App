import express from "express"; // Импортируем фреймворк Express для создания веб-приложения
import { readFile } from "node:fs/promises"; // Импортируем метод readFile из модуля fs/promises для чтения файлов с использованием промисов
import { dirname, join } from "node:path"; // Импортируем функции dirname и join для работы с путями файлов
import { fileURLToPath } from "node:url"; // Импортируем fileURLToPath для преобразования URL файла в путь к файлу
import { DateTime } from "luxon"; // Импортируем библиотеку luxon для работы с датами и временем

const port = 3000; // Устанавливаем порт, на котором будет работать сервер
const app = express(); // Создаем экземпляр приложения Express
const __filename = fileURLToPath(import.meta.url); // Получаем полный путь к текущему файлу
const __dirname = dirname(__filename); // Получаем директорию текущего файла
const timeZone = "UTC"; // Устанавливаем часовой пояс для работы с временем

// Асинхронная функция для загрузки данных об автобусах из файла buses.json
const loadBuses = async () => {
  const data = await readFile(join(__dirname, "buses.json"), "utf-8"); // Читаем файл buses.json

  return JSON.parse(data); // Парсим данные из формата JSON и возвращаем их
};

// Функция для расчета времени следующего отправления автобуса
const getNextDeparture = (firstDepartureTime, frequencyMinutes) => {
  const now = DateTime.now().setZone(timeZone); // Получаем текущее время с учетом установленного часового пояса
  const [hours, minutes] = firstDepartureTime.split(":").map(Number); // Разбиваем строку времени на часы и минуты и преобразуем их в числа

  let departure = DateTime.now()
    .set({ hours, minutes }) // Устанавливаем время первого отправления
    .setZone(timeZone); // Применяем часовой пояс

  // Если текущее время больше времени отправления, добавляем интервал частоты отправлений
  if (now > departure) {
    departure = departure.plus({ minutes: frequencyMinutes });
  }

  // Рассчитываем конец дня
  const endOfDay = DateTime.now()
    .set({ hours: 23, minutes: 59, seconds: 59 }) // Устанавливаем конец дня на 23:59:59
    .setZone(timeZone); // Применяем часовой пояс

  // Если время отправления больше конца дня, переносим его на следующий день
  if (departure > endOfDay) {
    departure = departure
      .startOf("day") // Устанавливаем начало следующего дня
      .plus({ days: 1 }) // Переходим на следующий день
      .set({ hours, minutes }); // Устанавливаем время отправления
  }

  // Пока текущее время больше времени отправления, добавляем интервалы частоты отправлений
  while (now > departure) {
    departure = departure.plus({ minutes: frequencyMinutes });

    if (departure > endOfDay) {
      departure = departure
        .startOf("day")
        .plus({ days: 1 })
        .set({ hours, minutes });
    }
  }

  return departure; // Возвращаем рассчитанное время следующего отправления
};

// Асинхронная функция для обновления данных об автобусах и расчета времени следующего отправления
const sendUpdateData = async () => {
  const buses = await loadBuses(); // Загружаем данные об автобусах

  // Обновляем данные для каждого автобуса, рассчитывая время следующего отправления
  const updateBuses = buses.map((bus) => {
    const nextDeparture = getNextDeparture(
      bus.firstDepartureTime,
      bus.frequencyMinutes
    );

    console.log("nextDeparture: ", nextDeparture); // Выводим в консоль время следующего отправления (console.log)

    return {
      ...bus, // Сохраняем все данные об автобусе
      nextDeparture: nextDeparture, // Добавляем объект DateTime для удобства сортировки
      formattedDeparture: {
        data: nextDeparture.toFormat("yyyy-MM-dd"), // Форматируем дату следующего отправления
        time: nextDeparture.toFormat("HH:mm"), // Форматируем время следующего отправления
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

    console.log("updateBuses: ", updateBuses); // Выводим в консоль обновленные данные (console.log)
  } catch (err) {
    res.send(err); // В случае ошибки отправляем сообщение об ошибке клиенту
  }
});

app.listen(port, () => {}); // Запускаем сервер на указанном порту
