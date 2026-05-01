// ===============================
// Simple Food Tracker - script.js
// Powered by USDA FoodData Central
// ===============================

// -------- Global state --------
let foodLog = [];

// Restore from localStorage on load
window.addEventListener("load", () => {
    const saved = localStorage.getItem("foodLog");
    if (saved) {
        foodLog = JSON.parse(saved);
    }
    renderList();
    updateTotals();
});

// ===============================
// USDA API — FINAL FIXED VERSION
// ===============================

// Step 1: Search foods
async function searchUSDA(query) {
    const apiKey = "PTROzXyympDbLSI2EYhgYb9m7dLexPk9YbgDNdor";
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.foods) return [];

    return data.foods.map(f => ({
        name: f.description,
        fdcId: f.fdcId
    }));
}

// Step 2: Fetch nutrients using nutrient IDs
async function fetchUSDAFood(fdcId) {
    const apiKey = "PTROzXyympDbLSI2EYhgYb9m7dLexPk9YbgDNdor";

    // Request only the nutrients we need
    const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?nutrients=203,204,205,208&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("USDA nutrient fetch error");

    const data = await response.json();

    let cal = 0, protein = 0, carbs = 0, fat = 0;

    for (const nutrient of data.foodNutrients) {
        switch (nutrient.nutrientId) {
            case 208: // Energy (kcal)
                cal = nutrient.value;
                break;
            case 203: // Protein
                protein = nutrient.value;
                break;
            case 205: // Carbs
                carbs = nutrient.value;
                break;
            case 204: // Fat
                fat = nutrient.value;
                break;
        }
    }

    return {
        name: data.description,
        calPer100: cal,
        proteinPer100: protein,
        carbsPer100: carbs,
        fatPer100: fat
    };
}



// ===============================
// Autocomplete UI
// ===============================

const foodInput = document.getElementById("foodInput");
const suggestionsBox = document.getElementById("suggestions");

foodInput.addEventListener("input", async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) {
        hideSuggestions();
        return;
    }

    const results = await searchUSDA(query);
    showSuggestions(results);
});

function showSuggestions(list) {
    suggestionsBox.innerHTML = "";
    if (!list.length) {
        hideSuggestions();
        return;
    }

    list.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = item.name;
        div.onclick = () => {
            foodInput.value = item.name;
            foodInput.dataset.fdcId = item.fdcId;
            hideSuggestions();
        };
        suggestionsBox.appendChild(div);
    });

    suggestionsBox.style.display = "block";
}

function hideSuggestions() {
    suggestionsBox.style.display = "none";
    suggestionsBox.innerHTML = "";
}

// ===============================
// Add food
// ===============================

async function addFood() {
    const name = foodInput.value.trim();
    const qty = parseFloat(document.getElementById("qtyInput").value);
    const fdcId = foodInput.dataset.fdcId;

    if (!name || !qty || qty <= 0) {
        alert("Please enter a valid food name and quantity.");
        return;
    }

    if (!fdcId) {
        alert("Please select a food from the dropdown.");
        return;
    }

    setLoading(true);

    try {
        const nutrition = await fetchUSDAFood(fdcId);

        const factor = qty / 100;

        const entry = {
            name: nutrition.name,
            qty,
            calPer100: nutrition.calPer100,
            proteinPer100: nutrition.proteinPer100,
            carbsPer100: nutrition.carbsPer100,
            fatPer100: nutrition.fatPer100,
            cal: nutrition.calPer100 * factor,
            protein: nutrition.proteinPer100 * factor,
            carbs: nutrition.carbsPer100 * factor,
            fat: nutrition.fatPer100 * factor
        };

        foodLog.push(entry);
        localStorage.setItem("foodLog", JSON.stringify(foodLog));

        renderList();
        updateTotals();

        foodInput.value = "";
        foodInput.dataset.fdcId = "";
        document.getElementById("qtyInput").value = "";

    } catch (err) {
        alert("Error fetching nutrition.");
    }

    setLoading(false);
}

function setLoading(isLoading) {
    const btn = document.getElementById("addButton");
    btn.disabled = isLoading;
    btn.textContent = isLoading ? "Adding..." : "Add Food";
}

// ===============================
// Render list + edit/delete
// ===============================

function renderList() {
    const list = document.getElementById("foodList");
    list.innerHTML = "";

    foodLog.forEach((item, index) => {
        const li = document.createElement("li");

        li.innerHTML = `
            <div>
                <strong>${item.name}</strong> (${item.qty} g)<br>
                ${item.cal.toFixed(1)} kcal — 
                P: ${item.protein.toFixed(1)} g, 
                C: ${item.carbs.toFixed(1)} g, 
                F: ${item.fat.toFixed(1)} g
            </div>
            <div class="entry-actions">
                <button onclick="editEntry(${index})">Edit</button>
                <button onclick="deleteEntry(${index})">Delete</button>
            </div>
        `;

        list.appendChild(li);
    });
}

function deleteEntry(index) {
    foodLog.splice(index, 1);
    localStorage.setItem("foodLog", JSON.stringify(foodLog));
    renderList();
    updateTotals();
}

function editEntry(index) {
    const current = foodLog[index];
    const newQtyStr = prompt("Enter new quantity in grams:", current.qty);
    if (!newQtyStr) return;

    const newQty = parseFloat(newQtyStr);
    if (!newQty || newQty <= 0) {
        alert("Invalid quantity.");
        return;
    }

    const factor = newQty / 100;

    current.qty = newQty;
    current.cal = current.calPer100 * factor;
    current.protein = current.proteinPer100 * factor;
    current.carbs = current.carbsPer100 * factor;
    current.fat = current.fatPer100 * factor;

    localStorage.setItem("foodLog", JSON.stringify(foodLog));
    renderList();
    updateTotals();
}

// ===============================
// Totals
// ===============================

function updateTotals() {
    let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

    for (const item of foodLog) {
        totalCal += item.cal;
        totalProtein += item.protein;
        totalCarbs += item.carbs;
        totalFat += item.fat;
    }

    const totalsEl = document.getElementById("totals");

    totalsEl.innerHTML = `
        <strong>Daily Total:</strong><br>
        ${totalCal.toFixed(1)} kcal<br>
        Protein: ${totalProtein.toFixed(1)} g<br>
        Carbs: ${totalCarbs.toFixed(1)} g<br>
        Fat: ${totalFat.toFixed(1)} g
    `;
}
