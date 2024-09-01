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
    `;

    tableBody.append(row);
  });
};

const init = async () => {
  const buses = await fetchBusData();

  renderBusData(buses);
};

init();
