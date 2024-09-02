// Функция для установки темы
const setTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
};

// Функция для переключения темы
const toggleTheme = () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  setTheme(newTheme);
};

// Добавляем обработчик события для кнопки переключения темы
document.getElementById("theme-toggle").addEventListener("click", toggleTheme);

// Восстанавливаем тему при загрузке страницы
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  setTheme(savedTheme);
} else {
  setTheme("light");
}

//---------Таблица расписания автобусов---------

// Функция для получения данных об автобусах с сервера
const fetchBusData = async () => {
  try {
    const response = await fetch(`/next-departure`);

    if (!response.ok) {
      throw new Error(`HTTP error status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.log(`Fetching bus data ${error}`);
  }
};

// Вывод текущей даты
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

// Вывод текущего времени
function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// Обновление даты и времени каждую секунду
function updateDateTime() {
  const currentDate = getCurrentDate();
  const currentTime = getCurrentTime();
  document.querySelector(".current-data").innerHTML = `
  Сегодня: 
  <i class="fas fa-calendar-alt"></i> ${currentDate} 
  <i class="fas fa-clock"></i> ${currentTime}`;
}

// Обновляем дату и время при загрузке страницы и каждую секунду
updateDateTime();
setInterval(updateDateTime, 1000);


// Функция для отображения данных об автобусах в таблице
const renderBusData = (buses) => {
  const tableBody = document.querySelector("#bus tbody");
  tableBody.textContent = "";

  buses.forEach((bus) => {

    const row = document.createElement("tr");
    row.innerHTML = `
    <td>${bus.busNumber}</td>
    <td><div class="text-start">${bus.startPoint} - ${bus.endPoint}</div></td>
    <td>${bus.nextDeparture.data}</td>
    <td>${bus.nextDeparture.time}</td>
    <td>${bus.nextDeparture.remaining}</td>
    `;

    tableBody.append(row);
  });
};


// Функция для инициализации WebSocket соединения
const initWebsocket = () => {
  // Создаем новое WebSocket соединение с текущим хостом
  const ws = new WebSocket(`ws://${location.host}`);

  // Событие при открытии соединения
  ws.addEventListener("open", () => {
    console.log("WebSocket подключен!");
  });

  // Событие при получении сообщения от сервера
  ws.addEventListener("message", (event) => {
    // Парсим данные автобусов из JSON
    const buses = JSON.parse(event.data);

    // Отображаем данные автобусов на странице
    renderBusData(buses);
  });

  // Событие при ошибке в WebSocket соединении
  ws.addEventListener("error", (error) => {
    console.log("Ошибка WebSocket!", error);
  });

  // Событие при закрытии WebSocket соединения
  ws.addEventListener("close", () => {
    console.log("WebSocket соединение закрыто!");
  });
};

// Основная функция инициализации приложения
const init = async () => {
  // Получаем начальные данные автобусов с сервера
  const buses = await fetchBusData();

  // Отображаем начальные данные автобусов на странице
  renderBusData(buses);

  // Инициализируем WebSocket для получения обновлений в реальном времени
  initWebsocket();
};

init();
