// Mini nutrition database (per 100g)
const nutritionDB = {
    "chicken breast": { cal: 165, protein: 31, carbs: 0, fat: 3.6 },
    "rice": { cal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    "egg": { cal: 155, protein: 13, carbs: 1.1, fat: 11 },
    "milk": { cal: 42, protein: 3.4, carbs: 5, fat: 1 },
    "beef": { cal: 250, protein: 26, carbs: 0, fat: 15 },
    "broccoli": { cal: 55, protein: 3.7, carbs: 11, fat: 0.6 }
};

let foodLog = JSON.parse(localStorage.getItem("foodLog")) || [];
let currentLang = "en";

// UI text translations
const text = {
    en: {
        title: "Daily Food Tracker",
        foodLabel: "Food Name",
        qtyLabel: "Quantity (grams)",
        addBtn: "Add",
        logTitle: "Today's Food Log",
        summaryTitle: "Daily Summary",
        calories: "Calories",
        protein: "Protein",
        carbs: "Carbs",
        fat: "Fat"
    },
    zh: {
        title: "每日饮食记录",
        foodLabel: "食物名称",
        qtyLabel: "数量（克）",
        addBtn: "添加",
        logTitle: "今日食物记录",
        summaryTitle: "每日总结",
        calories: "卡路里",
        protein: "蛋白质",
        carbs: "碳水",
        fat: "脂肪"
    }
};

function updateLanguage() {
    const t = text[currentLang];

    document.getElementById("title").textContent = t.title;
    document.getElementById("foodLabel").textContent = t.foodLabel;
    document.getElementById("qtyLabel").textContent = t.qtyLabel;
    document.getElementById("addBtn").textContent = t.addBtn;
    document.getElementById("logTitle").textContent = t.logTitle;
    document.getElementById("summaryTitle").textContent = t.summaryTitle;

    updateTotals();
}

document.getElementById("langToggle").addEventListener("click", () => {
    currentLang = currentLang === "en" ? "zh" : "en";
    document.getElementById("langToggle").textContent = currentLang === "en" ? "中文" : "EN";
    updateLanguage();
});

function addFood() {
    const name = document.getElementById("foodInput").value.toLowerCase();
    const qty = parseFloat(document.getElementById("qtyInput").value);

    if (!nutritionDB[name]) {
        alert("Food not found in database.");
        return;
    }

    const factor = qty / 100;
    const data = nutritionDB[name];

    const entry = {
        name,
        cal: data.cal * factor,
        protein: data.protein * factor,
        carbs: data.carbs * factor,
        fat: data.fat * factor
    };

    foodLog.push(entry);
    localStorage.setItem("foodLog", JSON.stringify(foodLog));

    renderList();
    updateTotals();
}

document.getElementById("addBtn").addEventListener("click", addFood);

function renderList() {
    const list = document.getElementById("foodList");
    list.innerHTML = "";

    foodLog.forEach(item => {
        const div = document.createElement("div");
        div.className = "food-item";
        div.textContent = `${item.name} — ${item.cal.toFixed(1)} cal`;
        list.appendChild(div);
    });
}

function updateTotals() {
    const t = text[currentLang];

    let cal = 0, protein = 0, carbs = 0, fat = 0;

    foodLog.forEach(item => {
        cal += item.cal;
        protein += item.protein;
        carbs += item.carbs;
        fat += item.fat;
    });

    document.getElementById("caloriesTotal").textContent = `${t.calories}: ${cal.toFixed(1)}`;
    document.getElementById("proteinTotal").textContent = `${t.protein}: ${protein.toFixed(1)}g`;
    document.getElementById("carbTotal").textContent = `${t.carbs}: ${carbs.toFixed(1)}g`;
    document.getElementById("fatTotal").textContent = `${t.fat}: ${fat.toFixed(1)}g`;
}

renderList();
updateTotals();
