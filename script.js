// ===============================
// Simple Food Tracker - script.js
// Powered by USDA FoodData Central
// Features:
// - USDA search + nutrients
// - Autocomplete dropdown
// - Add / Edit / Delete entries
// - LocalStorage persistence
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
// USDA API helpers
// ===============================

async function fetchUSDA(foodName) {
    const apiKey = "DEMO_KEY"; // USDA demo key
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("USDA API error");
    }

    const data = await response.json();
    if (!data.foods || data.foods.length === 0) {
        throw new Error("Food not found");
    }

    const food = data.foods[0];

    let cal = 0, protein = 0, carbs = 0, fat = 0;

    if (Array.isArray(food.foodNutrients)) {
        for (const nutrient of food.foodNutrients) {
            switch (nutrient.nutrientName) {
                case "Energy":
                    cal = nutrient.value;
                    break;
                case "Protein":
                    protein = nutrient.value;
                    break;
                case "Carbohydrate, by difference":
                    carbs = nutrient.value;
                    break;
                case "Total lipid (fat)":
                    fat = nutrient.value;
                    break;
            }
        }
    }

    return {
        name: food.description,
        calPer100: cal,
        proteinPer100: protein,
        carbsPer100: carbs,
        fatPer100: fat
    };
}

// Autocomplete search (USDA)
async function searchUSDA(query) {
    const apiKey = "DEMO_KEY";
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.foods) return [];

    return data.foods.map(f => f.description);
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

    try {
        const suggestions = await searchUSDA(query);
        showSuggestions(suggestions);
    } catch {
        hideSuggestions();
    }
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
        div.textContent = item;
        div.onclick = () => {
            foodInput.value = item;
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

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== foodInput) {
        hideSuggestions();
    }
});

// ===============================
// Add food
// ===============================

async function addFood() {
    const name = foodInput.value.trim();
    const qty = parseFloat(document.getElementById("qtyInput").value);

    if (!name || !qty || qty <= 0) {
        alert("Please enter a valid food name and quantity (grams).");
        return;
    }

    try {
        // Optional: show loading state
        setLoading(true);

        const nutrition = await fetchUSDA(name);

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
        document.getElementById("qtyInput").value = "";

    } catch (err) {
        alert("Food not found in USDA database or API error.");
    } finally {
        setLoading(false);
    }
}

// Simple loading indicator (optional)
function setLoading(isLoading) {
    const btn = document.getElementById("addButton");
    if (!btn) return;
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
    if (!totalsEl) return;

    totalsEl.innerHTML = `
        <strong>Daily Total:</strong><br>
        ${totalCal.toFixed(1)} kcal<br>
        Protein: ${totalProtein.toFixed(1)} g<br>
        Carbs: ${totalCarbs.toFixed(1)} g<br>
        Fat: ${totalFat.toFixed(1)} g
    `;
}
