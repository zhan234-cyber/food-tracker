// ===============================
// Local USDA Food Tracker - script.js
// Uses local Foundation_Foods.json
// ===============================

// -------- Global state --------
let foodLog = [];
let foodDB = [];          // full database
let searchIndex = [];     // for autocomplete

// Restore saved log
window.addEventListener("load", async () => {
    await loadLocalDatabase();

    const saved = localStorage.getItem("foodLog");
    if (saved) {
        foodLog = JSON.parse(saved);
    }

    renderList();
    updateTotals();
});

// ===============================
// Load local USDA Foundation Foods
// ===============================

async function loadLocalDatabase() {
    try {
        const response = await fetch("Foundation_Foods.json");
        const data = await response.json();

        // Your file structure:
        // { "FoundationFoods": [ ... ] }
        foodDB = data.FoundationFoods;

        // Build search index (description + fdcId)
        searchIndex = foodDB.map(food => ({
            name: food.description,
            fdcId: food.fdcId
        }));

        console.log("Local USDA database loaded:", foodDB.length, "foods");

    } catch (err) {
        console.error("Failed to load local USDA database:", err);
        alert("Error loading Foundation_Foods.json. Make sure it is in the same folder as index.html");
    }
}

// ===============================
// Autocomplete search (local)
// ===============================

const foodInput = document.getElementById("foodInput");
const suggestionsBox = document.getElementById("suggestions");

foodInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();

    if (query.length < 2) {
        hideSuggestions();
        return;
    }

    // Fast local search
    const matches = searchIndex
        .filter(item => item.name.toLowerCase().includes(query))
        .slice(0, 12); // limit results

    showSuggestions(matches);
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

document.addEventListener("click", (e) => {
    if (!suggestionsBox.contains(e.target) && e.target !== foodInput) {
        hideSuggestions();
    }
});

// ===============================
// Extract nutrients from local DB
// ===============================

function getNutrientsFromLocalDB(fdcId) {
    const food = foodDB.find(f => f.fdcId == fdcId);
    if (!food) return null;

    let cal = 0, protein = 0, carbs = 0, fat = 0;

    for (const nutrient of food.foodNutrients) {
        const id = nutrient.nutrient.id;
        const amount = nutrient.amount ?? 0;

        switch (id) {
            case 1008: // Energy (kcal)
                cal = amount;
                break;
            case 1003: // Protein
                protein = amount;
                break;
            case 1005: // Carbs
                carbs = amount;
                break;
            case 1004: // Fat
                fat = amount;
                break;
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

    const nutrition = getNutrientsFromLocalDB(fdcId);
    if (!nutrition) {
        alert("Food not found in local database.");
        return;
    }

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
